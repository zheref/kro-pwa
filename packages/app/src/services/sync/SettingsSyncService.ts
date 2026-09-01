/**
 * `SettingsSyncService` — canon `Kro/Dependencies/SettingsSyncClient.swift`.
 *
 * Two operations, upsert and fetch, over the `user_settings` table this repo is
 * a **client** of. The interesting decisions are all *outside* this file:
 * *when* to pull and push, and *what* is allowed to travel, are pure rules in
 * `features/auth/CloudSettings.ts` so they are testable with no transport. What
 * is left here is the transport itself, plus the wire encoding.
 *
 * ## The port speaks domain entries, not rows
 *
 * `RC-30` would normally have the Producer call the Mapper. It cannot here:
 * `check-uzf-boundaries.mjs` refuses any `services/**` import from a feature
 * (`RC-6`/`RC-21`), so a wire type named in a Producer signature would fail
 * lint. The Mapper therefore sits at the Service edge and the port is stated in
 * `CloudSettingEntry`s — the same shape `@kro/core`'s `LocalStore` ports
 * already take (#10 returns records, not raw IndexedDB rows). One boundary, one
 * translation, and the feature tier never learns a column name.
 *
 * ## Not signed in is a typed failure, not an empty pull
 *
 * Canon guards both operations on `auth.currentUser` and throws `.notSignedIn`.
 * Returning `[]` instead would be indistinguishable from "this account has no
 * settings yet" — and the difference matters, because the Settings footer says
 * *"Sign in to sync"* for one and *"Synced"* for the other.
 */
import type { SettingOption } from '@kro/core'
import { AuthExceptions } from '../../features/auth/AuthException'
import {
  type CloudSettingEntry,
  cloudSyncOptionForKey,
} from '../../features/auth/CloudSettings'
import type { SupabaseClientProvider } from '../supabase/SupabaseClientProvider'
import { type UserSettingRow, UserSettingRowMapper } from './UserSettingRow'

export const USER_SETTINGS_TABLE = 'user_settings'

export interface SettingsSyncService {
  /** Every cloud setting stored for the signed-in user. RLS scopes it. */
  pullAll(): Promise<readonly CloudSettingEntry[]>
  /**
   * Upsert the given entries for the signed-in user. A no-op on an empty list,
   * exactly as canon short-circuits.
   */
  push(entries: readonly CloudSettingEntry[]): Promise<void>
}

// ---------------------------------------------------------------------------
// Live
// ---------------------------------------------------------------------------

export interface LiveSettingsSyncServiceOptions {
  readonly clientProvider: SupabaseClientProvider
  /**
   * How an entry's key resolves to its option (for the wire `value_type`).
   * Defaults to the cloud-scoped set, which is the only set that may travel.
   */
  readonly optionForKey?: (key: string) => SettingOption | null
}

export const makeLiveSettingsSyncService = (
  options: LiveSettingsSyncServiceOptions,
): SettingsSyncService => {
  const { clientProvider } = options
  const optionForKey = options.optionForKey ?? cloudSyncOptionForKey

  const requireSignedInClient = async () => {
    const client = clientProvider.client()
    if (client === null) {
      const availability = clientProvider.availability()
      throw AuthExceptions.unavailable(
        availability.kind === 'unconfigured' ? availability.missing : [],
      )
    }
    const { data, error } = await client.auth.getUser()
    if (error !== null || data.user === null) throw AuthExceptions.notSignedIn()
    return { client, userId: data.user.id }
  }

  return {
    async pullAll() {
      const { client } = await requireSignedInClient()
      const { data, error } = await client.from(USER_SETTINGS_TABLE).select()
      if (error !== null) throw error
      const rows = (data as readonly UserSettingRow[] | null) ?? []
      return rows.flatMap((row) => {
        const entry = UserSettingRowMapper.toDomain(row)
        return entry === null ? [] : [entry]
      })
    },

    async push(entries) {
      if (entries.length === 0) return
      const { client, userId } = await requireSignedInClient()
      const rows = entries.flatMap((entry) => {
        const option = optionForKey(entry.key)
        if (option === null) return []
        const row = UserSettingRowMapper.fromDomain(entry, option, userId)
        return row === null ? [] : [row]
      })
      if (rows.length === 0) return
      const { error } = await client
        .from(USER_SETTINGS_TABLE)
        .upsert(rows, { onConflict: 'user_id,key' })
      if (error !== null) throw error
    },
  }
}

// ---------------------------------------------------------------------------
// Stub
// ---------------------------------------------------------------------------

export interface StubbedSettingsSyncServiceOptions {
  /** What a pull returns. */
  readonly stored?: readonly CloudSettingEntry[]
  /** Thrown by `pullAll`. */
  readonly pullFailure?: unknown
  /** Thrown by `push`. */
  readonly pushFailure?: unknown
}

export interface StubbedSettingsSyncService extends SettingsSyncService {
  /** Every push payload, in order — the spy half of the double. */
  pushes(): readonly (readonly CloudSettingEntry[])[]
  /** How many pulls were performed. */
  pullCount(): number
}

/**
 * The test/preview binding (`RC-33`).
 *
 * It counts pulls and records push payloads because the acceptance criteria are
 * *about* those counts: "pulls only at launch/sign-in" is provable only by a
 * double that can say it was not called, and "local-scoped keys never leave the
 * device" is provable only by inspecting what a push actually carried.
 */
export const makeStubbedSettingsSyncService = (
  options: StubbedSettingsSyncServiceOptions = {},
): StubbedSettingsSyncService => {
  let stored: readonly CloudSettingEntry[] = options.stored ?? []
  const pushed: (readonly CloudSettingEntry[])[] = []
  let pulls = 0

  return {
    pushes: () => pushed.map((payload) => [...payload]),
    pullCount: () => pulls,

    async pullAll() {
      pulls += 1
      if (options.pullFailure !== undefined) throw options.pullFailure
      return stored
    },

    async push(entries) {
      pushed.push([...entries])
      if (options.pushFailure !== undefined) throw options.pushFailure
      // Mirror the server's upsert so a push-then-pull round-trip in a test
      // behaves the way the real table would.
      const byKey = new Map(stored.map((entry) => [entry.key, entry]))
      for (const entry of entries) byKey.set(entry.key, entry)
      stored = [...byKey.values()]
    },
  }
}

/** The default stub — an empty account. */
export const stubbedSettingsSyncService: SettingsSyncService =
  makeStubbedSettingsSyncService()
