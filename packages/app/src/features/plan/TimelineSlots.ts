/**
 * Quick-create slot math — the port of `TimelineLayout`'s `slotCount` /
 * `slotHeightMultiple` / `slotStart` / `nearestSlot`, plus the uncommitted
 * ghost the timeline draws while the creation prompt is open.
 *
 * ## Why a slot's catchment is not one slot tall
 *
 * The canvas is covered by transparent quarter-hour press targets. If each
 * target were exactly one slot tall, a press would **floor** to the mark above
 * it and 12:23 would create a 12:15 event — a quarter hour away from where the
 * finger landed. Canon rounds to the *nearest* mark instead, and it does that
 * geometrically rather than with a coordinate: each target is shifted half a
 * slot so it **straddles** its own mark. Canon's own words:
 *
 * > Slots round to the *nearest* quarter hour rather than flooring to it, so a
 * > press at 12:23 seeds 12:30 — the boundary it is closest to. That makes each
 * > mark's catchment straddle it: half a slot either side. The first mark keeps
 * > only its trailing half (nothing precedes midnight) and the last absorbs the
 * > remainder of the day, so the heights still sum to `count` slots and cover
 * > the canvas exactly.
 *
 * Hence `0.5` for the first, `1.5` for the last, `1` for the rest —
 * `0.5 + (n − 2) + 1.5 = n`. That identity is what `slotHeightMultiples` and
 * its test exist to hold: change any of the three and the targets stop covering
 * the canvas.
 *
 * ## Slots carry their own time, so no coordinate is ever reported
 *
 * `timelineSlotStart` answers "what moment is slot *i*?" from the index alone.
 * Canon's reason: *"because each slot carries its own time, a press needs no
 * coordinate at all — which is what lets the gesture fire the instant it is
 * recognised instead of waiting for a location to be reported."* #19 wires the
 * gesture; the arithmetic is here.
 *
 * Everything here is gated on the `timelineQuickEventCreation` flag by its
 * caller — see `PlanSelectors.selectIsQuickCreateAvailable`. The math itself is
 * ungated so a test can exercise it without a flag service.
 */
import type { TimeIntervalSeconds } from '@kro/core'
import {
  TIMELINE_SLOTS_PER_HOUR,
  TIMELINE_SLOT_DEFAULT_DURATION_SECONDS,
  TIMELINE_SLOT_MINUTES,
} from './PlanConstants'
import { startOfNextPlanDay, startOfPlanDay } from './PlanCalendar'

/** One slot, in seconds. */
export const TIMELINE_SLOT_SECONDS: TimeIntervalSeconds =
  TIMELINE_SLOT_MINUTES * 60

/** The half-open hour band a day view renders — `DayViewRange`'s shape. */
export interface TimelineHourBand {
  readonly start: number
  readonly endExclusive: number
}

/**
 * `TimelineLayout.slotCount(for:)` — how many press-to-create slots cover a
 * rendered hour band. A reversed or empty band yields `0`, matching canon's
 * `max(hourRange.count, 0)`.
 */
export const timelineSlotCount = (band: TimelineHourBand): number =>
  Math.max(band.endExclusive - band.start, 0) * TIMELINE_SLOTS_PER_HOUR

/**
 * `TimelineLayout.slotHeightMultiple(index:count:)` — the height of slot
 * `index`'s press target as a multiple of one slot.
 *
 * A single-slot band is the whole canvas and gets `1`; canon's `count > 1`
 * guard is what stops slot 0 being both the first and the last and collapsing
 * to `0.5`.
 */
export const timelineSlotHeightMultiple = (
  index: number,
  count: number,
): number => {
  if (count <= 1) return 1
  if (index === 0) return 0.5
  if (index === count - 1) return 1.5
  return 1
}

/**
 * Every slot's catchment height, in order. Exists so a caller renders the run
 * in one pass and so the sum-to-`count` invariant is assertable directly.
 */
export const timelineSlotHeightMultiples = (
  count: number,
): readonly number[] =>
  Array.from({ length: Math.max(count, 0) }, (_value, index) =>
    timelineSlotHeightMultiple(index, count),
  )

/**
 * `TimelineLayout.nearestSlot(to:)` — round a moment to the nearest quarter
 * hour, measured from the start of its own day.
 *
 * Used for the creation prompt's default time when no slot was pressed, so
 * "now" offers a clean quarter hour instead of the top of the hour.
 */
export const nearestTimelineSlot = (date: Date): Date => {
  const dayStart = startOfPlanDay(date)
  const elapsedSeconds = (date.getTime() - dayStart.getTime()) / 1000
  const snapped =
    Math.round(elapsedSeconds / TIMELINE_SLOT_SECONDS) * TIMELINE_SLOT_SECONDS
  return new Date(dayStart.getTime() + snapped * 1000)
}

/**
 * `TimelineLayout.slotStart(index:on:startHour:)` — the wall-clock moment a
 * press-to-create slot represents.
 *
 * Slot 0 is the top of the **rendered band**, not midnight: on a Business-hours
 * day view the first slot is 08:00. The result is clamped into
 * `[dayStart, lastSlot]`, where `lastSlot` is taken from the calendar rather
 * than from a fixed 86 400 seconds — canon's note, because *"a day is not
 * always 86_400 seconds long (DST)"*.
 */
export const timelineSlotStart = (
  index: number,
  day: Date,
  startHour = 0,
): Date => {
  const dayStart = startOfPlanDay(day)
  const nextDayStart = startOfNextPlanDay(day)
  const daySeconds = (nextDayStart.getTime() - dayStart.getTime()) / 1000
  const lastSlot = Math.max(daySeconds - TIMELINE_SLOT_SECONDS, 0)
  const fromBandTop = index * TIMELINE_SLOT_SECONDS
  const bandStart = startHour * 3600
  const offset = Math.min(Math.max(bandStart + fromBandTop, 0), lastSlot)
  return new Date(dayStart.getTime() + offset * 1000)
}

/**
 * The uncommitted event drawn in place while the creation prompt is open, so
 * the slot the user picked stays visible behind it. Canon renders it as a
 * dashed hour-long outline (`draftLayer`); the shape of *when* and *how long*
 * is the part that is logic.
 */
export interface QuickCreateDraft {
  readonly start: Date
  readonly durationSeconds: TimeIntervalSeconds
}

/** The ghost seeded by pressing slot `index` on `day`. */
export const quickCreateDraftForSlot = (
  index: number,
  day: Date,
  startHour = 0,
): QuickCreateDraft => ({
  start: timelineSlotStart(index, day, startHour),
  durationSeconds: TIMELINE_SLOT_DEFAULT_DURATION_SECONDS,
})

/**
 * The ghost seeded from a moment rather than a slot — the accessibility action
 * and the "Add for Today" hand-off both land here, and both want the nearest
 * quarter hour rather than the raw instant.
 */
export const quickCreateDraftAt = (moment: Date): QuickCreateDraft => ({
  start: nearestTimelineSlot(moment),
  durationSeconds: TIMELINE_SLOT_DEFAULT_DURATION_SECONDS,
})

/**
 * Whether slot `index` is on the hour — the only slots canon exposes to
 * assistive technology, *"the hour is the useful grain to land on, and the
 * prompt can adjust from there"* rather than burying the day under 96 press
 * targets to swipe past.
 */
export const isOnTheHourSlot = (index: number): boolean =>
  index % TIMELINE_SLOTS_PER_HOUR === 0
