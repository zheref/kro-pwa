/**
 * The Plan LIST destination's derived reads (`RC-5`, `RC-20`) — the port of
 * `allEndeavorsForListViewSelector` and `groupedPlanListSectionsSelector`.
 *
 * ## Why a second `…Selectors.ts`, and why it lives here
 *
 * `PlanSelectors.ts` belongs to KC-IS-#18's file lane; this child's lane is
 * `pages/{list,matrix,picker,visibility}/**`. The file name still ends in
 * `Selectors.ts`, which is what `RC-5` and `check-uzf-boundaries.mjs` actually
 * require, and every export below is a `createSelector` over `RootState` and
 * nothing else. Folding these into the feature's own Selectors file is a
 * one-move follow-up for whichever child next owns it — named in the PR body.
 *
 * ## The sort and the grouping are PREFERENCES, read through the settings slice
 *
 * Canon holds `listSort` / `listGrouping` on `PlanFeature.State`, loaded at
 * `.started` from the preferences provider (`provider.pick(.planListSort)`).
 * `PlanState` has no such field yet — `onPlanPreferencesLoaded` carries only
 * `dayViewRange` and `showCompletedInTimeline` — so the two are read where they
 * are actually stored on this stack: the settings snapshot, through the
 * settings feature's own exported Selector. That is the cross-slice route
 * `RC-20` sanctions (composed at the root, never by reading another slice's
 * shape), and `settingValueIn` already falls back to the option's declared
 * default, so an unloaded snapshot yields canon's `time` / `none` rather than
 * an undefined mode. Promoting the pair onto `PlanState` is #18's to do.
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
import type {
  Endeavor,
  EndeavorCapabilities,
  PlanListGrouping,
  PlanListSort,
} from '@kro/core'
import {
  PlanListGrouping as Grouping,
  PlanListSort as Sort,
  hasBeenCompleted,
  resolveEndeavorCapabilities,
  planListGroupingOption,
  planListSortOption,
  planListGroupings,
  planListSorts,
} from '@kro/core'
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../../../library/store'
import {
  selectSettingValues,
  settingValueIn,
} from '../../../settings/SettingsSelectors'
import { isSamePlanDay } from '../../PlanCalendar'
import {
  selectPlanMatrixEndeavors,
  selectPlanNow,
  selectPlanSelectedDate,
  selectPlanTimelineEvents,
  selectPlanVista,
} from '../../PlanSelectors'
import { type PlanListSection, planListSections, planListSorted } from './planListModel'

/** The `showCompletedInTimeline` preference — canon applies it to both canvases. */
const selectShowCompleted = (state: RootState): boolean =>
  state.plan.showCompletedInTimeline

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
    selectShowCompleted,
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
 * set with its flag-gated bindings dropped.
 *
 * `.planDay` declares Start Session (leading swipe), Delete (trailing swipe),
 * both again in the context menu, and a whole-row `viewDetail` tap that
 * `requires: 'endeavorDetail'` — a flag the shipping baseline holds **off**
 * while iOS dark-launches Detail. `resolveEndeavorCapabilities`' own doc names
 * this call shape: *"until it lands a caller can pass `() => false` for the
 * `statusQuoSet` baseline of a dark-launched flag."*
 *
 * Detail is still reachable, because the row carries a labelled `Open` control
 * outside the gesture surface — the same answer Find gave to the same flag,
 * and the reason the gate is not weakened here. Resolving the flag for real
 * needs the registry Producer Find dispatches (`resolveCapabilityFlagsThunk`),
 * which writes into the Find slice; giving Plan its own is a cross-lane
 * follow-up named in the PR body.
 */
export const selectPlanRowCapabilities = createSelector(
  [selectPlanVista],
  (vista): EndeavorCapabilities =>
    resolveEndeavorCapabilities(vista.capabilities, () => false),
)
