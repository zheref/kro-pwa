/**
 * The raw Kro Cloud operations the endeavor sync engine sits on — canon's
 * `ObjectsClient` narrowed to the four calls this issue needs.
 *
 * It is a separate port from `EndeavorSyncService` on purpose: the engine is
 * where the *policy* lives (which rows are pushed, how a conflict resolves,
 * whether the flag lets anything happen at all) and this is where the *wire*
 * lives. Splitting them is what makes "with the flag off, zero network calls"
 * a proposition a test can check — the stub below counts every call, so the
 * assertion is `transport.calls()` being empty rather than a promise that no
 * request was made.
 *
 * ## `resolveOwnerId` exists because RLS requires it
 *
 * `endeavors.owner_id` is a `bigint` FK into `public.owners`, and every
 * `endeavors_*_self` policy resolves it through
 * `kro_endeavor_owner_user_id(owner_id) = auth.uid()::text`. A row with a null
 * `owner_id` is invisible on SELECT and rejected on INSERT, so a push has to
 * carry one. Canon never resolves it (`ObjectsClient.insertEndeavor` has the
 * owner assignment commented out), which is recorded as an upstream finding in
 * this PR rather than reproduced.
 *
 * The resolution is *read, then create*: a `select id from owners where
 * "userId" = <uid>`, falling back to an insert. Note that `public.owners` has
 * RLS **enabled with no policies** in the schema as it stands, so both halves
 * are expected to be denied against the live project today — which is exactly
 * why the engine treats an unresolvable owner as a typed, non-fatal
 * `ownerUnresolved` and reports the push as deferred instead of pretending it
 * landed. With `supabaseHosting` OFF at `statusQuo` nothing reaches this code
 * in a shipping build; the honest failure is what a future flag flip needs.
 */
import { EndeavorSyncExceptions } from '../../features/auth/EndeavorSyncException'
import type { SupabaseClientProvider } from '../supabase/SupabaseClientProvider'
import {
  ENDEAVOR_SELECT_COLUMNS,
  type EndeavorRow,
  type EndeavorWriteRow,
} from './EndeavorRow'

export const ENDEAVORS_TABLE = 'endeavors'
export const OWNERS_TABLE = 'owners'

export interface EndeavorCloudTransport {
  /** Every endeavor the signed-in caller can see. RLS does the scoping. */
  fetchEndeavors(): Promise<readonly EndeavorRow[]>
  /** Insert-or-update one endeavor. */
  upsertEndeavor(row: EndeavorWriteRow): Promise<void>
  /**
   * Remove one endeavor. This is how a **tombstone** is pushed: the schema has
   * no `deleted_at` column, so the row itself is what goes away.
   */
  deleteEndeavor(id: string): Promise<void>
  /** The `owners.id` for an account, creating the row if it does not exist. */
  resolveOwnerId(userId: string): Promise<number>
}

// ---------------------------------------------------------------------------
// Live
// ---------------------------------------------------------------------------

export const makeLiveEndeavorCloudTransport = (
  clientProvider: SupabaseClientProvider,
): EndeavorCloudTransport => {
  const requireClient = () => {
    const client = clientProvider.client()
    if (client === null) {
      const availability = clientProvider.availability()
      throw EndeavorSyncExceptions.unavailable(
        availability.kind === 'unconfigured' ? availability.missing : [],
      )
    }
    return client
  }

  return {
    async fetchEndeavors() {
      const client = requireClient()
      const { data, error } = await client
        .from(ENDEAVORS_TABLE)
        .select(ENDEAVOR_SELECT_COLUMNS)
      if (error !== null) throw error
      return (data as unknown as readonly EndeavorRow[] | null) ?? []
    },

    async upsertEndeavor(row) {
      const client = requireClient()
      const { error } = await client
        .from(ENDEAVORS_TABLE)
        .upsert(row, { onConflict: 'id' })
      if (error !== null) throw error
    },

    async deleteEndeavor(id) {
      const client = requireClient()
      const { error } = await client.from(ENDEAVORS_TABLE).delete().eq('id', id)
      if (error !== null) throw error
    },

    async resolveOwnerId(userId) {
      const client = requireClient()
      const existing = await client
        .from(OWNERS_TABLE)
        .select('id')
        .eq('userId', userId)
        .limit(1)
      if (existing.error !== null) throw existing.error
      const found = (existing.data as readonly { id: number }[] | null)?.[0]
      if (found !== undefined) return found.id

      const created = await client
        .from(OWNERS_TABLE)
        .insert({ type: 'userId', userId })
        .select('id')
      if (created.error !== null) throw created.error
      const row = (created.data as readonly { id: number }[] | null)?.[0]
      if (row === undefined)
        throw EndeavorSyncExceptions.ownerUnresolved(userId)
      return row.id
    },
  }
}

// ---------------------------------------------------------------------------
// Stub
// ---------------------------------------------------------------------------

/** One recorded call — the spy that makes "zero network" provable. */
export type EndeavorTransportCall =
  | { readonly kind: 'fetchEndeavors' }
  | { readonly kind: 'upsertEndeavor'; readonly id: string }
  | { readonly kind: 'deleteEndeavor'; readonly id: string }
  | { readonly kind: 'resolveOwnerId'; readonly userId: string }

export interface StubbedEndeavorCloudTransportOptions {
  /** The cloud's contents at the start of the test. */
  readonly rows?: readonly EndeavorRow[]
  /** What `resolveOwnerId` answers. Defaults to `1`. */
  readonly ownerId?: number
  /** Thrown by every operation named here. */
  readonly failures?: Partial<Record<EndeavorTransportCall['kind'], unknown>>
}

export interface StubbedEndeavorCloudTransport extends EndeavorCloudTransport {
  /** Every call, in order. Empty is the "zero network" assertion. */
  calls(): readonly EndeavorTransportCall[]
  /** The cloud's contents now — an upsert and a delete both land here. */
  rows(): readonly EndeavorRow[]
}

/**
 * The test/preview binding (`RC-33`) — a tiny in-memory Kro Cloud.
 *
 * It applies upserts and deletes to its own table so a push-then-pull sequence
 * behaves the way the real one would, which is what lets the tombstone ruling
 * be tested end to end: delete, then pull, and assert the row does **not** come
 * back.
 */
export const makeStubbedEndeavorCloudTransport = (
  options: StubbedEndeavorCloudTransportOptions = {},
): StubbedEndeavorCloudTransport => {
  const table = new Map<string, EndeavorRow>(
    (options.rows ?? []).map((row) => [row.id, row]),
  )
  const recorded: EndeavorTransportCall[] = []

  const record = (call: EndeavorTransportCall): void => {
    recorded.push(call)
    const failure = options.failures?.[call.kind]
    if (failure !== undefined) throw failure
  }

  return {
    calls: () => [...recorded],
    rows: () => [...table.values()],

    async fetchEndeavors() {
      record({ kind: 'fetchEndeavors' })
      return [...table.values()]
    },

    async upsertEndeavor(row) {
      record({ kind: 'upsertEndeavor', id: row.id })
      // Keep only the readable columns, the way a round-trip through PostgREST
      // would: `owner_id` is written but is not part of the pull's select list.
      const { owner_id: _ownerId, ...readable } = row
      table.set(row.id, readable)
    },

    async deleteEndeavor(id) {
      record({ kind: 'deleteEndeavor', id })
      table.delete(id)
    },

    async resolveOwnerId(userId) {
      record({ kind: 'resolveOwnerId', userId })
      return options.ownerId ?? 1
    },
  }
}

/** The default stub — an empty cloud that has never been called. */
export const stubbedEndeavorCloudTransport: EndeavorCloudTransport =
  makeStubbedEndeavorCloudTransport()
