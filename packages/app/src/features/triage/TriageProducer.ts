/**
 * The Triage Producers (`RC-3`, `RC-6`, `RC-7`, `RC-25`).
 *
 * Two thunks, one shape: reach the store only through `extra.localStore`, never
 * throw, always resolve a `Result`. Neither reads a clock — `now` is an
 * argument, so the reducer classifies against the same instant the effect used.
 *
 * Canon has **no** Triage producer at all (`TriageProducer.swift` is an empty
 * extension: *"No async effects in the current version… persistence happens in
 * the parent feature"*), and the save lives in
 * `MainProducer.producePersistTriagedEndeavorEffect`. There is no Main slice
 * here, so the save comes with the feature — see `TriageException`.
 *
 * ## Why the open is a thunk at all
 *
 * Canon's Inbox hands Triage a fully-formed `State`, because it already holds
 * the endeavor pool. This stack reads the pool per surface, so opening Triage
 * *is* a read: the endeavor to triage, and the local day's events the Urgent
 * column's gap search needs. Reconciliation runs **once**, on that read, before
 * anything derives a busy interval from it — #12's reconcile-before-filtering
 * contract, the same single-pass shape `withContextLoaded` uses on capture.
 *
 * ## A malformed row is skipped, never fatal
 *
 * `endeavorFromRecord` fails only on an unknown `kind` or `status`, and canon's
 * caller *"treats the failure as skip this row"*. One corrupt row must not make
 * the day look empty to the gap search, so the pool is built from what decodes.
 */
import {
  type Endeavor,
  type EndeavorRecord,
  type LocalStore,
  type ReconciliationContext,
  type Result,
  defaultTriageDurationOptionsMinutes,
  deferFromRecord,
  deferRecordFromDefer,
  endeavorFromRecord,
  endeavorRecordFromEndeavor,
  epochMillisFromDate,
  err,
  livingChildRecords,
  makeReconciliationContext,
  ok,
  performFromRecord,
  reconcile,
  resolvedKind,
} from '@kro/core'
import { createAsyncThunk } from '@reduxjs/toolkit'
import type { ThunkExtra } from '../../library/store'
import {
  defersAddedByTriage,
  endeavorWithTriageConfirmed,
} from './TriageApplication'
import { type TriageException, TriageExceptions } from './TriageException'
import type { TriageDecision } from './TriageRules'
import { type TriagePushOutcome, triagePushOutcomeFor } from './TriageSave'
import { triageBusyIntervalsFor } from './TriageScheduling'
import { TRIAGE_DEFAULT_SYMBOL, type TriageSessionSeed } from './TriageState'

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

/**
 * Every stored endeavor, hydrated with its relations.
 *
 * The two child stores are read **once each** and grouped in memory rather than
 * queried per endeavor. Duplicated from the capture lane rather than imported:
 * a feature reaching into a sibling feature's Producer is what `UZF-6` forbids
 * outright, and promoting the helper into `services/` is a change outside this
 * issue's lane.
 */
const readStoredEndeavors = async (
  localStore: LocalStore,
): Promise<readonly Endeavor[]> => {
  const [endeavorRecords, deferRecords, performanceRecords] = await Promise.all(
    [
      localStore.endeavors.all(),
      localStore.defers.all(),
      localStore.performances.all(),
    ],
  )

  const defersByEndeavor = new Map<
    string,
    ReturnType<typeof deferFromRecord>[]
  >()
  for (const record of livingChildRecords(deferRecords)) {
    const bucket = defersByEndeavor.get(record.endeavorId) ?? []
    bucket.push(deferFromRecord(record))
    defersByEndeavor.set(record.endeavorId, bucket)
  }

  const performancesByEndeavor = new Map<
    string,
    ReturnType<typeof performFromRecord>[]
  >()
  for (const record of livingChildRecords(performanceRecords)) {
    const bucket = performancesByEndeavor.get(record.endeavorId) ?? []
    bucket.push(performFromRecord(record))
    performancesByEndeavor.set(record.endeavorId, bucket)
  }

  const endeavors: Endeavor[] = []
  for (const record of endeavorRecords) {
    const hydrated = endeavorFromRecord(record, {
      defers: defersByEndeavor.get(record.id) ?? [],
      performances: performancesByEndeavor.get(record.id) ?? [],
    })
    if (hydrated.ok) endeavors.push(hydrated.value)
  }
  return endeavors
}

/**
 * One stored endeavor by id, hydrated with only its own relations — the
 * single-row read the save needs, so persisting one decision is not O(N)
 * IndexedDB work. (The pattern KC-IS-#23's Copilot round established.)
 */
const readStoredEndeavor = async (
  localStore: LocalStore,
  endeavorId: string,
): Promise<Endeavor | undefined> => {
  const record = await localStore.endeavors.get(endeavorId)
  if (record === null) return undefined
  const [deferRecords, performanceRecords] = await Promise.all([
    localStore.defers.forEndeavor(endeavorId),
    localStore.performances.forEndeavor(endeavorId),
  ])
  const hydrated = endeavorFromRecord(record, {
    defers: deferRecords.map(deferFromRecord),
    performances: performanceRecords.map(performFromRecord),
  })
  return hydrated.ok ? hydrated.value : undefined
}

/**
 * The single-row reconcile the save runs before deciding anything about hosts.
 *
 * It is the same contract the pool read applies — reconcile before anything
 * reads the row — and on one row the pipeline reduces to the series/occurrence
 * stages, so it is cheap.
 *
 * **What it cannot repair today, and why that is correct.** `EndeavorRecord`
 * has **no `hostedBy` column**: #10's shape decodes `hostedBy = []`
 * unconditionally, because *"hosting is re-derived from the shadows + the
 * reconciliation pass, not stored"*. A row that exists only in IndexedDB
 * therefore rehydrates as `unhosted`, which is exactly right for the two
 * decisions this Producer makes with it:
 *
 * - **Promotion** — an unhosted row is not a tourist, so nothing is promoted.
 *   Correct: there is no external original to leave in place, and
 *   `kroOwnsField` already grants the overlay a home.
 * - **Push targets** — an unhosted row names no remote host, so the push is
 *   `notApplicable` rather than a phantom pending sync.
 *
 * A genuine tourist reaches this path once provider evidence exists (#33's
 * Google Calendar ingestion, #31's cloud sync), and it arrives carrying its
 * shadows, which is what lets reconciliation put its hosts back. Until then the
 * promotion rule is exercised at the domain level — see the
 * `endeavorWithTriageConfirmed` suite — and never faked here.
 */
const reconciledSingle = (
  endeavor: Endeavor,
  context: ReconciliationContext,
): Endeavor => reconcile([endeavor], context)[0] ?? endeavor

/**
 * Rewrites one stored endeavor, preserving its sync watermark.
 *
 * `lastSyncedAtEpochMillis` is carried forward from the row on disk: dropping
 * it would present an already-synced endeavor to the next push sweep as if it
 * had never left the device. `updatedAtEpochMillis` becomes `now`, which is
 * what leaves the row **dirty** — and therefore retriable — after a push that
 * did not land.
 */
const persistEndeavor = async (
  localStore: LocalStore,
  endeavor: Endeavor,
  now: Date,
  context: ReconciliationContext,
): Promise<void> => {
  const existing: EndeavorRecord | null = await localStore.endeavors.get(
    endeavor.id,
  )
  await localStore.endeavors.put(
    endeavorRecordFromEndeavor(endeavor, {
      now,
      lastSyncedAtEpochMillis: existing?.lastSyncedAtEpochMillis ?? null,
      resolvedKind: resolvedKind(endeavor, context),
    }),
  )
}

/**
 * Open Triage on one endeavor.
 *
 * `nextFreeSlotToday` is canon's parent-supplied seed — the Inbox raises it on
 * the Triage tap (`CaptureTriageRequest`) — and is passed straight through as a
 * fallback for a session with no day cache. Nothing here promotes: the endeavor
 * is read, not written, which is *"tapping into a triage flow on a Kro-tourist
 * is fine"* holding by construction.
 */
export const openTriageThunk = createAsyncThunk<
  Result<TriageSessionSeed, TriageException>,
  {
    endeavorId: string
    now: Date
    nextFreeSlotToday?: Date | null
    endeavorSymbol?: string
    isEditReachable?: boolean
  },
  { extra: ThunkExtra }
>('triage/onTriageSessionLoadCompleted', async (params, { extra }) => {
  const { endeavorId, now } = params
  let pool: readonly Endeavor[]
  try {
    const stored = await readStoredEndeavors(extra.localStore)
    // Reconcile exactly once, before anything reads the pool (#12).
    pool = reconcile(stored, makeReconciliationContext({ now }))
  } catch (error) {
    return err(TriageExceptions.sessionLoadFailed(messageOf(error)))
  }

  const endeavor = pool.find((candidate) => candidate.id === endeavorId)
  if (endeavor === undefined) {
    return err(TriageExceptions.endeavorNotFound(endeavorId))
  }

  return ok({
    endeavor,
    endeavorSymbol: params.endeavorSymbol ?? TRIAGE_DEFAULT_SYMBOL,
    durationOptionsMinutes: defaultTriageDurationOptionsMinutes,
    // The endeavor being triaged is excluded from its own day: a row that is
    // already scheduled must not block the gap the user is re-scheduling it
    // into.
    busyIntervals: triageBusyIntervalsFor(
      pool.filter((candidate) => candidate.id !== endeavorId),
      now,
    ),
    nextFreeSlotToday: params.nextFreeSlotToday ?? null,
    isEditReachable: params.isEditReachable ?? false,
    now,
  })
})

/** What a completed durable save hands the reducer. */
export interface TriageSaveResult {
  readonly endeavor: Endeavor
  readonly push: TriagePushOutcome
  readonly now: Date
}

/**
 * **The durable save.** `saveOfflineFirst`, step for step.
 *
 * 1. Read the row as stored — the decision is applied to what is actually on
 *    disk, not to a pool that may have gone stale between opening Triage and
 *    confirming.
 * 2. Promote (if this is a tourist) and apply the decision. This is the
 *    **only** place `PromotionTrigger.triageConfirmed` is used, which is
 *    acceptance criterion 2 by construction: no other code path can promote,
 *    and opening Triage runs a different thunk that writes nothing.
 * 3. **Local store first.** The endeavor row and any `Defer` audit row the
 *    decision appended are both awaited. A failure here resolves
 *    `localSaveFailed` and **returns immediately** — the push is not attempted,
 *    because there is nothing durable to push.
 * 4. **Then the remote push attempt.** Its outcome rides on the success. The
 *    transport is now real (#31): `endeavorSync.pushOne` answers `unavailable`
 *    when `supabaseHosting` is off or nobody is signed in — which is the
 *    shipping configuration and therefore the same behaviour this step had
 *    before — `succeeded` when Kro Cloud accepted the row, and `failed`
 *    otherwise. `TriageSave` maps all three; none of them can undo step 3.
 *
 * There is no retry, no timer and no connectivity listener here, deliberately:
 * canon's own note is that the sweep is *planned*, not shipped, and inventing
 * one would put kro-pwa's behaviour ahead of the canon it is porting.
 */
export const saveTriageDecisionThunk = createAsyncThunk<
  Result<TriageSaveResult, TriageException>,
  { decision: TriageDecision; now: Date },
  { extra: ThunkExtra }
>('triage/onTriageSaveCompleted', async ({ decision, now }, { extra }) => {
  let target: Endeavor | undefined
  try {
    target = await readStoredEndeavor(extra.localStore, decision.endeavorId)
  } catch (error) {
    return err(TriageExceptions.localSaveFailed(messageOf(error)))
  }
  if (target === undefined) {
    return err(TriageExceptions.endeavorNotFound(decision.endeavorId))
  }

  const context = makeReconciliationContext({ now })
  const reconciled = reconciledSingle(target, context)
  const triaged = endeavorWithTriageConfirmed(reconciled, decision, { now })
  const appendedDefers = defersAddedByTriage(reconciled, triaged)

  // --- step 1: the local store. The only failure that loses the decision. ---
  try {
    await persistEndeavor(extra.localStore, triaged, now, context)
    for (const entry of appendedDefers) {
      await extra.localStore.defers.put(
        deferRecordFromDefer(entry, {
          endeavorId: decision.endeavorId,
          now,
          nowMillis: epochMillisFromDate(now),
        }),
      )
    }
  } catch (error) {
    return err(TriageExceptions.localSaveFailed(messageOf(error)))
  }

  // --- step 2: the remote push attempt. Never rolls step 1 back. ---
  const push = triagePushOutcomeFor({
    endeavor: triaged,
    transport: await extra.endeavorSync.pushOne({ endeavor: triaged, now }),
  })

  return ok({ endeavor: triaged, push, now })
})
