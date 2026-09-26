/**
 * Pure timeline layout math — the port of `KroUI/Plan/TimelineLayout.swift`.
 *
 * One function turns a day's endeavors into placed rectangles: a vertical
 * offset and height in pixels, plus a column index and the column count of the
 * overlap cluster the event belongs to. Nothing here reads a clock, a store or
 * the DOM, which is what lets #19 render it and this suite pin it against
 * canon's own fixtures.
 *
 * ## The column assignment, and why it is a sweep line
 *
 * Events are sorted by start (ties broken by the **longer** event first), then
 * swept: each column remembers when its most recent occupant ended, and a new
 * event takes the first column that has freed up, appending a new one only when
 * none has. A run of mutually-overlapping events is a *cluster*, opened
 * whenever an event starts at or after every previous event's end; every member
 * of a cluster is widened to the cluster's maximum column count, so a column is
 * the same width down the whole cluster.
 *
 * The consequence the issue calls out is that **every column is independently
 * interactive, including a short event nested inside a long one**: the short
 * event gets its own column rather than being drawn on top of the long one, so
 * both have a real rectangle to hit-test. Canon's `TimelineDayView` comment
 * says the same thing from the gesture side — *"the event layer keeps
 * full-canvas bounds, and each visible card declares its rectangular hit shape,
 * so long-press and drag recognition remain available for every overlap
 * column."*
 *
 * ## Two `duration ?? …` defaults that are deliberately different
 *
 * The layout pass reads `duration ?? 0`: an event with a start and no duration
 * has zero extent, fails the `clampedEnd > clampedStart` guard, and is dropped
 * from the canvas. The **edit** handlers read `duration ?? 3600` instead,
 * because a block the user has grabbed has to have a length. Canon carries both
 * and so does this port — see `TIMELINE_FALLBACK_EVENT_DURATION_SECONDS`.
 *
 * ## Divergences from the Swift, both benign
 *
 * - `Array.prototype.sort` is **stable** by specification; Swift's `sorted(by:)`
 *   is not. Where canon's comparator declares two events equal, this port's
 *   order is the input order and canon's is unspecified. Strictly more
 *   deterministic, never less.
 * - Canon returns `[PlacedEvent]` carrying `CGFloat`; here every length is a
 *   plain `number` of CSS pixels (`TIMELINE_HOUR_HEIGHT_PX`).
 */
import type { Endeavor } from '@kro/core'
import {
  TIMELINE_HOUR_HEIGHT_PX,
  TIMELINE_MINIMUM_CARD_HEIGHT_PX,
} from './PlanConstants'
import {
  planSecondsBetween,
  startOfNextPlanDay,
  startOfPlanDay,
} from './PlanCalendar'

/**
 * One event rectangle placed on the timeline: vertical offsets in pixels,
 * horizontal position as a column index within its overlap cluster.
 */
export interface PlacedEvent {
  /** The originating endeavor, unmodified. */
  readonly endeavor: Endeavor
  /** Vertical offset from the top of the rendered band, in px. */
  readonly yOffset: number
  /** Vertical extent of the card, in px — never below the minimum. */
  readonly height: number
  /** Column index within the overlap cluster, starting at 0. */
  readonly column: number
  /** Total column count for the cluster this event belongs to. */
  readonly columnCount: number
}

/** `PlacedEvent.xFraction` — fractional X-origin within the content area. */
export const placedEventXFraction = (placement: PlacedEvent): number =>
  placement.columnCount > 0 ? placement.column / placement.columnCount : 0

/** `PlacedEvent.widthFraction` — fractional width within the content area. */
export const placedEventWidthFraction = (placement: PlacedEvent): number =>
  placement.columnCount > 0 ? 1 / placement.columnCount : 1

/**
 * `TimelineLayout.pointOffset(from:to:hourHeight:)` — a wall-clock moment as a
 * **non-negative** offset in px from the timeline's origin.
 */
export const timelinePointOffset = (
  origin: Date,
  date: Date,
  hourHeightPx: number = TIMELINE_HOUR_HEIGHT_PX,
): number => {
  const seconds = Math.max(0, planSecondsBetween(origin, date))
  return (seconds / 3600) * hourHeightPx
}

/** One event clamped to the rendered day, ready for the sweep. */
interface ScopedEvent {
  readonly endeavor: Endeavor
  readonly start: Date
  readonly end: Date
}

export interface TimelinePlacementOptions {
  /** The wall-clock date the timeline represents — only its day is read. */
  readonly on: Date
  /** Pixels of vertical space allocated to one hour. */
  readonly hourHeightPx?: number
  /**
   * First hour of the rendered band. Offsets are measured from the top of
   * *that* band, not from midnight — canon's own note: the canvas is only as
   * tall as the band, so anchoring to midnight leaves dead space above a
   * late-starting band and pushes its last hours off the bottom.
   */
  readonly startHour?: number
}

/**
 * `TimelineLayout.placements(for:on:hourHeight:startHour:)`.
 *
 * Endeavors with no `start`, and those whose clamped extent does not fall
 * inside the selected day, are dropped. A multi-day event is clamped to the
 * day's bounds so it renders as that day's slice of itself.
 */
export const timelinePlacements = (
  endeavors: readonly Endeavor[],
  options: TimelinePlacementOptions,
): readonly PlacedEvent[] => {
  const hourHeightPx = options.hourHeightPx ?? TIMELINE_HOUR_HEIGHT_PX
  const startHour = options.startHour ?? 0
  const dayStart = startOfPlanDay(options.on)
  const dayEnd = startOfNextPlanDay(options.on)
  // The visible window opens at the band, not at midnight: an event that
  // starts before a late-starting band anchors at the band's top edge with
  // its remaining visible height, and one that ends before the band opens is
  // not placed at all — the canvas is only as tall as the band.
  const bandStart = new Date(dayStart.getTime() + startHour * 3_600_000)

  const scoped: ScopedEvent[] = []
  for (const endeavor of endeavors) {
    const start = endeavor.start
    if (start === null) continue
    const end = new Date(start.getTime() + (endeavor.duration ?? 0) * 1000)
    if (
      !(
        end.getTime() > bandStart.getTime() &&
        start.getTime() < dayEnd.getTime()
      )
    ) {
      continue
    }
    const clampedStart =
      start.getTime() > bandStart.getTime() ? start : bandStart
    const clampedEnd = end.getTime() < dayEnd.getTime() ? end : dayEnd
    if (!(clampedEnd.getTime() > clampedStart.getTime())) continue
    scoped.push({ endeavor, start: clampedStart, end: clampedEnd })
  }

  scoped.sort((left, right) => {
    if (left.start.getTime() === right.start.getTime()) {
      // Longer event first, so the enclosing block owns column 0 and the short
      // one nested inside it lands in a column of its own.
      return right.end.getTime() - left.end.getTime()
    }
    return left.start.getTime() - right.start.getTime()
  })

  // Sweep-line column assignment: each column tracks the end time of its most
  // recent occupant. A new event reuses the first column whose occupant has
  // ended; otherwise a new column is appended.
  const columnEndTimes: number[] = []
  const assignedColumns: number[] = new Array(scoped.length).fill(0)
  const clusterIds: number[] = new Array(scoped.length).fill(0)
  let clusterIndex = 0
  let latestEnd = Number.NEGATIVE_INFINITY

  scoped.forEach((event, index) => {
    const start = event.start.getTime()
    const end = event.end.getTime()

    if (start >= latestEnd) {
      columnEndTimes.length = 0
      clusterIndex += 1
    }

    let assigned = -1
    for (let column = 0; column < columnEndTimes.length; column += 1) {
      if ((columnEndTimes[column] as number) <= start) {
        assigned = column
        columnEndTimes[column] = end
        break
      }
    }
    if (assigned === -1) {
      columnEndTimes.push(end)
      assigned = columnEndTimes.length - 1
    }
    assignedColumns[index] = assigned
    clusterIds[index] = clusterIndex
    if (end > latestEnd) latestEnd = end
  })

  const clusterMaxColumns = new Map<number, number>()
  scoped.forEach((_event, index) => {
    const cluster = clusterIds[index] as number
    const current = clusterMaxColumns.get(cluster) ?? 0
    clusterMaxColumns.set(
      cluster,
      Math.max(current, (assignedColumns[index] as number) + 1),
    )
  })

  return scoped.map((event, index) => {
    const yOffset =
      timelinePointOffset(dayStart, event.start, hourHeightPx) -
      startHour * hourHeightPx
    const durationSeconds = planSecondsBetween(event.start, event.end)
    const rawHeight = (durationSeconds / 3600) * hourHeightPx
    return {
      endeavor: event.endeavor,
      yOffset,
      height: Math.max(TIMELINE_MINIMUM_CARD_HEIGHT_PX, rawHeight),
      column: assignedColumns[index] as number,
      columnCount: clusterMaxColumns.get(clusterIds[index] as number) ?? 1,
    }
  })
}
