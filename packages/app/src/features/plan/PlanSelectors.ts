/**
 * Plan's Selectors (`RC-5`, `RC-20`) — every derived read the surface needs,
 * built with `createSelector` over `RootState` and nothing else.
 *
 * Three of these carry an acceptance criterion on their own:
 *
 * - `selectIsPlanActivityIndicated` is **the** single activity signal. Canon:
 *   *"the single activity signal the Plan toolbar's refresh control renders,
 *   whichever piece of the day is loading: a manual refresh, Main's load, or a
 *   day's read-ahead window."* Because each of the three markers settles on
 *   success **and** on failure, this returns to `false` when the last one
 *   finishes, whatever the outcome.
 * - `selectPlanTimelineEvents` is the one place the authoritative day and the
 *   preload buffer meet, and it is a *selection*, never a merge.
 * - `selectPlanMatrixItems` re-reconciles at the presentation boundary, as
 *   canon does, because *"Plan can receive successive host snapshots; neither
 *   matrix surface should expose a transient stale representation."*
 */
import {
  type Endeavor,
  type EndeavorsVista,
  EndeavorsVistas,
  applyLens,
  dayViewRangeHours,
  hasBeenCompleted,
  lensApplyingSnapshot,
  makeEndeavorsLensSnapshot,
  makeReconciliationContext,
  reconcile,
  vistaWithLens,
} from '@kro/core'
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../library/store'
import { isSamePlanDay, planDayKey } from './PlanCalendar'
import { planEventsForDay } from './PlanDayCache'
import {
  timelineEditPreview,
  timelineEventsWithEditPreview,
} from './PlanEditSession'
import { planMatrixItems, planMatrixPickerCandidates } from './PlanMatrix'
import {
  isPlanFabAvailable,
  isPlanFabGlowActive,
  planDayPickerDates,
  planViewModeSupportsQuickCreate,
} from './PlanNavigation'
import { PlanViewMode } from './PlanNavigation'
import { timelinePlacements } from './TimelineLayout'
import { timelineSlotCount } from './TimelineSlots'

const selectPlanSlice = (state: RootState) => state.plan

// -------------------------------------------------------------- primitives

export const selectPlanNow = createSelector(
  [selectPlanSlice],
  (slice) => slice.now,
)

export const selectPlanSelectedDate = createSelector(
  [selectPlanSlice],
  (slice) => slice.selectedDate,
)

export const selectPlanViewMode = createSelector(
  [selectPlanSlice],
  (slice) => slice.viewMode,
)

// ------------------------------------------------------------- navigation

/** Whether the app-wide quick-action button belongs on screen in this mode. */
export const selectIsPlanFabAvailable = createSelector(
  [selectPlanViewMode],
  isPlanFabAvailable,
)

/** Whether the FAB's rotating glow should run. */
export const selectIsPlanFabGlowActive = createSelector(
  [selectPlanViewMode],
  isPlanFabGlowActive,
)

/** The five day chips, in order. Falls back to today's batch before first paint. */
export const selectPlanDayPickerDates = createSelector(
  [selectPlanSlice],
  (slice) => planDayPickerDates(slice.dayPickerCenter ?? slice.now),
)

/** Whether the selected day is today — the "now" indicator's gate. */
export const selectIsPlanShowingToday = createSelector(
  [selectPlanSlice],
  (slice) => isSamePlanDay(slice.selectedDate, slice.now),
)

// ------------------------------------------------------------------ bands

/**
 * The half-open hour band the timeline renders, from the `plan.dayViewRange`
 * preference — Full `0–24`, Waking `6–24`, Business `8–20`.
 */
export const selectPlanHourBand = createSelector([selectPlanSlice], (slice) =>
  dayViewRangeHours(slice.dayViewRange),
)

/** How many quarter-hour quick-create slots cover the rendered band. */
export const selectPlanSlotCount = createSelector(
  [selectPlanHourBand],
  timelineSlotCount,
)

// ------------------------------------------------------------------ vista

/**
 * The live `.planDay` vista: the registry's query and capabilities, carrying
 * the user's restored visibility choices.
 *
 * State stores the snapshot's plain subset (see `PlanState`); the real lens is
 * materialised here so `sort` and `exposes` keep coming from the vista, exactly
 * as `lensApplyingSnapshot` guarantees.
 */
export const selectPlanVista = createSelector(
  [selectPlanSlice],
  (slice): EndeavorsVista =>
    vistaWithLens(
      EndeavorsVistas.planDay,
      lensApplyingSnapshot(
        EndeavorsVistas.planDay.lens,
        makeEndeavorsLensSnapshot({
          hiddenKinds: slice.visibility.hiddenKinds,
          hiddenHosts: slice.visibility.hiddenHosts,
          hiddenStatuses: slice.visibility.hiddenStatuses,
          hiddenComputedStates: slice.visibility.hiddenComputedStates,
          hiddenCalendarIds: slice.visibility.hiddenCalendarIds,
          searchQuery: slice.visibility.searchQuery,
          showArchived: slice.visibility.showArchived,
          grouping: slice.visibility.grouping,
        }),
      ),
    ),
)

// -------------------------------------------------------------- the day

/** The authoritative day's events, or `[]` while it is idle/loading/failed. */
export const selectPlanAuthoritativeEvents = createSelector(
  [selectPlanSlice],
  (slice): readonly Endeavor[] =>
    slice.dayLoad.kind === 'loaded' ? slice.dayLoad.events : [],
)

/** The typed exception the day is in, or `null`. */
export const selectPlanDayException = createSelector(
  [selectPlanSlice],
  (slice) => (slice.dayLoad.kind === 'failed' ? slice.dayLoad.exception : null),
)

/**
 * The events for the **selected** day: the authoritative array when the
 * selected day is the authoritative one, the buffer otherwise. Narrowed by the
 * lens, filtered by the `showCompletedInTimeline` preference, sorted by start,
 * and with the edit session's draft substituted in so the reflow preview and
 * the committed result cannot disagree.
 */
export const selectPlanTimelineEvents = createSelector(
  [selectPlanSlice, selectPlanVista],
  (slice, vista): readonly Endeavor[] => {
    const source = planEventsForDay({
      day: slice.selectedDate,
      authoritativeDayKey:
        slice.dayLoad.kind === 'loaded' ? slice.dayLoad.dayKey : null,
      authoritativeEvents:
        slice.dayLoad.kind === 'loaded' ? slice.dayLoad.events : [],
      cache: slice.preloadedDays,
    })

    const visible = applyLens(vista.lens, source, slice.now).filter(
      (event) => slice.showCompletedInTimeline || !hasBeenCompleted(event),
    )

    const previewed = timelineEventsWithEditPreview(visible, slice.editSession)

    // Always chronological, whatever the list sort is: the hour grid positions
    // cards by `start` and canon documents the timeline's input as pre-sorted.
    return [...previewed].sort((left, right) => {
      const leftStart = left.start?.getTime() ?? Number.POSITIVE_INFINITY
      const rightStart = right.start?.getTime() ?? Number.POSITIVE_INFINITY
      if (leftStart !== rightStart) return leftStart - rightStart
      if (left.title !== right.title) return left.title < right.title ? -1 : 1
      return left.id < right.id ? -1 : left.id > right.id ? 1 : 0
    })
  },
)

/** The placed rectangles the timeline canvas draws, band-anchored. */
export const selectPlanTimelinePlacements = createSelector(
  [selectPlanTimelineEvents, selectPlanSelectedDate, selectPlanHourBand],
  (events, selectedDate, band) =>
    timelinePlacements(events, {
      on: selectedDate,
      startHour: band.start,
    }),
)

// ------------------------------------------------------------- quick create

/**
 * Whether pressing empty canvas may seed an event: the flag is on, the mode has
 * an hour canvas, and no card is armed for editing.
 */
export const selectIsPlanQuickCreateAvailable = createSelector(
  [selectPlanSlice],
  (slice) =>
    slice.isQuickEventCreationEnabled &&
    planViewModeSupportsQuickCreate(slice.viewMode) &&
    slice.editSession === null,
)

/** The uncommitted hour-long ghost, or `null`. */
export const selectPlanQuickCreateDraft = createSelector(
  [selectPlanSlice],
  (slice) => slice.quickCreate,
)

// --------------------------------------------------------------- edit mode

/** The armed card's id, or `null` when edit mode is off. */
export const selectPlanEditingEndeavorId = createSelector(
  [selectPlanSlice],
  (slice) => slice.editSession?.endeavorId ?? null,
)

/** The times the armed card currently shows, or `null`. */
export const selectPlanEditPreview = createSelector(
  [selectPlanSlice],
  (slice) =>
    slice.editSession === null ? null : timelineEditPreview(slice.editSession),
)

// ---------------------------------------------------------------- activity

/**
 * **The** activity signal — one boolean covering a manual refresh, the
 * app-wide load and the read-ahead window, returning to `false` only when the
 * last of them finishes, including on failure and on an empty result.
 */
export const selectIsPlanActivityIndicated = createSelector(
  [selectPlanSlice],
  (slice) =>
    slice.activity.isRefreshing ||
    slice.activity.isAppLoading ||
    slice.activity.preloadCenterDayKey !== null,
)

/**
 * Canon's `guard !state.isRefreshing` on the refresh action, as a read the
 * surface performs before dispatching rather than an arm that re-flips a flag
 * the thunk's `.pending` already owns.
 */
export const selectCanRefreshPlan = createSelector(
  [selectPlanSlice],
  (slice) => !slice.activity.isRefreshing,
)

/** Whether the installed buffer is the one centred on the selected day. */
export const selectIsPlanPreloadCurrent = createSelector(
  [selectPlanSlice],
  (slice) => slice.preloadedCenterDayKey === planDayKey(slice.selectedDate),
)

// ----------------------------------------------------------------- matrix

/**
 * The matrix's rows, reconciled at the presentation boundary — canon's
 * `matrixEndeavorsSelector`. `now` is threaded into the context so the pass
 * stays pure and deterministic.
 */
export const selectPlanMatrixEndeavors = createSelector(
  [selectPlanSlice],
  (slice): readonly Endeavor[] =>
    slice.matrixLoad.kind === 'loaded'
      ? reconcile(
          slice.matrixLoad.endeavors,
          makeReconciliationContext({ now: slice.now }),
        )
      : [],
)

/**
 * The cards on the priority matrix: open, admissible by **resolved** kind, and
 * carrying both a due date and a value. The quadrant is computed, never read.
 */
export const selectPlanMatrixItems = createSelector(
  [selectPlanMatrixEndeavors, selectPlanNow],
  (endeavors, now) => planMatrixItems(endeavors, { now }),
)

/**
 * Everything already fetched that a user may drop into a quadrant. Unlike the
 * items above this does **not** require a due date and value — assigning them
 * is what the picker is for.
 */
export const selectPlanMatrixPickerCandidates = createSelector(
  [selectPlanMatrixEndeavors, selectPlanNow],
  (endeavors, now) => planMatrixPickerCandidates(endeavors, { now }),
)

/** Whether the matrix mode has anything to show yet. */
export const selectIsPlanMatrixEmpty = createSelector(
  [selectPlanMatrixItems],
  (items) => items.length === 0,
)

/** Whether the surface is currently on the matrix destination. */
export const selectIsPlanShowingMatrix = createSelector(
  [selectPlanViewMode],
  (mode) => mode === PlanViewMode.priorityMatrix,
)
