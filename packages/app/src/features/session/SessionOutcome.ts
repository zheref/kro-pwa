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
 * The calendar event a successfully-recorded session would log.
 *
 * Canon writes `SessionSummary.asEKEvent`: `title = "Session: \(intention)"`,
 * `startDate = fragments.first?.start`, `endDate = fragments.last?.end`. The
 * web equivalent adds the IANA timezone, because the legacy `/session` page's
 * `handleSessionSuccess` already posted one and Google Calendar's API needs it
 * where EventKit infers it from the store.
 *
 * `null` when the outcome carries no closed span to log — a zero-fragment
 * session, or one whose trailing fragment is somehow still open. Inventing a
 * `now` here would put a clock in a pure derivation; a session with no span is
 * not an event.
 */
export interface SessionCalendarEvent {
  readonly title: string
  readonly start: Date
  readonly end: Date
  /** IANA zone id, supplied by the caller — this tier reads no `Intl`. */
  readonly timezone: string
}

export const sessionCalendarEventFor = (
  outcome: SessionOutcome,
  timezone: string,
): SessionCalendarEvent | null => {
  const start = outcome.fragments[0]?.start ?? null
  const end = outcome.fragments[outcome.fragments.length - 1]?.end ?? null
  if (start === null || end === null) return null
  return {
    title: `Session: ${outcome.intention}`,
    start,
    end,
    timezone,
  }
}
