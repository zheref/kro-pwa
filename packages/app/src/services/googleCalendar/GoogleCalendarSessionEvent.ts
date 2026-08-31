/**
 * The **session-logging binding** — canon `SessionSummary.asEKEvent(usingStore:)`,
 * pointed at Google Calendar instead of EventKit.
 *
 * Canon's rule, restated: a concluded focus session becomes one calendar event
 * titled `"Session: <intention>"`, spanning **the first fragment's start to the
 * last fragment's end**, in the user's own time zone.
 *
 * Three details are load-bearing and each is canon's:
 *
 * 1. **First start to last end, not the accumulated duration.** A session that
 *    was paused for lunch spans the lunch too — the event says when the work
 *    happened, not how long it took. `SessionSummary.duration` is the *other*
 *    number and is deliberately not used here.
 * 2. **An open trailing fragment has no end.** `sessionSummaryEnd` answers
 *    `null` for it, and `@kro/core` says why: *"inventing `now` here would put
 *    a clock in a value type"*. So this builder refuses rather than stamping a
 *    clock read — a session still running is not a session to log.
 * 3. **Time zone travels with the instants.** `Intl.DateTimeFormat()
 *    .resolvedOptions().timeZone` is the browser's answer and the caller
 *    supplies it; this module reads no clock and no locale, so its output is a
 *    pure function of its arguments and a test can assert on the exact body.
 *
 * ## Why the title is composed here rather than in the caller
 *
 * The legacy `/session` page built `` `Session: ${intention}` `` inside a React
 * hook and posted it as an already-formatted `title`. That put a product rule
 * in the render layer, where no test covers it and where the next surface
 * (KC-IS-#21's session Producer) would have had to duplicate the string. The
 * route now takes the **intention** and this module composes the title, so both
 * callers get canon's format from one place.
 */
import {
  type SessionSummary,
  sessionSummaryEnd,
  sessionSummaryStart,
} from '@kro/core'
import {
  GoogleCalendarExceptions,
  type GoogleCalendarException,
} from './GoogleCalendarException'
import {
  type GoogleEventWriteRequest,
  googleTimedEventRequest,
} from './GoogleCalendarMapper'

/** Canon's title format. Exported so a test asserts on the rule, not a literal. */
export const sessionCalendarEventTitle = (intention: string): string =>
  `Session: ${intention.trim()}`

/**
 * The narrow inputs the write needs — what a route handler can actually receive
 * over HTTP, and what KC-IS-#21's Producer will hand in directly.
 *
 * Deliberately *not* a `SessionSummary`: the summary carries fragments and a
 * points-bearing duration that have no place in a request body, and `RC-3` says
 * a Producer takes the specific inputs an effect needs. `sessionLogRequestFrom`
 * below is the adapter for callers that do hold a summary.
 */
export interface SessionCalendarLogInput {
  readonly intention: string
  readonly start: Date
  readonly end: Date
  readonly timeZone: string
}

export type SessionCalendarLogOutcome =
  | { readonly ok: true; readonly request: GoogleEventWriteRequest }
  | { readonly ok: false; readonly error: GoogleCalendarException }

/**
 * Build the event body for a concluded session.
 *
 * An empty intention is refused rather than logged as `"Session: "`: canon's
 * conclusion sheet always carries one, so an empty value means the caller lost
 * it, and a calendar full of untitled blocks is worse than a reported failure.
 */
export const sessionCalendarEventRequest = (
  input: SessionCalendarLogInput,
): SessionCalendarLogOutcome => {
  const intention = input.intention.trim()
  if (intention.length === 0) {
    return {
      ok: false,
      error: GoogleCalendarExceptions.invalidRequest(
        'A session needs an intention before it can be logged.',
      ),
    }
  }
  if (input.timeZone.trim().length === 0) {
    return {
      ok: false,
      error: GoogleCalendarExceptions.invalidRequest(
        'A session event needs the time zone it was run in.',
      ),
    }
  }
  return googleTimedEventRequest({
    summary: sessionCalendarEventTitle(intention),
    start: input.start,
    end: input.end,
    timeZone: input.timeZone,
  })
}

/**
 * A `SessionSummary` reduced to the four values the log needs — canon's
 * `asEKEvent` inputs.
 *
 * `null` when the summary has no fragments, or when its trailing fragment is
 * still open: `sessionSummaryEnd` collapses those two cases and so does this,
 * because the answer for both is the same — there is nothing to log yet.
 */
export const sessionCalendarLogInputFrom = (
  summary: SessionSummary,
  timeZone: string,
): SessionCalendarLogInput | null => {
  const start = sessionSummaryStart(summary)
  const end = sessionSummaryEnd(summary)
  if (start === null || end === null) return null
  return { intention: summary.intention, start, end, timeZone }
}

/**
 * The whole path from a concluded summary to a request body.
 *
 * The `null` case above is turned into a typed exception here so a Producer has
 * one outcome type to branch on rather than two.
 */
export const sessionCalendarEventRequestFor = (
  summary: SessionSummary,
  timeZone: string,
): SessionCalendarLogOutcome => {
  const input = sessionCalendarLogInputFrom(summary, timeZone)
  if (input === null) {
    return {
      ok: false,
      error: GoogleCalendarExceptions.invalidRequest(
        'This session has no completed fragments to log.',
      ),
    }
  }
  return sessionCalendarEventRequest(input)
}

/**
 * Read the `/api/google/createEvent` request body (`SEC-7`).
 *
 * The four fields are the whole contract; anything else in the body is dropped
 * rather than forwarded, so the route cannot be used to set arbitrary Google
 * event fields. Instants arrive as strings because JSON has no `Date`, and an
 * unparseable one is a `null` here rather than an `Invalid Date` downstream.
 */
export const parseSessionCalendarLogInput = (
  value: unknown,
): SessionCalendarLogInput | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }
  const candidate = value as Record<string, unknown>
  const intention = candidate.intention
  const timeZone = candidate.timeZone
  if (typeof intention !== 'string') return null
  if (typeof timeZone !== 'string') return null

  const instant = (raw: unknown): Date | null => {
    if (typeof raw !== 'string') return null
    const parsed = new Date(raw)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  const start = instant(candidate.start)
  const end = instant(candidate.end)
  if (start === null || end === null) return null

  return { intention, start, end, timeZone }
}
