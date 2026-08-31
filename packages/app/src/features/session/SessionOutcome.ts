/**
 * What a closed session hands to the recorder — and the calendar event it
 * would log.
 *
 * A `SessionOutcome` is assembled **synchronously, in a reducer arm**, at the
 * moment a session stops accruing time. That timing is the point: it is the
 * value the exactly-once claim carries (`SessionFeature.ts` → `SessionConclusion`),
 * so the recording Producer never has to re-derive what happened from a state
 * that may have moved on.
 *
 * Ported from the five canon call sites that build the same tuple —
 * `.userDidTapAbort`, `.userDidTapFinishEarly` (both branches), the
 * `._timerTicked` countdown-completion branch, and `MainFeature`'s
 * pill-observed conclusion — each of which passes
 * `(endeavorId, resolution, fragments, elapsed, targetDuration)` to
 * `taskMarkedComplete`.
 */
import {
  type FocusSessionFragment,
  type PerformResolution,
  type TimeIntervalSeconds,
} from '@kro/core'

/** Why the session stopped — kept for the record's notes and for tests. */
export const SessionOutcomeReason = {
  /** A countdown reached zero. */
  countdownElapsed: 'countdownElapsed',
  /** Finish Early, at or above the 30 % recording threshold. */
  finishedEarly: 'finishedEarly',
  /** Finish Early, **below** the threshold — an aborted attempt. */
  belowThreshold: 'belowThreshold',
  /** The user aborted. */
  aborted: 'aborted',
  /** The user marked the task complete from the concluded sheet or the pill. */
  markedComplete: 'markedComplete',
} as const

export type SessionOutcomeReason =
  (typeof SessionOutcomeReason)[keyof typeof SessionOutcomeReason]

export interface SessionOutcome {
  readonly endeavorId: string
  /** The session's intention — the endeavor title at the moment it closed. */
  readonly intention: string
  readonly resolution: PerformResolution
  /** Every fragment, closed. Their sum is `elapsedDuration`. */
  readonly fragments: readonly FocusSessionFragment[]
  readonly elapsedDuration: TimeIntervalSeconds
  readonly targetDuration: TimeIntervalSeconds
  readonly reason: SessionOutcomeReason
  /** When the session closed — supplied by the caller, never read from a clock. */
  readonly endedAt: Date
}

export const makeSessionOutcome = (params: SessionOutcome): SessionOutcome =>
  params

/**
 * What a concluded session hands the calendar — canon's
 * `SessionSummary.asEKEvent(usingStore:)` inputs, pointed at Google Calendar
 * (KC-IS-#33) instead of EventKit.
 *
 * Canon spans **the first fragment's start to the last fragment's end**, not
 * the accumulated duration: the event says *when the work happened*, so a
 * session paused for lunch spans the lunch too.
 *
 * ## The title is deliberately absent
 *
 * Canon's `"Session: <intention>"` format is composed by
 * `sessionCalendarEventTitle` inside KC-IS-#33's service tier, which says why
 * in its own header: the legacy `/session` hook built that string inside a
 * React hook, where no test covered it, and *"the next surface (KC-IS-#21's
 * session Producer) would have had to duplicate the string"*. So this shape
 * carries the **intention** and #33 composes the title — one rule, one home.
 *
 * The field names match #33's `SessionCalendarLogInput` exactly (`timeZone`,
 * not `timezone`), so `SessionProducer` hands this straight to
 * `extra.googleCalendar.logSession(...)` with no adapter in between. It is
 * *declared* here rather than imported because `check-uzf-boundaries.mjs`
 * refuses a feature-tier import of anything under `services/` (`RC-6`,
 * `RC-21`) — the same reason `PlatformVocabulary.ts` exists.
 *
 * `null` when the outcome carries no closed span to log — a zero-fragment
 * session, or one whose trailing fragment is somehow still open. Inventing a
 * `now` here would put a clock in a pure derivation, and a session still
 * running is not a session to log.
 */
export interface SessionCalendarLog {
  readonly intention: string
  readonly start: Date
  readonly end: Date
  /** IANA zone id, supplied by the caller — this tier reads no `Intl`. */
  readonly timeZone: string
}

export const sessionCalendarLogFor = (
  outcome: SessionOutcome,
  timeZone: string,
): SessionCalendarLog | null => {
  const start = outcome.fragments[0]?.start ?? null
  const end = outcome.fragments[outcome.fragments.length - 1]?.end ?? null
  if (start === null || end === null) return null
  return { intention: outcome.intention, start, end, timeZone }
}
