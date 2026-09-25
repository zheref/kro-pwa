/**
 * Day Timeline Selectors (`RC-5`, `UZF-11`).
 *
 * "Today" is `state.now`, stamped by the Page — never `Date.now()`. Ordering
 * mirrors `selectPlanTimelineEvents` (start, then title, then id) WITHOUT
 * Plan's lens, visibility or edit preview: the pane has none of those. Plan
 * shows completed items by default, so nothing is filtered out here either.
 *
 * The hour band is not this slice's: `selectTodayTimelinePlacements` composes
 * Plan's `selectPlanHourBand` at the root, so the user's day-range preference
 * is identical to the Plan tab's.
 */
import type { Endeavor } from '@kro/core'
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../library/store'
import { planDayKey, startOfPlanDay } from '../../library/plan/PlanCalendar'
import { selectPlanHourBand } from '../plan/PlanSelectors'
import {
  type PlacedEvent,
  timelinePlacements,
} from '../../library/plan/TimelineLayout'
import { dayTimelineExceptionCopy } from './DayTimelineException'
import type { DayTimelineState } from './DayTimelineFeature'

export type DayTimelineRoot = Pick<RootState, 'dayTimeline'>

const selectSlice = (state: DayTimelineRoot): DayTimelineState =>
  state.dayTimeline

export const selectDayTimelineNow = createSelector(
  [selectSlice],
  (slice) => slice.now,
)

/** Midnight of `now` as a number, so the Date below survives clock ticks. */
const selectDayStartMillis = createSelector(
  [selectDayTimelineNow],
  (now): number | null => (now === null ? null : startOfPlanDay(now).getTime()),
)

/** Start of today; `null` before the pane stamped a clock. */
export const selectDayTimelineDay = createSelector(
  [selectDayStartMillis],
  (millis): Date | null => (millis === null ? null : new Date(millis)),
)

/** Today's key — a stable string the Page keys its load effect on. */
export const selectDayTimelineDayKey = createSelector(
  [selectDayTimelineDay],
  (day): string | null => (day === null ? null : planDayKey(day)),
)

const NO_EVENTS: readonly Endeavor[] = []

/**
 * Today's timed events, chronological. A loaded day that is no longer today
 * (the clock crossed midnight before the reload landed) shows nothing rather
 * than yesterday's cards under today's now line.
 */
export const selectDayTimelineEvents = createSelector(
  [selectSlice, selectDayTimelineDayKey],
  (slice, dayKey): readonly Endeavor[] => {
    if (slice.load.kind !== 'loaded' || slice.load.dayKey !== dayKey) {
      return NO_EVENTS
    }
    return [...slice.load.events].sort((left, right) => {
      const leftStart = left.start?.getTime() ?? Number.POSITIVE_INFINITY
      const rightStart = right.start?.getTime() ?? Number.POSITIVE_INFINITY
      if (leftStart !== rightStart) return leftStart - rightStart
      if (left.title !== right.title) return left.title < right.title ? -1 : 1
      return left.id < right.id ? -1 : left.id > right.id ? 1 : 0
    })
  },
)

const NO_PLACEMENTS: readonly PlacedEvent[] = []

/**
 * Today's placed rectangles, anchored to Plan's hour band — a root Selector
 * (`RC-20`): the band is Plan's `selectPlanHourBand`, composed here rather
 * than threaded through the Page, so the pane honours the same day-range
 * preference as the Plan tab.
 */
export const selectTodayTimelinePlacements = createSelector(
  [selectDayTimelineEvents, selectDayTimelineDay, selectPlanHourBand],
  (events, day, band): readonly PlacedEvent[] =>
    day === null
      ? NO_PLACEMENTS
      : timelinePlacements(events, { on: day, startHour: band.start }),
)

/** The one-line failure sentence, or `null` when nothing failed. */
export const selectDayTimelineFailureCopy = createSelector(
  [selectSlice],
  (slice): string | null =>
    slice.load.kind === 'failed'
      ? dayTimelineExceptionCopy(slice.load.exception)
      : null,
)
