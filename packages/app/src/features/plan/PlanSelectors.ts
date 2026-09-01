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
  type DayViewRange,
  type Endeavor,
  type EndeavorsVista,
  type PlanListGrouping,
  type PlanListSort,
  DayViewRange as Range,
  EndeavorsVistas,
  PlanListGrouping as Grouping,
  PlanListSort as Sort,
  applyLens,
  dayViewRangeHours,
  dayViewRanges,
  hasBeenCompleted,
  lensApplyingSnapshot,
  makeEndeavorsLensSnapshot,
  makeReconciliationContext,
  type EndeavorCapabilities,
  planDayViewRangeOption,
  planListGroupingOption,
  planListGroupings,
  planListSortOption,
  planListSorts,
  planShowCompletedInTimelineOption,
  reconcile,
  resolveEndeavorCapabilities,
  vistaWithLens,
} from '@kro/core'
import { createSelector } from '@reduxjs/toolkit'
import {
  selectSettingValues,
  settingValueIn,
} from '../settings/SettingsSelectors'
import type { RootState } from '../../library/store'
import { isSamePlanDay, planDayKey } from './PlanCalendar'
import { planEventsForDay } from './PlanDayCache'
import {
  timelineEditPreview,
  timelineEventsWithEditPreview,
} from './PlanEditSession'
import { planMatrixItems, planMatrixPickerCandidates } from './PlanMatrix'
import {
  type PlanListSection,
  planListSections,
  planListSorted,
} from './pages/list/planListModel'
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

// ------------------------------------------------------- the four preferences

/**
 * Plan's four preferences, read from the ONE place they are stored.
 *
 * Canon holds `dayViewRange`, `showCompletedInTimeline`, `listSort` and
 * `listGrouping` on `PlanFeature.State`, loaded at `.started` from the
 * preferences provider. This stack stores every preference in the settings
 * slice instead, behind `localStore.preferences` — that divergence predates
 * Plan and is not Plan's to re-litigate.
 *
 * Two of the four USED to be mirrored onto `PlanState` anyway, and the mirror
 * was never filled: `onPlanPreferencesLoaded` had no dispatcher anywhere in the
 * repo, so `dayViewRange` sat at `full` and `showCompletedInTimeline` at `true`
 * for the life of the app no matter what the user chose in Settings. KC-IS-#71
 * item 19 resolves the pair the other way from the way the issue proposed —
 * by deleting the mirror rather than growing it — because a second copy of a
 * preference needs a sync path, and the sync path is exactly what was missing.
 *
 * `settingValueIn` falls back to the option's declared default, so an unloaded
 * snapshot yields canon's own `full` / `true` / `time` / `none` rather than an
 * undefined mode. Composing the two slices at the root is the cross-slice route
 * `RC-20` sanctions.
 */

/** The `plan.dayViewRange` preference, or the option's own default. */
export const selectPlanDayViewRange = createSelector(
  [selectSettingValues],
  (values): DayViewRange => {
    const raw = settingValueIn(values, planDayViewRangeOption)
    return dayViewRanges.find((candidate) => candidate === raw) ?? Range.full
  },
)

/** The `plan.showCompletedInTimeline` preference, or its default (`true`). */
export const selectPlanShowsCompleted = createSelector(
  [selectSettingValues],
  (values): boolean => {
    const raw = settingValueIn(values, planShowCompletedInTimelineOption)
    return typeof raw === 'boolean' ? raw : true
  },
)

/** `PlanListSort(rawValue:) ?? .time` — canon's own fallback, term for term. */
export const selectPlanListSort = createSelector(
  [selectSettingValues],
  (values): PlanListSort => {
    const raw = settingValueIn(values, planListSortOption)
    return planListSorts.find((candidate) => candidate === raw) ?? Sort.time
  },
)

/** `PlanListGrouping(rawValue:) ?? .none`. */
export const selectPlanListGrouping = createSelector(
  [selectSettingValues],
  (values): PlanListGrouping => {
    const raw = settingValueIn(values, planListGroupingOption)
    return (
      planListGroupings.find((candidate) => candidate === raw) ?? Grouping.none
    )
  },
)

// ------------------------------------------------------------------ bands

/**
 * The half-open hour band the timeline renders, from the `plan.dayViewRange`
 * preference — Full `0–24`, Waking `6–24`, Business `8–20`.
 */
export const selectPlanHourBand = createSelector(
  [selectPlanDayViewRange],
  dayViewRangeHours,
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
  [selectPlanSlice, selectPlanVista, selectPlanShowsCompleted],
  (slice, vista, showsCompleted): readonly Endeavor[] => {
    const source = planEventsForDay({
      day: slice.selectedDate,
      authoritativeDayKey:
        slice.dayLoad.kind === 'loaded' ? slice.dayLoad.dayKey : null,
      authoritativeEvents:
        slice.dayLoad.kind === 'loaded' ? slice.dayLoad.events : [],
      cache: slice.preloadedDays,
    })

    const visible = applyLens(vista.lens, source, slice.now).filter(
      (event) => showsCompleted || !hasBeenCompleted(event),
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

// ------------------------------------------------------------- the list

/**
 * The Plan LIST destination's derived reads — the port of
 * `allEndeavorsForListViewSelector` and `groupedPlanListSectionsSelector`.
 *
 * They lived in `pages/list/PlanListSelectors.ts` until KC-IS-#71 item 23,
 * because this file was a closed lane while KC-IS-#20 was in flight.
 *
 * ## The list is the timeline's day PLUS the day's untimed rows
 *
 * Canon's list selector is explicit: the timed set is exactly what the timeline
 * draws, and the untimed set is *"tasks/habits/reminders due that day"* with no
 * `start` — which the day's own fetch cannot return, because
 * `fetchPlanHostRange` documents that *"Endeavors with no `start` are not
 * returned: the timeline is start-driven"*. The pool that does hold them is the
 * one `loadPlanMatrixThunk` reads (the whole local mirror), which is why the
 * Page dispatches that load for the list destination too. The two sets are then
 * sorted ONCE together, as canon sorts them, so a Title or Priority order
 * interleaves them instead of concatenating two pre-sorted runs.
 */

/**
 * The untimed half: rows with no `start`, due on the selected day, that the
 * timed half does not already carry.
 *
 * The completed filter is the same preference the timeline applies, so the two
 * canvases never disagree about whether a finished item is on the day.
 */
const selectPlanListUntimedEndeavors = createSelector(
  [
    selectPlanMatrixEndeavors,
    selectPlanTimelineEvents,
    selectPlanSelectedDate,
    selectPlanShowsCompleted,
  ],
  (pool, timed, selectedDate, showCompleted): readonly Endeavor[] => {
    const timedIds = new Set(timed.map((endeavor) => endeavor.id))
    return pool.filter((endeavor) => {
      if (timedIds.has(endeavor.id)) return false
      if (endeavor.start !== null) return false
      const due = endeavor.due
      if (due === null) return false
      if (!isSamePlanDay(due, selectedDate)) return false
      return showCompleted || !hasBeenCompleted(endeavor)
    })
  },
)

/**
 * `allEndeavorsForListViewSelector` — the combined set in the active order.
 *
 * The timed half arrives already narrowed by the lens (`selectPlanTimelineEvents`
 * applies the vista), so the visibility sheet governs the list exactly as it
 * governs the timeline, without this selector restating a single filter term.
 */
export const selectPlanListEndeavors = createSelector(
  [
    selectPlanTimelineEvents,
    selectPlanListUntimedEndeavors,
    selectPlanListSort,
    selectPlanNow,
  ],
  (timed, untimed, sort, now): readonly Endeavor[] =>
    planListSorted([...timed, ...untimed], sort, now),
)

/** `groupedPlanListSectionsSelector`, plus the `.none` temporal presentation. */
export const selectPlanListSections = createSelector(
  [selectPlanListEndeavors, selectPlanListGrouping, selectPlanNow],
  (endeavors, grouping, now): readonly PlanListSection[] =>
    planListSections({ endeavors, grouping, now }),
)

/** Whether the list has anything to show — the empty state's gate. */
export const selectIsPlanListEmpty = createSelector(
  [selectPlanListEndeavors],
  (endeavors) => endeavors.length === 0,
)

/**
 * The row gestures a Plan list row affords — `.planDay`'s declared capability
 * set, resolved against the flags cached at `onViewLoaded`.
 *
 * `.planDay` declares Start Session (leading swipe), Delete (trailing swipe),
 * both again in the context menu, and a whole-row `viewDetail` tap that
 * `requires: 'endeavorDetail'`. The resolver used to be handed `() => false` —
 * `resolveEndeavorCapabilities`' own documented stand-in *"until it lands"* —
 * so the tap was refused whatever the registry said. `resolvePlanFlagsThunk`
 * lands it (KC-IS-#71 item 22): the answer is now the flag service's.
 *
 * The row still carries a labelled `Open` control outside the gesture surface,
 * because the shipping baseline holds `endeavorDetail` off while iOS
 * dark-launches Detail — the same answer Find gave to the same flag, and the
 * reason the gate is not weakened here.
 */
export const selectPlanRowCapabilities = createSelector(
  [selectPlanVista, selectPlanSlice],
  (vista, slice): EndeavorCapabilities =>
    resolveEndeavorCapabilities(vista.capabilities, (flag) =>
      slice.enabledCapabilityFlags.includes(flag),
    ),
)
