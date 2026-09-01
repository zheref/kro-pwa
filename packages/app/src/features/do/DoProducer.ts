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
  doAutoAdvanceAfterCompleteOption,
  doNowThresholdHoursOption,
  doShowSuggestionsOption,
  endeavorFromRecord,
  endeavorRecordFromEndeavor,
  err,
  livingChildRecords,
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
