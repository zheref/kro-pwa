/**
 * The Do surface's Producers (`RC-3`, `RC-6`, `RC-7`, `RC-25`) — canon's
 * `produceLoadDoPreferencesEffect`, `produceFetchEndeavorsEffect`,
 * `produceClearExpiredEffect` and `produceMarkCompleteEffect`.
 *
 * Four thunks, one shape: read the store through `extra.localStore`, never
 * throw, always resolve a `Result`. None of them reads a clock — `now` is an
 * argument, so a suite states the instant it is asking about and the reducer
 * classifies against the same value the effect used.
 *
 * ## Why none of them takes `getState()`
 *
 * `RC-3` allows a narrow, named read; these need none. Clear Expired in
 * particular re-reads the day and recomputes its own targets rather than
 * trusting a set the caller selected earlier, so a snapshot that went stale
 * between the tap and the dispatch cannot close the wrong rows. It also keeps
 * the thunk free of `RootState`, which would otherwise make the store's own
 * type circular through the slice that registers it.
 *
 * ## A malformed row is skipped, never fatal
 *
 * `endeavorFromRecord` fails only on an unknown `kind` or `status`, and
 * canon's caller *"treats the failure as skip this row"*. One corrupt row must
 * not blank a user's whole day, so the day is built from what decodes.
 */
import {
  type Endeavor,
  type EndeavorRecord,
  EndeavorStatus,
  FeatureFlags,
  type LocalStore,
  type ReconciliationContext,
  type Result,
  deferFromRecord,
  deferRecordFromDefer,
  doAutoAdvanceAfterCompleteOption,
  doNowThresholdHoursOption,
  doShowSuggestionsOption,
  endeavorFromRecord,
  endeavorRecordFromEndeavor,
  err,
  livingChildRecords,
  makeDefer,
  makeFeatureFlagOverrideStore,
  makeHardcodedFeatureFlagService,
  makePreferences,
  makeReconciliationContext,
  ok,
  overridesAsAssignments,
  performFromRecord,
  preferenceBool,
  preferenceInt,
  reconcile,
  resolvedKind,
  withDeferred,
} from '@kro/core'
import { createAsyncThunk } from '@reduxjs/toolkit'
import type { ThunkExtra } from '../../library/store'
import { type DoException, DoExceptions } from './DoException'
import type { DoPreferences } from './DoFeature'
import { doClearExpiredTargets } from './DoRules'

/**
 * A whole-day snapshot and the instant it was read at, so the reducer
 * classifies against the same value the effect used rather than against a
 * second, later clock reading.
 */
export interface DoDaySnapshot {
  readonly endeavors: readonly Endeavor[]
  readonly now: Date
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

/**
 * Every stored endeavor, hydrated with its relations.
 *
 * The two child stores are read **once each** and grouped in memory rather
 * than queried per endeavor: a day with a hundred rows would otherwise cost
 * two hundred extra round-trips through IndexedDB.
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
 * The three `do.*` preferences and the two flags the surface AND's them with,
 * resolved in one pass.
 *
 * The flag service is built from the **injected** key-value store's persisted
 * `debug.ff.*` overrides layered over the `statusQuo` baseline. The boundary
 * is still injected — `makeHardcodedFeatureFlagService` is a pure in-memory
 * resolver over data that arrived through `extra`, the same way a Mapper is
 * pure over a payload that did. Layering the overrides at construction (rather
 * than `applyPersistedOverrides` afterwards) keeps the baseline visible
 * underneath, which is what the Debug flag list renders.
 */
export const loadDoPreferencesThunk = createAsyncThunk<
  Result<DoPreferences, DoException>,
  void,
  { extra: ThunkExtra }
>('do/onDoPreferencesLoadCompleted', async (_arg, { extra }) => {
  try {
    const store = extra.localStore.preferences
    const preferences = makePreferences(store)
    const flags = makeHardcodedFeatureFlagService({
      overrides: overridesAsAssignments(
        makeFeatureFlagOverrideStore(store).all(),
      ),
    })

    return ok({
      showSuggestions: preferenceBool(preferences, doShowSuggestionsOption),
      nowThresholdHours: preferenceInt(preferences, doNowThresholdHoursOption),
      autoAdvanceAfterComplete: preferenceBool(
        preferences,
        doAutoAdvanceAfterCompleteOption,
      ),
      activityRingsEnabled: flags.isEnabled(FeatureFlags.doActivityRings),
      googleCalendarEnabled: flags.isEnabled(FeatureFlags.googleCalendar),
    })
  } catch (error) {
    return err(DoExceptions.preferencesLoadFailed(messageOf(error)))
  }
})

/**
 * The Do vista's single fetch — canon's per-surface `produceFetchEndeavorsEffect`.
 *
 * **One** read for the whole day: tasks, habits, reminders and events come out
 * of the same snapshot, which is what lets the reducer install them together
 * and lets the lanes and the rings *"update together without repeated
 * whole-screen regrouping"*. Reconciliation runs here so the reducer receives
 * the raw stored list; `withEndeavorsInstalled` reconciles exactly once at
 * install (`#12`'s reconcile-before-grouping contract, single pass).
 */
export const fetchDoEndeavorsThunk = createAsyncThunk<
  Result<DoDaySnapshot, DoException>,
  { now: Date },
  { extra: ThunkExtra }
>('do/onEndeavorsFetchCompleted', async ({ now }, { extra }) => {
  try {
    const stored = await readStoredEndeavors(extra.localStore)
    // Raw pass-through: the install shifter owns the single reconcile pass
    // (#12's reconcile-before-grouping contract, applied exactly once).
    return ok({ endeavors: stored, now })
  } catch (error) {
    return err(DoExceptions.fetchFailed(messageOf(error)))
  }
})

/**
 * **Clear Expired** — close every expired endeavor, then refetch once.
 *
 * The two phases must never race, and the order is the whole feature: *"first
 * commits each old provider occurrence, then refetches the Do query and
 * atomically replaces the visible snapshot"*, which is what lets a recurring
 * item's occurrence for **today** appear immediately once the old one is out
 * of the way.
 *
 * So every mutation is awaited — sequentially, one row at a time, exactly as
 * canon's `for` loop does — before a single read runs, and the reducer sees
 * one install. Nothing partial is ever observable in state: a failure halfway
 * through resolves `err` and the reducer leaves the retained day exactly as it
 * was, even though some rows on disk have already been closed. That asymmetry
 * is canon's too, and the follow-up refetch is what reconciles it.
 *
 * The target set is recomputed here from a fresh read (see the module note),
 * and is the **Expired** lane only — `DoRules.doClearExpiredTargets` carries
 * the reasoning and the doc divergence.
 */
export const clearExpiredThunk = createAsyncThunk<
  Result<DoDaySnapshot, DoException>,
  { now: Date },
  { extra: ThunkExtra }
>('do/onClearExpiredCompleted', async ({ now }, { extra }) => {
  const context = makeReconciliationContext({ now })

  let targets: readonly Endeavor[]
  try {
    const stored = reconcile(
      await readStoredEndeavors(extra.localStore),
      context,
    )
    targets = doClearExpiredTargets(stored, now, context)
  } catch (error) {
    return err(DoExceptions.fetchFailed(messageOf(error)))
  }

  try {
    for (const target of targets) {
      // Closed, but deliberately **not** stamped as completed: clearing is an
      // acknowledgement, not an achievement. A completion date here would put
      // expired work into Completed Today and let it fill a ring.
      await persistEndeavor(
        extra.localStore,
        { ...target, status: EndeavorStatus.closed },
        now,
        context,
      )
    }
  } catch {
    return err(DoExceptions.clearExpiredMutationFailed())
  }

  try {
    const refreshed = await readStoredEndeavors(extra.localStore)
    return ok({ endeavors: refreshed, now })
  } catch {
    return err(DoExceptions.clearExpiredRefreshFailed())
  }
})

/**
 * Persist one confirmed completion, at the instant the popover carried.
 *
 * The reducer has already closed the row optimistically, so this thunk's
 * success has nothing to say and only its failure reaches state. `completionDate`
 * is passed separately from `now` on purpose: the user may have backdated the
 * completion, and the row must record when it was *done*, not when it was
 * *saved*.
 */
export const markEndeavorCompleteThunk = createAsyncThunk<
  Result<Endeavor, DoException>,
  { endeavorId: string; completionDate: Date; now: Date },
  { extra: ThunkExtra }
>(
  'do/onMarkCompleteCompleted',
  async ({ endeavorId, completionDate, now }, { extra }) => {
    try {
      const context = makeReconciliationContext({ now })
      const stored = await readStoredEndeavors(extra.localStore)
      const target = stored.find((endeavor) => endeavor.id === endeavorId)
      if (target === undefined) {
        return err(DoExceptions.endeavorNotFound(endeavorId))
      }

      const completed: Endeavor = {
        ...target,
        status: EndeavorStatus.closed,
        completed: completionDate,
      }
      await persistEndeavor(extra.localStore, completed, now, context)
      return ok(completed)
    } catch (error) {
      return err(DoExceptions.markCompleteFailed(messageOf(error)))
    }
  },
)

// ---------------------------------------------------------------------------
// The overflow menu's five card actions
// ---------------------------------------------------------------------------

/**
 * **Defer**, **Skip**, **Delegate**, **Undo a completion** and **Delete** — the
 * card-menu rows KC-IS-#16 shipped no Producer for.
 *
 * They lived in `pages/DoOverflowProducer.ts` until KC-IS-#71 item 3, because
 * this file was KC-IS-#16's lane while KC-IS-#17 built the surface. The move
 * brings the reducer arms with it: they used to register none, so a write that
 * failed while the store was otherwise healthy refetched a good day and said
 * nothing. The banner now names it.
 *
 * ## The shape they all share
 *
 * Mutate one endeavor on disk, then **refetch the whole day** and let
 * `withEndeavorsInstalled` replace the snapshot atomically — the same
 * arrangement `clearExpiredThunk` uses, and for the same reason: no
 * intermediate state is ever observable, so a half-applied day cannot be
 * painted. The refetch runs on the failure path too: if the store itself is
 * broken the refetch fails as well; if only the one write failed, the day comes
 * back unchanged, which is truthful rather than silent — and now says so.
 *
 * Every one resolves a `Result` and never throws (`RC-7`, `UZF-14`).
 */

/**
 * One hydrated endeavor, by id.
 *
 * `DoProducer`'s `readStoredEndeavors` reads the whole day because every lane
 * needs it; these four need exactly one row, so they read one — and pay for its
 * two child stores rather than for the day's.
 */
const readEndeavor = async (
  localStore: LocalStore,
  endeavorId: string,
): Promise<Endeavor | null> => {
  const record: EndeavorRecord | null =
    await localStore.endeavors.get(endeavorId)
  if (record === null) return null

  const [defers, performances] = await Promise.all([
    localStore.defers.forEndeavor(endeavorId),
    localStore.performances.forEndeavor(endeavorId),
  ])

  const hydrated = endeavorFromRecord(record, {
    defers: livingChildRecords(defers).map(deferFromRecord),
    performances: livingChildRecords(performances).map(performFromRecord),
  })
  return hydrated.ok ? hydrated.value : null
}

/**
 * The shared body: read one row, transform it, write it back, refetch the day.
 *
 * The transform is pure and is handed in, so each thunk below is one line of
 * intent — which is what keeps "Skip closes the row as skipped" reviewable
 * without reading four copies of the same I/O.
 */
const mutateAndRefetch = async (
  input: {
    readonly endeavorId: string
    readonly now: Date
    readonly extra: ThunkExtra
    readonly dispatch: (action: unknown) => unknown
    readonly notFound: () => DoException
    readonly failed: (reason: string) => DoException
  },
  transform: (
    endeavor: Endeavor,
    context: ReconciliationContext,
  ) => { readonly endeavor: Endeavor; readonly writeDefer?: Date },
): Promise<Result<Endeavor, DoException>> => {
  const context = makeReconciliationContext({ now: input.now })
  try {
    const target = await readEndeavor(input.extra.localStore, input.endeavorId)
    if (target === null) return err(input.notFound())

    const { endeavor, writeDefer } = transform(target, context)
    await persistEndeavor(input.extra.localStore, endeavor, input.now, context)

    if (writeDefer !== undefined) {
      // The audit row is a CHILD record and lives in its own store: the
      // endeavor codec carries `due`, never the `defers` history.
      await input.extra.localStore.defers.put(
        deferRecordFromDefer(
          makeDefer({ made: input.now, target: writeDefer }),
          {
            endeavorId: endeavor.id,
            now: input.now,
            nowMillis: input.now.getTime(),
          },
        ),
      )
    }

    return ok(endeavor)
  } catch (error) {
    return err(input.failed(messageOf(error)))
  } finally {
    /*
      Always — see the header. A broken store surfaces through the refetch's
      own exception arm; a healthy one simply re-installs the truth.

      AWAITED, which it was not before KC-IS-#71 item 3. Dispatched and left to
      settle, the refetch's `.fulfilled` could land AFTER this thunk's — and on
      a healthy store it installs a good day, which sets `load` back to
      `loaded` and wipes the exception the failure arm had just written. The
      banner would appear for a frame and vanish. Awaiting orders the two: the
      day lands first, the outcome last.
    */
    await input.dispatch(fetchDoEndeavorsThunk({ now: input.now }))
  }
}

/**
 * **Defer** — move the due moment and record why, at the instant the kit's
 * `DeferPopover` confirmed.
 *
 * `withDeferred` is guarded on the `defers` relation, so deferring a calendar
 * event or a habit is a domain-level no-op rather than a special case here —
 * the row is written back unchanged and the refetch shows the same day.
 */
export const deferEndeavorThunk = createAsyncThunk<
  Result<Endeavor, DoException>,
  { endeavorId: string; target: Date; now: Date },
  { extra: ThunkExtra }
>('do/onEndeavorDeferCompleted', async ({ endeavorId, target, now }, api) =>
  mutateAndRefetch(
    {
      endeavorId,
      now,
      extra: api.extra,
      dispatch: api.dispatch,
      notFound: () => DoExceptions.endeavorNotFound(endeavorId),
      failed: (reason) =>
        DoExceptions.unknown(`Couldn't defer that endeavor: ${reason}`),
    },
    (endeavor) => {
      const moved = withDeferred(endeavor, { target, made: now })
      // `withDeferred` refuses on a guarded kind and returns the row untouched;
      // writing an audit entry for a deferral that did not happen would be a
      // history the schedule contradicts.
      return moved === endeavor
        ? { endeavor }
        : { endeavor: moved, writeDefer: target }
    },
  ),
)

/**
 * **Skip** — canon's `userDidSkipCard`. The row closes as `skipped`, which
 * `hasBeenCompleted` counts, so it leaves every actionable lane; Completed
 * Today requires `closed`, so it does **not** appear there and fills no ring.
 * That asymmetry is canon's and is exactly why skipping is not completing.
 */
export const skipEndeavorThunk = createAsyncThunk<
  Result<Endeavor, DoException>,
  { endeavorId: string; now: Date },
  { extra: ThunkExtra }
>('do/onEndeavorSkipCompleted', async ({ endeavorId, now }, api) =>
  mutateAndRefetch(
    {
      endeavorId,
      now,
      extra: api.extra,
      dispatch: api.dispatch,
      notFound: () => DoExceptions.endeavorNotFound(endeavorId),
      failed: (reason) =>
        DoExceptions.unknown(`Couldn't skip that endeavor: ${reason}`),
    },
    (endeavor) => ({
      endeavor: { ...endeavor, status: EndeavorStatus.skipped },
    }),
  ),
)

/**
 * **Delegate** — the row moves to `delegated`.
 *
 * Canon's menu row opens a picker for *who* it was delegated to; there is no
 * person model in this build, so the status change is the whole action and the
 * assignee is named in this PR as the follow-up. A status the design system
 * already draws (`statusDelegated`) is a smaller lie than a menu row that does
 * nothing.
 */
export const delegateEndeavorThunk = createAsyncThunk<
  Result<Endeavor, DoException>,
  { endeavorId: string; now: Date },
  { extra: ThunkExtra }
>('do/onEndeavorDelegateCompleted', async ({ endeavorId, now }, api) =>
  mutateAndRefetch(
    {
      endeavorId,
      now,
      extra: api.extra,
      dispatch: api.dispatch,
      notFound: () => DoExceptions.endeavorNotFound(endeavorId),
      failed: (reason) =>
        DoExceptions.unknown(`Couldn't delegate that endeavor: ${reason}`),
    },
    (endeavor) => ({
      endeavor: { ...endeavor, status: EndeavorStatus.delegated },
    }),
  ),
)

/**
 * **Undo a completion** — canon's `userDidTapUndoLastAction`, the primary
 * action on the Active Toast a completion raises.
 *
 * The row returns to `pending` and its completion timestamp is cleared, which
 * is what takes it out of Completed Today, back into its actionable lane, and
 * out of the ring's numerator — the exact inverse of `withOptimisticallyCompleted`.
 * `due` is untouched: undoing a completion is not a reschedule.
 */
export const reopenEndeavorThunk = createAsyncThunk<
  Result<Endeavor, DoException>,
  { endeavorId: string; now: Date },
  { extra: ThunkExtra }
>('do/onEndeavorReopenCompleted', async ({ endeavorId, now }, api) =>
  mutateAndRefetch(
    {
      endeavorId,
      now,
      extra: api.extra,
      dispatch: api.dispatch,
      notFound: () => DoExceptions.endeavorNotFound(endeavorId),
      failed: (reason) =>
        DoExceptions.unknown(`Couldn't undo that completion: ${reason}`),
    },
    (endeavor) => ({
      endeavor: {
        ...endeavor,
        status: EndeavorStatus.pending,
        completed: null,
      },
    }),
  ),
)

/**
 * **Delete** — the soft delete the store already owns.
 *
 * `softDelete` stamps the tombstone and marks the row dirty, so a later push
 * can still carry the removal to the cloud. A hard delete here would lose that
 * and the row would return on the next pull.
 */
export const deleteEndeavorThunk = createAsyncThunk<
  Result<string, DoException>,
  { endeavorId: string; now: Date },
  { extra: ThunkExtra }
>(
  'do/onEndeavorDeleteCompleted',
  async ({ endeavorId, now }, { extra, dispatch }) => {
    try {
      await extra.localStore.endeavors.softDelete(endeavorId, now.getTime())
      return ok(endeavorId)
    } catch (error) {
      return err(
        DoExceptions.unknown(
          `Couldn't delete that endeavor: ${messageOf(error)}`,
        ),
      )
    } finally {
      // Awaited for the ordering reason `mutateAndRefetch` states above.
      await dispatch(fetchDoEndeavorsThunk({ now }))
    }
  },
)
