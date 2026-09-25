/**
 * Day Timeline Selectors (`RC-5`, `UZF-11`).
 *
 * "Today" is `state.now`, stamped by the Page — never `Date.now()`. Ordering
 * mirrors `selectPlanTimelineEvents` (start, then title, then id) WITHOUT
 * Plan's lens, visibility or edit preview: the pane has none of those. Plan
 * shows completed items by default, so nothing is filtered out here either.
 *
 * The hour band is not this slice's: the Page reads Plan's
 * `selectPlanHourBand` and hands it to `selectDayTimelinePlacements`, so the
 * user's day-range preference is identical to the Plan tab's.
 */
import type { Endeavor } from '@kro/core'
import { createSelector } from '@reduxjs/toolkit'
import { planDayKey, startOfPlanDay } from '../plan/PlanCalendar'
import { type PlacedEvent, timelinePlacements } from '../plan/TimelineLayout'
import type { TimelineHourBand } from '../plan/TimelineSlots'
import { dayTimelineExceptionCopy } from './DayTimelineException'
import type { DayTimelineState } from './DayTimelineFeature'

export interface DayTimelineRoot {
  readonly dayTimeline: DayTimelineState
}

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

/** The placed rectangles for `band` — Plan's own pure layout pass. */
export const selectDayTimelinePlacements = createSelector(
  [
    selectDayTimelineEvents,
    selectDayTimelineDay,
    (_state: DayTimelineRoot, band: TimelineHourBand) => band,
  ],
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
