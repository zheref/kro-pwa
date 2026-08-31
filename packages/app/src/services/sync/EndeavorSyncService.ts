/**
 * The endeavor sync engine — canon `KroEndeavorRepository`'s
 * `pushPendingToCloud` / `pullFromCloud`, and the place the **tombstone ruling**
 * routed from KC-PR-#48's canon audit is implemented.
 *
 * =====================================================================
 * THE TOMBSTONE RULING (KC-IS-#31, routed from KC-PR-#48)
 * =====================================================================
 *
 * **Ruling: tombstones ARE pushed.** The push set is `dirtyRecords` — every row
 * whose local write is unconfirmed, soft-deleted rows included — not
 * `pendingSyncRecords`, which excludes them.
 *
 * The question, restated: KroApple's `softDelete` stamps the tombstone and
 * clears the confirmation with the comment `// mark dirty so tombstone gets
 * pushed`, but `pushPendingToCloud`'s predicate is
 *
 * ```
 * deletedAtEpochMillis == nil
 *   AND (lastSyncedAtEpochMillis == nil OR updatedAtEpochMillis > lastSyncedAtEpochMillis)
 * ```
 *
 * whose first clause excludes exactly the rows the first half just prepared. So
 * canon's stated intent and canon's actual behaviour disagree, and the web port
 * — which ships both halves as `dirtyRecords` and `pendingSyncRecords`, with a
 * `@kro/core` test asserting they differ by exactly the tombstone — is where the
 * disagreement had to be decided.
 *
 * **Why the intent wins over the behaviour.** The alternative — mirroring
 * canon's predicate — is not a neutral "stay faithful" choice; it is a choice to
 * ship a known data-loss bug. With tombstones excluded, a delete made on this
 * device never reaches Kro Cloud, so the row survives on the server, and the
 * *next pull resurrects it locally*: canon's own pull branch writes
 * `existing.deletedAtEpochMillis = nil` for every row the cloud still has. The
 * user deletes an endeavor, it comes back, and nothing anywhere records that it
 * ever went. A soft delete that cannot propagate is not a soft delete; it is a
 * local hide with an expiry date.
 *
 * **How a tombstone is pushed, given the schema.** `public.endeavors` has **no
 * `deleted_at` column** — the RLS migration's own notes say offline delete sync
 * *"needs a `deleted_at` column or a sibling `*_tombstones` table — Phase 3b
 * will add it"*, and Phase 3b never added it. kro-pwa authors no migrations
 * (the schema is KroApple's), so the only representation of "this row is gone"
 * the current schema can carry is the row's absence. A tombstone therefore
 * pushes as a **DELETE**, and the local row stays on disk with its tombstone
 * intact and `lastSyncedAtEpochMillis` stamped, so it is clean, invisible to
 * every query (`liveRecords`), and never pushed again.
 *
 * **Push runs before pull, and that ordering is part of the ruling.** Because
 * the pull un-tombstones anything the cloud still holds, a pull-first sweep
 * would clobber a pending local delete before it was ever sent. `synchronize`
 * therefore pushes first, always; `__tests__/EndeavorSyncService.test.ts` pins
 * it by asserting that a deleted-then-synchronised row does not come back.
 *
 * **Upstream.** KroApple should either widen its push predicate the same way or
 * add the `deleted_at` column its own notes call for. That is a change to the
 * canon repo and belongs on a KP issue, not here; this PR records the ruling and
 * the orchestrator files/routes it.
 *
 * =====================================================================
 *
 * ## The flag gate: OFF means zero network, and that is checkable
 *
 * `supabaseHosting` is `disabled` in `statusQuoSet`, exactly as in canon (which
 * only offers Kro Cloud as a hosting destination when the flag is on). Every
 * entry point below reads the gate **first**, before touching the transport or
 * even the local store, and returns `status: 'disabled'`. The stubbed transport
 * records every call, so `transport.calls()` being empty is the proof — not a
 * comment claiming no request was made.
 *
 * ## Conflict resolution: last-write-wins, ties to the cloud
 *
 * On pull, a cloud row and a local row are compared by `updatedAtEpochMillis`
 * through `@kro/core`'s `lastWriteWins`, whose tie-break is *remote* — canon's
 * *"Cloud is authoritative after a pull"*. The one deliberate tightening over
 * canon: canon overwrites the local row **unconditionally**, which throws away a
 * newer offline edit that has not been pushed yet. Here the comparison is made,
 * and a strictly-newer local row is kept (and stays dirty, so the *next* push
 * sends it). Canon's behaviour is reachable only because its pull happens right
 * after sign-in, when local state is by definition fresh; this engine's
 * `synchronize` runs push-then-pull on demand, where the local row can genuinely
 * be ahead. Recorded as a divergence in the PR.
 *
 * ## What this engine does NOT sync, and why
 *
 * `defers` and `performances` child rows are **out of scope for this issue** and
 * are left untouched — their `pendingSync()` candidates stay pending, so a later
 * child picks them up with no rework. Two concrete reasons rather than one
 * omission: (a) their sync is keyed on a **server-assigned `bigint` id** round
 * trip (`serverId`), a different protocol from the endeavor row's client-owned
 * `varchar` id, and (b) `performances.session_fragments` has an unresolved
 * cross-platform encoding — the local blob is Apple-reference-epoch seconds
 * (`PerformanceRecord`), while the wire shape Swift's Supabase encoder produces
 * is not determinable from this repo. Guessing it would write rows KroApple
 * cannot read, which is worse than not writing them. AC 4 names endeavors, and
 * endeavors are what this engine syncs.
 */
import {
  type Endeavor,
  type EndeavorRecord,
  type EpochMillis,
  type FeatureFlagService,
  FeatureFlags,
  type LocalStore,
  dirtyRecords,
  endeavorFromRecord,
  endeavorRecordFromEndeavor,
  epochMillisFromDate,
  isRecordSoftDeleted,
} from '@kro/core'
import {
  EndeavorSyncExceptions,
  endeavorSyncExceptionFrom,
} from '../../features/auth/EndeavorSyncException'
import type { EndeavorCloudTransport } from './EndeavorCloudTransport'
import { EndeavorRowMapper } from './EndeavorRow'

/**
 * What a triage-style single-row push reported.
 *
 * The three members are chosen to be **exactly** `TriagePushTransport`'s, so
 * `TriageProducer` can bind this straight into `triagePushOutcomeFor` without a
 * translation table. `__tests__/EndeavorSyncService.test.ts` asserts the two
 * sets are equal, so a rename on either side breaks a test rather than a build.
 */
export type EndeavorPushTransportOutcome = 'unavailable' | 'succeeded' | 'failed'

/** Why a sweep did nothing, or that it ran. One discriminant (`UZF-9`). */
export type EndeavorSyncStatus = 'disabled' | 'signedOut' | 'synchronized'

export interface EndeavorSyncReport {
  readonly status: EndeavorSyncStatus
  /** Ids upserted to the cloud. */
  readonly pushed: readonly string[]
  /** Ids whose **tombstone** was pushed as a DELETE — the ruling, in evidence. */
  readonly deleted: readonly string[]
  /** Ids whose push failed; they stay dirty and are retried next sweep. */
  readonly deferred: readonly string[]
  /** Ids written locally from the cloud. */
  readonly pulled: readonly string[]
  /** Ids where the local row was newer and was kept (last-write-wins). */
  readonly localWins: readonly string[]
  /** Cloud rows the Mapper refused (unknown kind or status). */
  readonly skipped: readonly string[]
}

const emptyReport = (status: EndeavorSyncStatus): EndeavorSyncReport => ({
  status,
  pushed: [],
  deleted: [],
  deferred: [],
  pulled: [],
  localWins: [],
  skipped: [],
})

export interface EndeavorSyncService {
  /** Push every dirty row (tombstones included), then pull. In that order. */
  synchronize(params: { now: Date }): Promise<EndeavorSyncReport>
  push(params: { now: Date }): Promise<EndeavorSyncReport>
  pull(params: { now: Date }): Promise<EndeavorSyncReport>
  /**
   * Push one endeavor now — the transport leg of a durable save (#25's
   * `TriageSave`). Never throws: a failure is an outcome, because the local
   * save it rides on already succeeded.
   */
  pushOne(params: {
    endeavor: Endeavor
    now: Date
  }): Promise<EndeavorPushTransportOutcome>
}

// ---------------------------------------------------------------------------
// The engine
// ---------------------------------------------------------------------------

export interface EndeavorSyncServiceOptions {
  readonly localStore: LocalStore
  readonly transport: EndeavorCloudTransport
  /**
   * The rollout gate. A function rather than a boolean so a debug override
   * flipped mid-session is honoured on the next sweep, and so the flag service
   * is read at the moment of use rather than captured at wiring time.
   */
  readonly isCloudEnabled: () => boolean
}

/** The `supabaseHosting` gate, read from a flag service (`UZF-22`). */
export const supabaseHostingGate =
  (service: FeatureFlagService) => (): boolean =>
    service.isEnabled(FeatureFlags.supabaseHosting)

/**
 * The signed-in account's id, from the locally cached profile.
 *
 * Taken from the local store rather than passed in so no caller can push one
 * account's rows under another account's owner by supplying the wrong id, and
 * so `pushOne` (called from Triage, which knows nothing about auth) needs no
 * extra argument.
 */
const currentOwnerUserId = async (localStore: LocalStore): Promise<string | null> => {
  const profile = await localStore.userProfiles.current()
  return profile?.id ?? null
}

export const makeEndeavorSyncService = (
  options: EndeavorSyncServiceOptions,
): EndeavorSyncService => {
  const { localStore, transport, isCloudEnabled } = options

  /**
   * The rows this account may push: its own, dirty, **tombstones included**.
   * This is the ruling in one expression — `dirtyRecords`, never
   * `pendingSyncRecords`.
   */
  const pushCandidates = async (
    ownerUserId: string,
  ): Promise<readonly EndeavorRecord[]> => {
    const rows = await localStore.endeavors.allIncludingRemoved()
    return dirtyRecords(rows.filter((row) => row.ownerUserId === ownerUserId))
  }

  const pushRows = async (params: {
    readonly ownerUserId: string
    readonly rows: readonly EndeavorRecord[]
    readonly now: Date
  }): Promise<{
    pushed: string[]
    deleted: string[]
    deferred: string[]
  }> => {
    const pushed: string[] = []
    const deleted: string[] = []
    const deferred: string[] = []
    if (params.rows.length === 0) return { pushed, deleted, deferred }

    // Resolved once per sweep, and only when there is something to send — a
    // clean store makes zero transport calls.
    let ownerId: number
    try {
      ownerId = await transport.resolveOwnerId(params.ownerUserId)
    } catch (error) {
      throw endeavorSyncExceptionFrom(error, () =>
        EndeavorSyncExceptions.ownerUnresolved(params.ownerUserId),
      )
    }

    const syncedAt: EpochMillis = epochMillisFromDate(params.now)

    for (const row of params.rows) {
      try {
        if (isRecordSoftDeleted(row)) {
          // THE RULING: a tombstone is pushed, and with no `deleted_at` column
          // in the schema the only representation available is the row's
          // absence.
          await transport.deleteEndeavor(row.id)
          await localStore.endeavors.markSynced(row.id, syncedAt)
          deleted.push(row.id)
          continue
        }
        const decoded = endeavorFromRecord(row)
        if (!decoded.ok) {
          // A row this device cannot decode is a row it must not push: sending
          // a half-understood shape would overwrite the cloud's good copy.
          deferred.push(row.id)
          continue
        }
        await transport.upsertEndeavor(
          EndeavorRowMapper.fromDomain(decoded.value, { ownerId, now: params.now }),
        )
        await localStore.endeavors.markSynced(row.id, syncedAt)
        pushed.push(row.id)
      } catch {
        // Canon swallows per-row failures so one bad row cannot block the rest;
        // the row stays dirty and the next sweep retries it.
        deferred.push(row.id)
      }
    }

    return { pushed, deleted, deferred }
  }

  const pullRows = async (params: {
    readonly ownerUserId: string
    readonly now: Date
  }): Promise<{ pulled: string[]; localWins: string[]; skipped: string[] }> => {
    const pulled: string[] = []
    const localWins: string[] = []
    const skipped: string[] = []

    let rows: readonly Awaited<ReturnType<EndeavorCloudTransport['fetchEndeavors']>>[number][]
    try {
      rows = [...(await transport.fetchEndeavors())]
    } catch (error) {
      throw endeavorSyncExceptionFrom(error, EndeavorSyncExceptions.pullFailed)
    }

    const nowMillis = epochMillisFromDate(params.now)

    for (const row of rows) {
      const endeavor = EndeavorRowMapper.toDomain(row)
      if (endeavor === null) {
        skipped.push(row.id)
        continue
      }

      const existing = (await localStore.endeavors.allIncludingRemoved()).find(
        (candidate) => candidate.id === row.id,
      )

      // Last-write-wins by the row's own write watermark. Ties resolve to the
      // cloud, matching `lastWriteWins`'s documented tie-break.
      if (
        existing !== undefined &&
        existing.updatedAtEpochMillis > (endeavor.updatedAt?.getTime() ?? 0)
      ) {
        localWins.push(row.id)
        continue
      }

      await localStore.endeavors.put(
        endeavorRecordFromEndeavor(endeavor, {
          now: params.now,
          ownerUserId: params.ownerUserId,
          lastSyncedAtEpochMillis: nowMillis,
          // The cloud has the row, so it is not deleted. This is canon's
          // `existing.deletedAtEpochMillis = nil` — safe here only because the
          // push already ran and any pending tombstone has been sent.
          deletedAtEpochMillis: null,
        }),
      )
      pulled.push(row.id)
    }

    return { pulled, localWins, skipped }
  }

  /** The gate + account checks every entry point shares. */
  const readyOwner = async (): Promise<
    { ready: true; ownerUserId: string } | { ready: false; status: EndeavorSyncStatus }
  > => {
    if (!isCloudEnabled()) return { ready: false, status: 'disabled' }
    const ownerUserId = await currentOwnerUserId(localStore)
    if (ownerUserId === null) return { ready: false, status: 'signedOut' }
    return { ready: true, ownerUserId }
  }

  const push: EndeavorSyncService['push'] = async ({ now }) => {
    const owner = await readyOwner()
    if (!owner.ready) return emptyReport(owner.status)
    const rows = await pushCandidates(owner.ownerUserId)
    const outcome = await pushRows({ ownerUserId: owner.ownerUserId, rows, now })
    return { ...emptyReport('synchronized'), ...outcome }
  }

  const pull: EndeavorSyncService['pull'] = async ({ now }) => {
    const owner = await readyOwner()
    if (!owner.ready) return emptyReport(owner.status)
    const outcome = await pullRows({ ownerUserId: owner.ownerUserId, now })
    return { ...emptyReport('synchronized'), ...outcome }
  }

  return {
    push,
    pull,

    async synchronize({ now }) {
      const owner = await readyOwner()
      if (!owner.ready) return emptyReport(owner.status)

      // PUSH FIRST — see the ruling in the file header. A pull first would
      // un-tombstone a row whose delete has not been sent yet.
      const rows = await pushCandidates(owner.ownerUserId)
      const pushOutcome = await pushRows({
        ownerUserId: owner.ownerUserId,
        rows,
        now,
      })
      const pullOutcome = await pullRows({ ownerUserId: owner.ownerUserId, now })
      return { status: 'synchronized', ...pushOutcome, ...pullOutcome }
    },

    async pushOne({ endeavor, now }) {
      const owner = await readyOwner()
      if (!owner.ready) return 'unavailable'
      try {
        const ownerId = await transport.resolveOwnerId(owner.ownerUserId)
        await transport.upsertEndeavor(
          EndeavorRowMapper.fromDomain(endeavor, { ownerId, now }),
        )
        await localStore.endeavors.markSynced(endeavor.id, epochMillisFromDate(now))
        return 'succeeded'
      } catch {
        // The local save already succeeded; a failed push is a deferral, not a
        // failure of the save. `TriageSave` says the same thing in canon's words.
        return 'failed'
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Stub
// ---------------------------------------------------------------------------

export interface StubbedEndeavorSyncServiceOptions {
  /** What every sweep reports. Defaults to a disabled engine. */
  readonly report?: EndeavorSyncReport
  /** What `pushOne` answers. Defaults to `unavailable`. */
  readonly pushOneOutcome?: EndeavorPushTransportOutcome
}

export interface StubbedEndeavorSyncService extends EndeavorSyncService {
  /** Every operation invoked, in order. */
  operations(): readonly ('synchronize' | 'push' | 'pull' | 'pushOne')[]
}

/**
 * The test/preview binding (`RC-33`).
 *
 * Defaults to `disabled` / `unavailable`, which is the same answer the **live**
 * engine gives under `statusQuoSet` — so a suite that forgets to configure it
 * sees shipping behaviour rather than an optimistic fiction. A suite that wants
 * the real engine builds one with `makeEndeavorSyncService` over an in-memory
 * store and the stubbed transport; that is what the engine's own tests do.
 */
export const makeStubbedEndeavorSyncService = (
  options: StubbedEndeavorSyncServiceOptions = {},
): StubbedEndeavorSyncService => {
  const report = options.report ?? emptyReport('disabled')
  const invoked: ('synchronize' | 'push' | 'pull' | 'pushOne')[] = []

  return {
    operations: () => [...invoked],
    async synchronize() {
      invoked.push('synchronize')
      return report
    },
    async push() {
      invoked.push('push')
      return report
    },
    async pull() {
      invoked.push('pull')
      return report
    },
    async pushOne() {
      invoked.push('pushOne')
      return options.pushOneOutcome ?? 'unavailable'
    },
  }
}

/** The default stub — the engine as it ships: flag off, nothing pushed. */
export const stubbedEndeavorSyncService: EndeavorSyncService =
  makeStubbedEndeavorSyncService()

/** Exported so a report can be built in a mocks file without re-spelling it. */
export const emptyEndeavorSyncReport = emptyReport
