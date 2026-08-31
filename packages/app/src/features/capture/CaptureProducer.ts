/**
 * The Capture & Inbox Producers (`RC-3`, `RC-6`, `RC-7`, `RC-25`).
 *
 * Five thunks, one shape: reach the store only through `extra.localStore`,
 * never throw, always resolve a `Result`. None reads a clock — `now` is an
 * argument, so the reducer classifies against the same instant the effect used
 * — and none mints an id: `submitCaptureThunk` takes the new endeavor's `id`
 * from its caller, because identity is the composition root's to supply and a
 * captured endeavor must be reproducible in a test.
 *
 * ## Why none of them takes `getState()`
 *
 * `RC-3` allows a narrow, named read; these need none. The draft, the row id
 * and the undo snapshot all arrive as explicit arguments, which keeps the
 * thunks free of `RootState` — a type that would otherwise make the store's own
 * type circular through the slice that registers it. It is also what lets a
 * suite dispatch `undoScheduleForTodayThunk` with a snapshot the store never
 * held, to prove the reducer's own guard rather than the caller's.
 *
 * ## A malformed row is skipped, never fatal
 *
 * `endeavorFromRecord` fails only on an unknown `kind` or `status`, and canon's
 * caller *"treats the failure as skip this row"*. One corrupt row must not
 * empty a user's Inbox, so the pool is built from what decodes — the same rule
 * `DoProducer` applies to the day.
 */
import {
  type Endeavor,
  EndeavorOperation,
  type EndeavorRecord,
  EndeavorStatus,
  FeatureFlags,
  type LocalStore,
  type ReconciliationContext,
  type Result,
  deferFromRecord,
  deferRecordFromDefer,
  endeavorFromRecord,
  endeavorRecordFromEndeavor,
  epochMillisFromDate,
  err,
  livingChildRecords,
  makeFeatureFlagOverrideStore,
  makeHardcodedFeatureFlagService,
  makeReconciliationContext,
  ok,
  overridesAsAssignments,
  performFromRecord,
  resolvedKind,
} from '@kro/core'
import { createAsyncThunk } from '@reduxjs/toolkit'
import type { ThunkExtra } from '../../library/store'
import { type CaptureException, CaptureExceptions } from './CaptureException'
import {
  LAST_USED_DESTINATION_KEY,
  type CaptureDestination,
  type CaptureDraft,
  type CaptureSchedulingSnapshot,
  availableCaptureDestinations,
  captureBlockedReason,
  captureResultFromDraft,
  defersAddedBySnapshot,
  endeavorFromCaptureResult,
  isCaptureResultValidForCreation,
  lastUsedDestinationFromStored,
  scheduledForToday,
  schedulingSnapshotOf,
  unscheduledFromSnapshot,
} from './CaptureRules'

/** Everything the surface needs before it can open: the pool and the picker. */
export interface CaptureContext {
  readonly endeavors: readonly Endeavor[]
  readonly lastUsedDestination: CaptureDestination
  readonly availableDestinations: readonly CaptureDestination[]
  readonly now: Date
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

/**
 * Every stored endeavor, hydrated with its relations.
 *
 * The two child stores are read **once each** and grouped in memory rather than
 * queried per endeavor: an Inbox with a hundred rows would otherwise cost two
 * hundred extra round-trips through IndexedDB. (The same read `DoProducer`
 * performs; it is duplicated rather than shared because a cross-feature import
 * of another feature's Producer is exactly what `UZF-6` forbids, and promoting
 * it is a `services/` change outside this issue's lane.)
 */
const readStoredEndeavors = async (
  localStore: LocalStore,
): Promise<readonly Endeavor[]> => {
  const [endeavorRecords, deferRecords, performanceRecords] = await Promise.all([
    localStore.endeavors.all(),
    localStore.defers.all(),
    localStore.performances.all(),
  ])

  const defersByEndeavor = new Map<string, ReturnType<typeof deferFromRecord>[]>()
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
 * O(1)-ish read for a single-row mutation (Add-for-Today, its undo), where
 * hydrating the whole store would make every tap O(N) IndexedDB work.
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
 * Rewrites one stored endeavor, preserving its sync watermark.
 *
 * `lastSyncedAtEpochMillis` is carried forward from the row on disk: dropping
 * it would present an already-synced endeavor to the next push sweep as if it
 * had never left the device.
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
 * The pool, the remembered hosting destination and the destinations on offer,
 * read in one pass.
 *
 * The two Apple destinations are unreachable on web (#1: EventKit has no
 * browser counterpart), so the offered list is Local plus Kro Cloud when
 * `supabaseHosting` is on — canon's own derivation with its two impossible
 * branches removed rather than faked.
 *
 * The flag service is built from the **injected** key-value store's persisted
 * `debug.ff.*` overrides layered over the `statusQuo` baseline, exactly as
 * `DoProducer` does: `makeHardcodedFeatureFlagService` is a pure resolver over
 * data that arrived through `extra`.
 */
export const loadCaptureContextThunk = createAsyncThunk<
  Result<CaptureContext, CaptureException>,
  { now: Date },
  { extra: ThunkExtra }
>('capture/onCaptureContextLoadCompleted', async ({ now }, { extra }) => {
  try {
    const preferences = extra.localStore.preferences
    const flags = makeHardcodedFeatureFlagService({
      overrides: overridesAsAssignments(
        makeFeatureFlagOverrideStore(preferences).all(),
      ),
    })

    const stored = await readStoredEndeavors(extra.localStore)
    // Raw pass-through: the install Shifter owns the single reconcile pass
    // (#12's reconcile-before-grouping contract, applied exactly once).
    return ok({
      endeavors: stored,
      lastUsedDestination: lastUsedDestinationFromStored(
        preferences.get(LAST_USED_DESTINATION_KEY),
      ),
      availableDestinations: availableCaptureDestinations({
        kroCloudEnabled: flags.isEnabled(FeatureFlags.supabaseHosting),
      }),
      now,
    })
  } catch (error) {
    return err(CaptureExceptions.contextLoadFailed(messageOf(error)))
  }
})

/** What a committed capture hands the reducer. */
export interface CaptureCommit {
  readonly endeavor: Endeavor
  readonly destination: CaptureDestination
  readonly now: Date
}

/**
 * Confirm the prompt — canon's `commitIfValid()` → `.userDidAddEndeavor`.
 *
 * The validation runs **again** here, after the button gate, because canon
 * guards twice for the same reason: *"even if the button gate misfires, refuse
 * to emit an event result without both a start and an end time"*. On web the
 * write is the capture, so an invalid draft resolves an exception rather than
 * being dropped in silence the way canon's `guard … else { return .none }`
 * does — a capture the user asked for and did not get must be reportable.
 *
 * The destination is remembered **only on a confirmed capture**, matching
 * canon's `lastUsedHostRawValue = result.destination.rawValue` inside the
 * prompt's `onAdd` callback. Browsing the menu and discarding leaves it alone.
 */
export const submitCaptureThunk = createAsyncThunk<
  Result<CaptureCommit, CaptureException>,
  { draft: CaptureDraft; id: string; now: Date },
  { extra: ThunkExtra }
>('capture/onCaptureSubmissionCompleted', async ({ draft, id, now }, { extra }) => {
  const result = captureResultFromDraft(draft)
  if (result === null || !isCaptureResultValidForCreation(result)) {
    return err(
      CaptureExceptions.invalidCapture(
        captureBlockedReason(draft) ?? 'This capture is missing something.',
      ),
    )
  }

  const endeavor = endeavorFromCaptureResult(result, { id, now })

  try {
    await persistEndeavor(
      extra.localStore,
      endeavor,
      now,
      makeReconciliationContext({ now }),
    )
  } catch (error) {
    return err(CaptureExceptions.captureFailed(messageOf(error)))
  }

  try {
    extra.localStore.preferences.set(
      LAST_USED_DESTINATION_KEY,
      result.destination,
    )
  } catch {
    // Remembering the destination is a convenience, not the capture. The
    // endeavor is already on disk, so failing here would report a capture that
    // demonstrably happened as having failed — and the user would see the row
    // appear on the next refresh anyway.
  }

  return ok({ endeavor, destination: result.destination, now })
})

/** What a confirmed Add-for-Today hands the reducer. */
export interface CaptureScheduling {
  readonly endeavor: Endeavor
  readonly snapshot: CaptureSchedulingSnapshot
  readonly now: Date
}

/**
 * **Add for Today** — move the row's due date to the chosen slot.
 *
 * The snapshot is taken from the row **as stored**, not from the in-memory
 * pool, so an undo restores what is actually on disk even if the pool went
 * stale between the tap and the confirmation.
 *
 * Both writes are awaited before the `Result` resolves: the endeavor row and
 * the `Defer` audit row it appended. Writing only the first would leave a
 * reload showing the new due date with no record of how it got there.
 */
export const scheduleForTodayThunk = createAsyncThunk<
  Result<CaptureScheduling, CaptureException>,
  { endeavorId: string; scheduledAt: Date; now: Date },
  { extra: ThunkExtra }
>(
  'capture/onAddForTodayCompleted',
  async ({ endeavorId, scheduledAt, now }, { extra }) => {
    let target: Endeavor | undefined
    try {
      target = await readStoredEndeavor(extra.localStore, endeavorId)
    } catch (error) {
      return err(CaptureExceptions.schedulingFailed(messageOf(error)))
    }
    if (target === undefined) {
      return err(CaptureExceptions.endeavorNotFound(endeavorId))
    }

    const snapshot = schedulingSnapshotOf(target, scheduledAt)
    const scheduled = scheduledForToday(target, { scheduledAt, now })

    try {
      const context = makeReconciliationContext({ now })
      await persistEndeavor(extra.localStore, scheduled, now, context)
      for (const entry of defersAddedBySnapshot(scheduled, snapshot)) {
        await extra.localStore.defers.put(
          deferRecordFromDefer(entry, {
            endeavorId,
            now,
            nowMillis: epochMillisFromDate(now),
          }),
        )
      }
      return ok({ endeavor: scheduled, snapshot, now })
    } catch (error) {
      return err(CaptureExceptions.schedulingFailed(messageOf(error)))
    }
  },
)

/**
 * **Undo** — put the row back exactly as it was.
 *
 * `start`, `due` and the defer history are all restored, including back to
 * `null`. Canon restores only a non-`nil` previous due date, which makes its
 * undo a no-op for every Inbox row (Pending Triage holds *unscheduled*
 * endeavors, so there is never a previous due date to restore); KC-IS-#23 binds
 * the behaviour the spec promises instead. See `unscheduledFromSnapshot`.
 *
 * The snapshot is an argument rather than a state read, so this thunk is
 * meaningful on its own: the *window* is the reducer's guard, and firing after
 * it closed changes nothing because `withSchedulingUndone` refuses.
 */
export const undoScheduleForTodayThunk = createAsyncThunk<
  Result<{ endeavor: Endeavor }, CaptureException>,
  { snapshot: CaptureSchedulingSnapshot; now: Date },
  { extra: ThunkExtra }
>('capture/onUndoAddForTodayCompleted', async ({ snapshot, now }, { extra }) => {
  let target: Endeavor | undefined
  try {
    target = await readStoredEndeavor(extra.localStore, snapshot.endeavorId)
  } catch (error) {
    return err(CaptureExceptions.undoFailed(messageOf(error)))
  }
  if (target === undefined) {
    return err(CaptureExceptions.endeavorNotFound(snapshot.endeavorId))
  }

  const restored = unscheduledFromSnapshot(target, snapshot)
  const removed = defersAddedBySnapshot(target, snapshot)

  try {
    const context = makeReconciliationContext({ now })
    await persistEndeavor(extra.localStore, restored, now, context)

    if (removed.length > 0) {
      const rows = await extra.localStore.defers.forEndeavor(snapshot.endeavorId)
      for (const row of rows) {
        const matches = removed.some(
          (entry) =>
            entry.made.getTime() === row.made.getTime() &&
            entry.target.getTime() ===
              (row.target ?? row.made).getTime(),
        )
        if (matches) {
          await extra.localStore.defers.removeLocal(row, epochMillisFromDate(now))
        }
      }
    }
    return ok({ endeavor: restored })
  } catch (error) {
    return err(CaptureExceptions.undoFailed(messageOf(error)))
  }
})

/** What a row operation hands the reducer. `null` means the row is gone. */
export interface CaptureOperationOutcome {
  readonly endeavorId: string
  readonly endeavor: Endeavor | null
}

/**
 * One row operation, from the Inbox vista's capability set.
 *
 * That set is `markComplete` and `delete` — the two trailing-swipe bindings
 * `EndeavorsVistas.inbox` declares and the two cases canon's `onOperation`
 * switch handles (`default: break`). Anything else resolves
 * `unsupportedOperation` rather than failing silently: Start belongs to the
 * session feature, Edit to the detail feature, and Triage is raised as a
 * request, not applied here.
 *
 * The reward a quick-complete awards is canon's `produceRecordQuickCompleteEffect`
 * and belongs to Earn (#27); this closes the row and persists it, which is the
 * part the Inbox owns.
 */
export const applyInboxOperationThunk = createAsyncThunk<
  Result<CaptureOperationOutcome, CaptureException>,
  { operation: EndeavorOperation; endeavorId: string; now: Date },
  { extra: ThunkExtra }
>(
  'capture/onInboxOperationCompleted',
  async ({ operation, endeavorId, now }, { extra }) => {
    if (
      operation !== EndeavorOperation.markComplete &&
      operation !== EndeavorOperation.delete
    ) {
      return err(CaptureExceptions.unsupportedOperation(operation))
    }

    let target: Endeavor | undefined
    try {
      const stored = await readStoredEndeavors(extra.localStore)
      target = stored.find((endeavor) => endeavor.id === endeavorId)
    } catch (error) {
      return err(CaptureExceptions.operationFailed(messageOf(error)))
    }
    if (target === undefined) {
      return err(CaptureExceptions.endeavorNotFound(endeavorId))
    }

    try {
      if (operation === EndeavorOperation.delete) {
        await extra.localStore.endeavors.softDelete(
          endeavorId,
          epochMillisFromDate(now),
        )
        return ok({ endeavorId, endeavor: null })
      }

      const completed: Endeavor = {
        ...target,
        status: EndeavorStatus.closed,
        completed: now,
      }
      await persistEndeavor(
        extra.localStore,
        completed,
        now,
        makeReconciliationContext({ now }),
      )
      return ok({ endeavorId, endeavor: completed })
    } catch (error) {
      return err(CaptureExceptions.operationFailed(messageOf(error)))
    }
  },
)
