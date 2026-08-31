/**
 * The Calendar lane's grouping — the port of the `else` half of canon's
 * `applyRegroup` (`Kro/Application/Do/DoShifters.swift`, the
 * `allDayEventCards` / `timedEventGroups` block).
 *
 * `KC-IS-#16` installed today's events into the slice and said so explicitly:
 * *"not grouped into a lane here: the all-day / timed carousel and its
 * session-skip state are the events lane's own work"*. This is that work, kept
 * pure and clock-parameterised like every other rule in this feature, so the
 * "an event that ended ten minutes ago disappears" boundary is a table test.
 *
 * ## Canon's five rules, in canon's order
 *
 * 1. **Eligible** — has a `start`, is not `closed` or `skipped`, starts *today*,
 *    and passes the lens. Canon mirrors the old post-filter exactly (`.closed`
 *    / `.skipped`) rather than using `hasBeenCompleted`, because that also
 *    covers `.reviewing` / `.qa`, which were never filtered out — *"hiding them
 *    would be a new behavior, not a preserved one"*.
 * 2. **All-day** is `duration == nil`, sorted by **title**. There is no
 *    `allDay` flag on the domain model; canon's own test is the absent
 *    duration, and that is what is ported.
 * 3. **Timed** additionally requires a duration and must not have *ended*:
 *    `start + duration > now`. A finished meeting leaves the lane on its own.
 * 4. **Order** is ongoing first (started, not finished), then upcoming, each by
 *    start ascending — so the thing you are in the middle of leads the row.
 * 5. **Grouping** stacks events that start in the **same minute** into one
 *    column, at most two deep; a third concurrent event is dropped rather than
 *    making the row taller than a card.
 *
 * ## The one filter that is not ported
 *
 * Canon also drops events whose `visibilityCalendarId` the user has hidden, and
 * events in a session-local `skippedEventIDs` set. The calendar list is the
 * Google Calendar child's (`KC-IS-#33`) and there is no per-event calendar id
 * on the model yet; the skip set is state `KC-IS-#16` did not add. Both are
 * named in this PR rather than faked.
 *
 * The kind term of the lens **is** applied, which canon does not do here (its
 * query already constrains kinds). Hiding "Event" in Visibility should empty
 * this lane, and going through `passesDoKindAndHostLens` is what makes that
 * true without a second predicate to keep in step.
 */
import {
  type Endeavor,
  type EndeavorsLens,
  EndeavorStatus as Status,
  type ReconciliationContext,
  defaultReconciliationContext,
  isSameCalendarDay,
} from '@kro/core'
import { passesDoKindAndHostLens } from '../DoRules'

/** Canon's `if group.count < 2` — a column is at most two cards deep. */
export const MAX_EVENTS_PER_COLUMN = 2

export interface DoEventLanes {
  /** Canon's `allDayEventCards`, title-sorted. */
  readonly allDay: readonly Endeavor[]
  /** Canon's `timedEventGroups` — one inner array per column. */
  readonly timedGroups: readonly (readonly Endeavor[])[]
}

export const emptyDoEventLanes: DoEventLanes = { allDay: [], timedGroups: [] }

export interface DoEventLanesInput {
  readonly events: readonly Endeavor[]
  readonly lens: EndeavorsLens
  readonly now: Date
  readonly context?: ReconciliationContext
}

/** Rule 1 — the eligible pool every group below is drawn from. */
export const eligibleDoEvents = (
  input: DoEventLanesInput,
): readonly Endeavor[] => {
  const context = input.context ?? defaultReconciliationContext()
  return input.events.filter((event) => {
    const start = event.start
    if (start === null) return false
    if (event.status === Status.closed || event.status === Status.skipped) {
      return false
    }
    if (!isSameCalendarDay(start, input.now)) return false
    return passesDoKindAndHostLens(event, input.lens, context)
  })
}

/** Whether two instants land in the same calendar minute. */
const isSameMinute = (left: Date, right: Date): boolean =>
  isSameCalendarDay(left, right) &&
  left.getHours() === right.getHours() &&
  left.getMinutes() === right.getMinutes()

const startOf = (event: Endeavor): number =>
  event.start?.getTime() ?? Number.POSITIVE_INFINITY

export const groupDoEvents = (input: DoEventLanesInput): DoEventLanes => {
  const eligible = eligibleDoEvents(input)
  const nowMs = input.now.getTime()

  // Rule 2.
  const allDay = eligible
    .filter((event) => event.duration === null)
    .slice()
    .sort((left, right) => left.title.localeCompare(right.title))

  // Rule 3.
  const timed = eligible.filter((event) => {
    const start = event.start
    const duration = event.duration
    if (start === null || duration === null) return false
    return start.getTime() + duration * 1000 > nowMs
  })

  // Rule 4. `Array.sort` is stable, so two events starting at the same instant
  // keep the reconciled pool's order — a strict gain over canon's `sorted`.
  const ongoing = timed
    .filter((event) => startOf(event) <= nowMs)
    .sort((left, right) => startOf(left) - startOf(right))
  const upcoming = timed
    .filter((event) => startOf(event) > nowMs)
    .sort((left, right) => startOf(left) - startOf(right))
  const sorted = [...ongoing, ...upcoming]

  // Rule 5.
  const timedGroups: Endeavor[][] = []
  let index = 0
  while (index < sorted.length) {
    const anchorEvent = sorted[index]
    if (anchorEvent === undefined) break
    const anchor = anchorEvent.start
    const group: Endeavor[] = []

    while (index < sorted.length) {
      const candidate = sorted[index]
      const start = candidate?.start
      if (
        candidate === undefined ||
        start === null ||
        start === undefined ||
        anchor === null ||
        !isSameMinute(start, anchor)
      ) {
        break
      }
      if (group.length < MAX_EVENTS_PER_COLUMN) group.push(candidate)
      index += 1
    }

    if (group.length > 0) timedGroups.push(group)
    else index += 1
  }

  return { allDay, timedGroups }
}
