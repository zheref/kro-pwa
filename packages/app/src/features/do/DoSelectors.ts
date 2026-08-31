/**
 * The Do surface's Selectors (`RC-5`, `RC-20`) — canon's `DoSelectors.swift`.
 *
 * Every derived read the surface performs lives here, built with
 * `createSelector` over `RootState` alone. None of them reads a clock: the
 * reducer parked the instant it last partitioned against in `clockAnchor`, and
 * the clock-dependent selectors below read it as ordinary state. That is
 * canon's own arrangement, for canon's own reason — a pure selector cannot
 * consult a clock, and a view must not either.
 *
 * **The rings read the raw channels, never a lane.** `applyRegroup` bakes the
 * visibility selection into every lane, so a ring derived from one would jump
 * whenever the user hid a kind — *"reporting the filter, not the day"*. The
 * two ring selectors below take `tasks` / `reminders` / `habits` and nothing
 * else, which makes that guarantee structural rather than remembered.
 */
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../library/store'
import type { DoException } from './DoException'
import type { DoState } from './DoFeature'
import { centredFeaturedWindow } from './DoFeaturedNow'
import { areDoRingsVisible, habitsRing, tasksRing } from './DoRings'
import {
  type DoLanes,
  doClearExpiredTargets,
  nextActionableCardKey,
} from './DoRules'
import { areDoSuggestionsVisible } from './DoSuggestions'

const selectDoSlice = (state: RootState): DoState => state.do

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export const selectIsDoLoading = createSelector(
  [selectDoSlice],
  (slice) => slice.load.kind === 'loading',
)

export const selectDoException = createSelector(
  [selectDoSlice],
  (slice): DoException | null =>
    slice.load.kind === 'failed' ? slice.load.exception : null,
)

/**
 * `hasNoEndeavorsGloballySelector` — the true empty state, told apart from a
 * day whose lanes are empty only because everything in it is filtered or done.
 */
export const selectHasNoDoEndeavors = createSelector(
  [selectDoSlice],
  (slice) =>
    slice.tasks.length === 0 &&
    slice.reminders.length === 0 &&
    slice.events.length === 0,
)

// ---------------------------------------------------------------------------
// Lanes
// ---------------------------------------------------------------------------

export const selectDoLanes = createSelector(
  [selectDoSlice],
  (slice): DoLanes => slice.lanes,
)

/**
 * The featured lane as the current width can show it: the centred 3/5/7/9
 * window of the hero-centred arrangement.
 *
 * Narrowing drops flankers from both ends at once, so the hero never moves and
 * a resize *"uses wider windows to expose more ranked work without displacing
 * the central hero"*.
 */
export const selectDoFeaturedNowLane = createSelector(
  [selectDoSlice],
  (slice) => centredFeaturedWindow(slice.lanes.featuredNow, slice.featuredCapacity),
)

/**
 * The bell badge — `overdueTasks.count + expiredTasks.count`, i.e. *"all tasks
 * that have missed their deadline"*.
 */
export const selectDoNotificationBadgeCount = createSelector(
  [selectDoLanes],
  (lanes) => lanes.overdue.length + lanes.expired.length,
)

/**
 * The header's "N left today" — `overdue + expired + now + next + anytime`.
 *
 * Neither the featured lane nor Completed Today contributes: featured is a
 * re-presentation of cards already counted in the others, and completed work
 * is by definition not left.
 */
export const selectDoRemainingTodayCount = createSelector(
  [selectDoLanes],
  (lanes) =>
    lanes.overdue.length +
    lanes.expired.length +
    lanes.now.length +
    lanes.next.length +
    lanes.anytime.length,
)

// ---------------------------------------------------------------------------
// Day-progress rings
// ---------------------------------------------------------------------------

/**
 * The inner emerald ring, evaluated at the reducer's last clock reading.
 *
 * `null` — no ring drawn — both when nothing is expected today and before the
 * first regroup has stamped an instant to classify against.
 */
export const selectDoTasksRing = createSelector([selectDoSlice], (slice) =>
  slice.clockAnchor === null
    ? null
    : tasksRing(
        { tasks: slice.tasks, reminders: slice.reminders },
        slice.clockAnchor,
      ),
)

/** The outer gold ring, evaluated at the reducer's last clock reading. */
export const selectDoHabitsRing = createSelector([selectDoSlice], (slice) =>
  slice.clockAnchor === null
    ? null
    : habitsRing(slice.habits, slice.clockAnchor),
)

/** Whether the readout is on screen at all — the flag AND'd with bulk mode. */
export const selectAreDoRingsVisible = createSelector(
  [selectDoSlice],
  (slice) =>
    areDoRingsVisible({
      activityRingsEnabled: slice.preferences.activityRingsEnabled,
      isInMarkCompleteMode: slice.isInMarkCompleteMode,
    }),
)

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

export const selectDoSuggestions = createSelector(
  [selectDoSlice],
  (slice) => slice.suggestions,
)

/** `showSuggestions` — the preference AND'd with "there is something to show". */
export const selectAreDoSuggestionsVisible = createSelector(
  [selectDoSlice],
  (slice) =>
    areDoSuggestionsVisible({
      showSuggestionsPreference: slice.preferences.showSuggestions,
      suggestions: slice.suggestions,
    }),
)

// ---------------------------------------------------------------------------
// Auto-advance and Clear Expired
// ---------------------------------------------------------------------------

/**
 * `nextActionableCardKeySelector` — where focus would land if the prepared
 * card were completed right now, or `null` when nothing is left.
 *
 * Exposed as well as used by the Shifter so the surface can label the
 * affordance without predicting the order itself.
 */
export const selectDoNextActionableCardKey = createSelector(
  [selectDoLanes],
  (lanes) => nextActionableCardKey(lanes),
)

/**
 * What **Clear Expired** would close.
 *
 * Read from the raw task channel and the parked instant, never from the
 * Expired lane: a user who has hidden the Expired state still clears
 * everything the action names. The Producer recomputes this from a fresh read
 * before it mutates anything; this selector exists so the surface can label
 * the action and hide it when there is nothing to clear.
 */
export const selectDoClearExpiredTargets = createSelector(
  [selectDoSlice],
  (slice) =>
    slice.clockAnchor === null
      ? []
      : doClearExpiredTargets(slice.tasks, slice.clockAnchor),
)
