/**
 * The single wire↔domain↔exception translation site for auth (`RC-30`,
 * `UZF-17`) — canon's `mapAuthError` plus the `UserRow.toUser()` half, which
 * lives here rather than in the Service for the boundary reason
 * `AuthException.ts` explains.
 *
 * ## `toException` matches on message text, and that is canon's choice
 *
 * GoTrue does not return a stable machine-readable code for "wrong password"
 * versus "already registered" through the JS client's `AuthError` in the shape
 * this app can rely on across versions, so canon matches lowercased substrings
 * of the message. Ported verbatim — including the exact phrase list — because a
 * *different* matcher would classify the same server response differently on
 * iOS and on the web, and the user-visible copy is derived from `kind`.
 *
 * The web adds one arm canon has no equivalent for: supabase-js reports a
 * transport failure as a `TypeError: Failed to fetch` (the browser's opaque
 * network error). That maps to `networkUnavailable`, matching what canon gets
 * from a `URLError`.
 *
 * ## `toUser` is `UserRow.toUser()`
 *
 * Two canon behaviours are preserved exactly because a mismatch would make the
 * same account render differently on two platforms:
 *
 * - `login_kind` falls back to `email_password` **twice over** — a `null`
 *   column and an unrecognised value both land on `emailPassword`
 *   (`authProviderFromLoginKind` in `@kro/core` is the same rule, reused rather
 *   than re-spelled).
 * - `connected_services` entries that are not recognised providers are
 *   dropped (`compactMap`), not defaulted.
 *
 * Unlike `UserProfileRecord.toUser()` — which drops `avatar_url` because canon
 * does — this mapper **keeps** it: the row from `public.users` is the account's
 * own record, `avatar_url` is the column the OAuth providers fill, and the
 * signed-in surface (#32) needs it. The local-cache mapper's opt-in flag exists
 * precisely so the two can differ knowingly; see `UserProfileRecord.ts`.
 */
import {
  type AuthProvider,
  type User,
  authProviderFromLoginKind,
  authProviders,
  toUnknownException,
} from '@kro/core'
import { type AuthException, AuthExceptions, isAuthException } from './AuthException'

/**
 * The `public.users` row, column for column — canon's `UserRow`. Field names
 * mirror the wire format exactly (`RC-29`): no renaming here, the mapper
 * bridges.
 */
export interface UserRow {
  readonly id: string
  readonly username: string | null
  readonly emails: readonly string[] | null
  readonly name: string | null
  readonly avatar_url: string | null
  readonly birth_date: string | null
  readonly nationality: string | null
  readonly login_kind: string | null
  readonly connected_services: readonly string[] | null
  readonly created_at: string
}

/** The columns a profile UPDATE may set — canon's `UserUpdatePayload`. */
export interface UserUpdatePayload {
  readonly name?: string
  readonly username?: string
  readonly avatar_url?: string
  readonly nationality?: string
  readonly birth_date?: string
}

/**
 * A timestamptz column to a `Date`, or `null` when it is absent or unparseable.
 *
 * Unparseable degrades to `null` rather than to an `Invalid Date`: an
 * `Invalid Date` in `State` compares unequal to itself and silently poisons
 * every downstream comparison, which is far worse than a missing birthday.
 */
const dateFromColumn = (value: string | null): Date | null => {
  if (value === null) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const providerFromRawValue = (raw: string): AuthProvider | null =>
  authProviders.find((provider) => provider === raw) ?? null

export const AuthMapper = {
  /**
   * `UserRow.toUser()`. Returns `null` only when the row cannot identify a
   * user — a missing `id` or an uncreatable `created_at` — so the Producer
   * surfaces `userCreationFailed` rather than storing a partial `User`.
   */
  toDomain(row: UserRow): User | null {
    if (row.id.length === 0) return null
    const createdAt = dateFromColumn(row.created_at)
    if (createdAt === null) return null

    return {
      id: row.id,
      name: row.name,
      emails: row.emails ?? [],
      username: row.username,
      avatarUrl: row.avatar_url,
      birthDate: dateFromColumn(row.birth_date),
      nationality: row.nationality,
      createdAt,
      authProvider: authProviderFromLoginKind(row.login_kind),
      connectedProviders: (row.connected_services ?? []).flatMap((raw) => {
        const provider = providerFromRawValue(raw)
        return provider === null ? [] : [provider]
      }),
    }
  },

  /**
   * `UserUpdatePayload` — **only non-null fields**, so an UPDATE never clobbers
   * an existing column with `NULL`. Canon's custom `encode(to:)` does exactly
   * this and says why; the shape is preserved because the two platforms write
   * to the same row.
   */
  fromDomain(user: User): UserUpdatePayload {
    const payload: {
      name?: string
      username?: string
      avatar_url?: string
      nationality?: string
      birth_date?: string
    } = {}
    if (user.name !== null) payload.name = user.name
    if (user.username !== null) payload.username = user.username
    if (user.avatarUrl !== null) payload.avatar_url = user.avatarUrl
    if (user.nationality !== null) payload.nationality = user.nationality
    if (user.birthDate !== null) payload.birth_date = user.birthDate.toISOString()
    return payload
  },

  /** `mapAuthError`, plus the browser's transport failure. */
  toException(error: unknown): AuthException {
    // The Service already knew the answer for the cases only it can see
    // (unconfigured project, cancelled sheet) — canon's
    // `catch let error as KroAuthError { throw error }`.
    if (isAuthException(error)) return error

    // The browser reports a failed request as an opaque `TypeError`; canon's
    // equivalent arm is its `URLError` check.
    if (error instanceof TypeError) return AuthExceptions.networkUnavailable()

    const message = error instanceof Error ? error.message : String(error)
    const lowered = message.toLowerCase()

    if (
      lowered.includes('invalid login') ||
      lowered.includes('invalid credentials') ||
      lowered.includes('wrong password')
    ) {
      return AuthExceptions.invalidCredentials()
    }
    if (
      lowered.includes('already registered') ||
      lowered.includes('already exists') ||
      lowered.includes('email already')
    ) {
      return AuthExceptions.emailAlreadyInUse()
    }
    if (
      lowered.includes('password should be') ||
      lowered.includes('weak password') ||
      lowered.includes('password is too')
    ) {
      return AuthExceptions.weakPassword(message)
    }
    if (
      lowered.includes('network') ||
      lowered.includes('offline') ||
      lowered.includes('timed out') ||
      lowered.includes('connection')
    ) {
      return AuthExceptions.networkUnavailable()
    }
    return AuthExceptions.unknown(toUnknownException(error).message)
  },
} as const
