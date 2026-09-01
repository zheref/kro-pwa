/**
 * Plan's navigation chrome as logic: the three view modes with their per-mode
 * FAB rules, and the five-day picker's batch arithmetic.
 *
 * Ported from `KroUI/Plan/PlanViewModePicker.swift` (the mode enum and its
 * circular ordering), `Kro/Application/Main/MainScreen.swift` (the FAB rules)
 * and `KroUI/Plan/TimelineDayView.swift`'s `datePicker` /
 * `ensureSelectedDateIsVisible` (the picker).
 *
 * ## The FAB rule is a real product decision, not a layout accident
 *
 * Canon: *"the tab-aware quick-action button […] stands down over Plan's
 * priority matrix"*, because *"the matrix hides the FAB outright (each quadrant
 * carries its own add actions), so a glow there would be lighting up
 * nothing."* Two consequences travel together — the button and its rotating
 * glow — so both are answered here rather than being re-derived by whichever
 * surface happens to need one of them.
 *
 * ## The picker keeps the selection visible without re-centring on it
 *
 * The batch of five days does **not** follow the selected day. Canon:
 * *"Today owns the center slot while it remains in the visible batch. The
 * selected date can occupy any slot; the batch shifts only after selection
 * moves beyond one of its two-day boundaries."* Stepping one day past the edge
 * shifts the batch by exactly one day, so the newly-selected day appears at the
 * edge that just revealed it rather than jumping to the middle — which is what
 * makes repeated "next day" taps read as a strip sliding under the selection.
 */
import { assertNever } from '@kro/core'
import { TIMELINE_DAY_PICKER_SPAN } from './PlanConstants'
import { addingPlanDays, planDayDistance, startOfPlanDay } from './PlanCalendar'

/** `PlanViewMode` — the destinations the Plan header's selector exposes. */
export const PlanViewMode = {
  timeline: 'timeline',
  list: 'list',
  priorityMatrix: 'priorityMatrix',
} as const

export type PlanViewMode = (typeof PlanViewMode)[keyof typeof PlanViewMode]

/** `PlanViewMode.allCases`, in canon declaration order — the carousel order. */
export const planViewModes: readonly PlanViewMode[] = [
  PlanViewMode.timeline,
  PlanViewMode.list,
  PlanViewMode.priorityMatrix,
]

/** `PlanViewMode(rawValue:)`. */
export const planViewModeFromRawValue = (raw: string): PlanViewMode | null =>
  planViewModes.find((mode) => mode === raw) ?? null

/** The accessibility label canon gives each mode. */
export const planViewModeLabel = (mode: PlanViewMode): string => {
  switch (mode) {
    case PlanViewMode.timeline:
      return 'Day View'
    case PlanViewMode.list:
      return 'List View'
    case PlanViewMode.priorityMatrix:
      return 'Priority Matrix'
    default:
      return assertNever(mode)
  }
}

/** Whether the mode renders the hour grid (as opposed to rows or quadrants). */
export const planViewModeUsesTimelineCanvas = (mode: PlanViewMode): boolean =>
  mode === PlanViewMode.timeline

/**
 * Whether the app-wide quick-action button belongs on screen while Plan shows
 * this mode. The matrix carries its own per-quadrant add actions, so the FAB
 * would be a second, ambiguous way to do the same thing.
 */
export const isPlanFabAvailable = (mode: PlanViewMode): boolean =>
  mode !== PlanViewMode.priorityMatrix

/**
 * Whether the FAB's rotating glow should run. Follows availability exactly —
 * a glow with no button behind it is *"lighting up nothing"* — and is answered
 * separately only because canon answers it at a separate call site.
 */
export const isPlanFabGlowActive = (mode: PlanViewMode): boolean =>
  isPlanFabAvailable(mode)

/**
 * Whether quick-create's press-to-create slots may be armed in this mode. Only
 * the timeline has an hour canvas to press.
 */
export const planViewModeSupportsQuickCreate = (mode: PlanViewMode): boolean =>
  mode === PlanViewMode.timeline

/**
 * The mode `steps` away around the circular selector. Negative steps go
 * backwards; the result always lands on a real mode.
 */
export const advancePlanViewMode = (
  mode: PlanViewMode,
  steps: number,
): PlanViewMode => {
  const index = planViewModes.indexOf(mode)
  if (index < 0) return planViewModes[0] as PlanViewMode
  const count = planViewModes.length
  const advanced = (((index + steps) % count) + count) % count
  return planViewModes[advanced] as PlanViewMode
}

// ------------------------------------------------------------- day picker

/**
 * The five days the picker shows for a given batch centre, ascending —
 * canon's `ForEach(-2...2)`.
 */
export const planDayPickerDates = (center: Date): readonly Date[] => {
  const day = startOfPlanDay(center)
  const dates: Date[] = []
  for (
    let offset = -TIMELINE_DAY_PICKER_SPAN;
    offset <= TIMELINE_DAY_PICKER_SPAN;
    offset += 1
  ) {
    dates.push(addingPlanDays(day, offset))
  }
  return dates
}

/**
 * `ensureSelectedDateIsVisible` — the batch centre after a selection change.
 *
 * A selection still inside the batch leaves the centre alone; one beyond an
 * edge shifts the centre by exactly enough to bring it back to that edge, so
 * the selected day lands at the boundary it crossed rather than in the middle.
 *
 * `currentCenter` is `null` before the picker has ever rendered; canon seeds it
 * from **today**, not from the selection, which is why `now` is a parameter.
 */
export const planDayPickerCenter = (params: {
  readonly currentCenter: Date | null
  readonly selectedDate: Date
  readonly now: Date
}): Date => {
  const center =
    params.currentCenter === null
      ? startOfPlanDay(params.now)
      : startOfPlanDay(params.currentCenter)
  const distance = planDayDistance(center, params.selectedDate)
  if (distance < -TIMELINE_DAY_PICKER_SPAN) {
    return addingPlanDays(center, distance + TIMELINE_DAY_PICKER_SPAN)
  }
  if (distance > TIMELINE_DAY_PICKER_SPAN) {
    return addingPlanDays(center, distance - TIMELINE_DAY_PICKER_SPAN)
  }
  return center
}
