/**
 * Timeline **edit mode**, modelled as a value plus pure transitions — the port
 * of `docs/timeline-edit-mode.md` and `KroUI/Plan/TimelineDayView.swift`'s three
 * gesture handlers.
 *
 * Canon keeps this state in the view because SwiftUI's `@State` is the natural
 * home for something transient, and its doc says so: *"Edit Mode is entirely
 * visual / transient state. The draft times never leave the view until the user
 * confirms."* On this stack the same reasoning would put it in a component's
 * `useState`, which `RC-4` forbids outright — *"if it needs to survive a
 * re-render for a domain reason, it belongs in the slice."* And it does: the
 * reflow preview substitutes the draft into the whole day's layout, so every
 * other card's position depends on it.
 *
 * So the **bookkeeping** lives in the slice and the **rules** live here, as a
 * value and five transitions — begin, begin-drag, drag, end-drag, commit (or
 * cancel). The DOM gesture wiring that calls them is #19's.
 *
 * ## The drag-session base is the whole point
 *
 * Every snap is computed from a base captured the moment the finger lands, not
 * from the current draft. Canon:
 *
 * > Snapping is computed from a stable *drag-session base* captured the moment
 * > the finger first lands, not from the current draft value — this avoids
 * > accumulated rounding drift across a long drag.
 * >
 * >     snappedDelta = round(exactDelta / 900) * 900
 *
 * Re-snapping a value that has already been snapped is what accumulates drift:
 * each step rounds the *previous* rounding, and a long slow drag ends up
 * somewhere the finger never was. Because `TimelineDragBase` is captured once
 * and the translation is always measured from the same origin, applying a whole
 * sequence of translations is identical to applying only the last one — which
 * is exactly the property `__tests__/PlanEditSession.property.test.ts` asserts.
 *
 * ## The three invariants, verbatim from canon
 *
 * - Top-handle drag **never changes** the end.
 * - Bottom-handle drag **never changes** the start.
 * - Block drag **never changes** duration.
 *
 * The first two are enforced by a clamp against the *other* edge, which is also
 * where the 15-minute minimum lives. The third needs no clamp at all: duration
 * is carried in the base, so a body drag cannot shrink an event however far it
 * travels. That asymmetry is canon's and is preserved.
 *
 * ## Past events are read-only
 *
 * *"Past events (already finished) are no longer movable — dragging history
 * makes no sense and only causes accidental reschedules."* `beginTimelineEdit`
 * refuses, so the session can never exist for a finished event; the slice's arm
 * re-checks against the injected clock rather than trusting the caller.
 */
import type { Endeavor, TimeIntervalSeconds } from '@kro/core'
import { endOf, withRescheduled } from '@kro/core'
import {
  TIMELINE_FALLBACK_EVENT_DURATION_SECONDS,
  TIMELINE_HOUR_HEIGHT_PX,
  TIMELINE_MINIMUM_DURATION_SECONDS,
  TIMELINE_SNAP_SECONDS,
} from './PlanConstants'
import { planDateAdding, planSecondsBetween, roundHalfAwayFromZero } from './PlanCalendar'

/** Which affordance the finger is on. */
export const TimelineDragHandle = {
  /** The top handle dot — moves the start, end stays fixed. */
  start: 'start',
  /** The bottom handle dot — moves the end, start stays fixed. */
  end: 'end',
  /** The card body — moves the whole block, duration preserved. */
  body: 'body',
} as const

export type TimelineDragHandle =
  (typeof TimelineDragHandle)[keyof typeof TimelineDragHandle]

/**
 * The stable base captured at finger-down. Each handle captures exactly what it
 * moves, which is why the union is not one shape with three optional fields:
 * a start drag has no business carrying a duration.
 */
export type TimelineDragBase =
  | { readonly handle: 'start'; readonly baseStart: Date }
  | { readonly handle: 'end'; readonly baseEnd: Date }
  | {
      readonly handle: 'body'
      readonly baseStart: Date
      readonly baseDurationSeconds: TimeIntervalSeconds
    }

/**
 * One armed card. `draftStart` / `draftEnd` are `null` while still equal to the
 * original — canon's `editDraftStart: Date?` where *"nil = original unchanged"*
 * — so "the user has not touched this edge" and "the user dragged it back to
 * where it started" stay distinguishable.
 */
export interface TimelineEditSession {
  readonly endeavorId: string
  readonly originalStart: Date
  readonly originalEnd: Date
  readonly draftStart: Date | null
  readonly draftEnd: Date | null
  /** The in-flight drag's base, or `null` when no finger is down. */
  readonly drag: TimelineDragBase | null
}

/** The times a commit would write. */
export interface TimelineEditCommit {
  readonly endeavorId: string
  readonly start: Date
  readonly end: Date
}

/**
 * The end an **edit** uses — `end ?? start + (duration ?? 3600)`. Distinct from
 * the layout pass's `duration ?? 0`: a block the user has grabbed must have a
 * length, even if nothing ever gave it one. See `PlanConstants`.
 */
export const timelineEditableEnd = (endeavor: Endeavor): Date | null => {
  if (endeavor.start === null) return null
  return (
    endOf(endeavor) ??
    planDateAdding(endeavor.start, TIMELINE_FALLBACK_EVENT_DURATION_SECONDS)
  )
}

/**
 * `isPast` — canon's `placementEnd <= model.currentTime`, where `placementEnd`
 * is `(start ?? .distantFuture) + (duration ?? 0)`.
 *
 * Note this reads `duration ?? 0`, unlike `timelineEditableEnd`: a zero-length
 * event whose start has passed *is* past. An event with no start at all is
 * never past — canon's `.distantFuture` sentinel — which matters because such
 * an event is not on the canvas to be pressed in the first place.
 */
export const isPastTimelineEvent = (endeavor: Endeavor, now: Date): boolean => {
  if (endeavor.start === null) return false
  const end = planDateAdding(endeavor.start, endeavor.duration ?? 0)
  return end.getTime() <= now.getTime()
}

/** Whether a long press on this card may arm edit mode at all. */
export const canEditTimelineEvent = (endeavor: Endeavor, now: Date): boolean =>
  endeavor.start !== null && !isPastTimelineEvent(endeavor, now)

/**
 * Arm edit mode for one card, or refuse. Refusal is `null` rather than an
 * exception: the caller is a gesture, and "this card is not editable" is an
 * ordinary answer, not a failure to report.
 */
export const beginTimelineEdit = (
  endeavor: Endeavor,
  now: Date,
): TimelineEditSession | null => {
  if (!canEditTimelineEvent(endeavor, now)) return null
  const start = endeavor.start
  const end = timelineEditableEnd(endeavor)
  if (start === null || end === null) return null
  return {
    endeavorId: endeavor.id,
    originalStart: start,
    originalEnd: end,
    draftStart: null,
    draftEnd: null,
    drag: null,
  }
}

/** The times the session currently represents — draft where set, else original. */
export const timelineEditPreview = (
  session: TimelineEditSession,
): { readonly start: Date; readonly end: Date } => ({
  start: session.draftStart ?? session.originalStart,
  end: session.draftEnd ?? session.originalEnd,
})

/**
 * Capture the drag base for `handle`. Idempotent: canon captures only
 * `if base == nil`, so a second `onChanged` in the same drag must not re-base
 * — that would reintroduce the very drift the base exists to prevent.
 */
export const beginTimelineDrag = (
  session: TimelineEditSession,
  handle: TimelineDragHandle,
): TimelineEditSession => {
  if (session.drag !== null && session.drag.handle === handle) return session
  const { start, end } = timelineEditPreview(session)
  switch (handle) {
    case TimelineDragHandle.start:
      return { ...session, drag: { handle: 'start', baseStart: start } }
    case TimelineDragHandle.end:
      return { ...session, drag: { handle: 'end', baseEnd: end } }
    case TimelineDragHandle.body:
      return {
        ...session,
        drag: {
          handle: 'body',
          baseStart: start,
          baseDurationSeconds: planSecondsBetween(start, end),
        },
      }
    default:
      return session
  }
}

/**
 * `snappedDelta = round(exactDelta / 900) * 900`, with the vertical translation
 * converted to time by the hour scale.
 *
 * `roundHalfAwayFromZero` rather than `Math.round`: the delta is signed, and
 * `Math.round(-0.5)` is `-0` where Swift's `.rounded()` is `-1`. Without it a
 * drag upward by exactly half a snap would do nothing while the same drag
 * downward moved a full quarter hour.
 */
export const snapTimelineDelta = (
  translationPx: number,
  hourHeightPx: number = TIMELINE_HOUR_HEIGHT_PX,
): TimeIntervalSeconds => {
  const exactDelta = (translationPx / hourHeightPx) * 3600
  return roundHalfAwayFromZero(exactDelta / TIMELINE_SNAP_SECONDS) * TIMELINE_SNAP_SECONDS
}

export interface TimelineDragInput {
  /** Cumulative vertical translation since finger-down, in px. Signed. */
  readonly translationPx: number
  readonly hourHeightPx?: number
}

/**
 * Apply a drag frame. Returns the session unchanged when the snapped position
 * has not moved — canon's `if editDraftStart != newStart` guard, which is what
 * makes the reflow recompute run *at most once per snap crossing* rather than
 * on every frame.
 */
export const applyTimelineDrag = (
  session: TimelineEditSession,
  input: TimelineDragInput,
): TimelineEditSession => {
  const base = session.drag
  if (base === null) return session
  const hourHeightPx = input.hourHeightPx ?? TIMELINE_HOUR_HEIGHT_PX
  const snapped = snapTimelineDelta(input.translationPx, hourHeightPx)

  switch (base.handle) {
    case 'start': {
      // The end is read from the session, never from the base: a top-handle
      // drag never changes it, so it is constant for the whole drag.
      const currentEnd = session.draftEnd ?? session.originalEnd
      const proposed = planDateAdding(base.baseStart, snapped)
      const latest = planDateAdding(currentEnd, -TIMELINE_MINIMUM_DURATION_SECONDS)
      const next =
        proposed.getTime() < latest.getTime() ? proposed : latest
      if (session.draftStart?.getTime() === next.getTime()) return session
      return { ...session, draftStart: next }
    }
    case 'end': {
      const currentStart = session.draftStart ?? session.originalStart
      const proposed = planDateAdding(base.baseEnd, snapped)
      const earliest = planDateAdding(
        currentStart,
        TIMELINE_MINIMUM_DURATION_SECONDS,
      )
      const next =
        proposed.getTime() > earliest.getTime() ? proposed : earliest
      if (session.draftEnd?.getTime() === next.getTime()) return session
      return { ...session, draftEnd: next }
    }
    case 'body': {
      // No clamp: duration comes from the base, so it is preserved exactly and
      // the minimum cannot be breached however far the block travels.
      const nextStart = planDateAdding(base.baseStart, snapped)
      const nextEnd = planDateAdding(nextStart, base.baseDurationSeconds)
      if (session.draftStart?.getTime() === nextStart.getTime()) return session
      return { ...session, draftStart: nextStart, draftEnd: nextEnd }
    }
    default:
      return session
  }
}

/** The finger lifted. The draft survives; only the base is released. */
export const endTimelineDrag = (
  session: TimelineEditSession,
): TimelineEditSession => (session.drag === null ? session : { ...session, drag: null })

/**
 * What leaving edit mode should write, or `null` when nothing moved. Canon's
 * `exitEditMode` sends `onUpdateEventTime` only `if finalStart != originalStart
 * || finalEnd != originalEnd`, so a hold-then-release with no drag is not an
 * edit and must not dirty the row.
 */
export const commitTimelineEdit = (
  session: TimelineEditSession,
): TimelineEditCommit | null => {
  const { start, end } = timelineEditPreview(session)
  if (
    start.getTime() === session.originalStart.getTime() &&
    end.getTime() === session.originalEnd.getTime()
  ) {
    return null
  }
  return { endeavorId: session.endeavorId, start, end }
}

/**
 * The event list the reflow preview lays out — canon's `recomputePlacements`,
 * which *"substitutes the editing event's draft times into the full
 * `model.events` list before calling `TimelineLayout.placements`"*, so every
 * card rearranges at each snap crossing and the committed result matches the
 * preview exactly, with no visual jump.
 *
 * The `max(…, 900)` floor is canon's, and it is the reason a preview can never
 * render a card shorter than the minimum even mid-drag.
 */
export const timelineEventsWithEditPreview = (
  events: readonly Endeavor[],
  session: TimelineEditSession | null,
): readonly Endeavor[] => {
  if (session === null) return events
  const { start, end } = timelineEditPreview(session)
  const durationSeconds = Math.max(
    planSecondsBetween(start, end),
    TIMELINE_MINIMUM_DURATION_SECONDS,
  )
  return events.map((event) =>
    event.id === session.endeavorId
      ? withRescheduled(event, start, durationSeconds)
      : event,
  )
}
