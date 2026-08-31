/**
 * `SessionSummary` — canon `KroCore/Model/Session/Index.swift`.
 *
 * What a finished session reports: the intention it was run against, its total
 * duration and the fragments it was made of.
 *
 * Two canon members deliberately do not cross:
 *
 * - `id: String = .randomUUID`. This tier has no UUID source (`types: []`), so
 *   `id` is a required parameter and the app tier owns identity — exactly the
 *   ruling #7 made for `Endeavor.id`.
 * - `debugDescription` and `asEKEvent(usingStore:)`. The first formats through
 *   `digitalTime()`, i.e. locale-dependent presentation the domain tier has no
 *   locale for (#7 excluded the same family of `…String` properties); the
 *   second builds an `EKEvent`, and EventKit has no web counterpart at all —
 *   epic #1 lists Apple EventKit hosts as out of scope, with Google Calendar
 *   as the flagship external host (#33). `sessionSummaryStart` /
 *   `sessionSummaryEnd` expose the two values `asEKEvent` needed, so a
 *   calendar-writing Service can be built on top without either import.
 */
import type { TimeIntervalSeconds } from '../shared/TimeInterval'
import type { FocusSessionFragment } from './FocusSessionFragment'

export interface SessionSummary {
  readonly id: string
  readonly intention: string
  readonly duration: TimeIntervalSeconds
  readonly fragments: readonly FocusSessionFragment[]
}

export const makeSessionSummary = (params: {
  readonly id: string
  readonly intention: string
  readonly duration: TimeIntervalSeconds
  readonly fragments?: readonly FocusSessionFragment[]
}): SessionSummary => ({
  id: params.id,
  intention: params.intention,
  duration: params.duration,
  fragments: params.fragments ?? [],
})

/** `fragments.first?.start` — when the session began. */
export const sessionSummaryStart = (summary: SessionSummary): Date | null =>
  summary.fragments[0]?.start ?? null

/**
 * `fragments.last?.end` — when it ended.
 *
 * `null` when the summary carries no fragments **or** when its trailing
 * fragment is still open. Canon's optional chain collapses those two cases the
 * same way, and it is the honest answer: an open trailing fragment has no end
 * yet, and inventing `now` here would put a clock in a value type.
 */
export const sessionSummaryEnd = (summary: SessionSummary): Date | null =>
  summary.fragments[summary.fragments.length - 1]?.end ?? null
