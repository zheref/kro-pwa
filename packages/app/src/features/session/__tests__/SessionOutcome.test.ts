/**
 * The outcome a closed session carries, and the calendar event it derives.
 *
 * The event shape is canon's `SessionSummary.asEKEvent` — `"Session: <intention>"`
 * from the first fragment's **start** to the last fragment's **end** — and the
 * `null` cases matter: a session with no closed span is not an event, and
 * inventing a `now` to fill one in would put a clock in a pure derivation.
 */
import { PerformResolution, makeFocusSessionFragment } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  type SessionOutcome,
  SessionOutcomeReason,
  makeSessionOutcome,
  sessionCalendarLogFor,
} from '../SessionOutcome'

const START = new Date(2026, 2, 17, 9, 0, 0)
const MIDDLE = new Date(2026, 2, 17, 9, 10, 0)
const RESUMED = new Date(2026, 2, 17, 9, 15, 0)
const END = new Date(2026, 2, 17, 9, 30, 0)

const outcome = (overrides: Partial<SessionOutcome> = {}): SessionOutcome =>
  makeSessionOutcome({
    endeavorId: 'e-1',
    intention: 'Prepare slides',
    resolution: PerformResolution.complete,
    fragments: [
      makeFocusSessionFragment({ start: START, end: MIDDLE }),
      makeFocusSessionFragment({ start: RESUMED, end: END }),
    ],
    elapsedDuration: 1500,
    targetDuration: 1500,
    reason: SessionOutcomeReason.countdownElapsed,
    endedAt: END,
    ...overrides,
  })

describe('sessionCalendarLogFor', () => {
  it('spans the whole session, pauses included — first start to last end', () => {
    const log = sessionCalendarLogFor(outcome(), 'Europe/Madrid')
    expect(log?.start).toEqual(START)
    expect(log?.end).toEqual(END)
  })

  it('carries the intention, leaving the title format to #33’s service', () => {
    // Canon's `"Session: <intention>"` is composed once, in
    // `sessionCalendarEventTitle` — duplicating it here is the exact thing
    // that module's header exists to prevent.
    const log = sessionCalendarLogFor(outcome(), 'UTC')
    expect(log?.intention).toBe('Prepare slides')
    expect(log).not.toHaveProperty('title')
  })

  it('carries the caller’s time zone — this tier reads no Intl of its own', () => {
    expect(sessionCalendarLogFor(outcome(), 'America/Bogota')?.timeZone).toBe(
      'America/Bogota',
    )
  })

  it('answers null for a session with no fragments at all', () => {
    expect(sessionCalendarLogFor(outcome({ fragments: [] }), 'UTC')).toBeNull()
  })

  it('answers null when the trailing fragment is still open', () => {
    const open = outcome({
      fragments: [makeFocusSessionFragment({ start: START })],
    })
    expect(sessionCalendarLogFor(open, 'UTC')).toBeNull()
  })

  it('logs an aborted attempt too — the span happened either way', () => {
    const aborted = outcome({
      resolution: PerformResolution.aborted,
      reason: SessionOutcomeReason.belowThreshold,
    })
    expect(sessionCalendarLogFor(aborted, 'UTC')?.intention).toBe(
      'Prepare slides',
    )
  })
})

describe('SessionOutcomeReason', () => {
  it('distinguishes the two finish-early branches the threshold produces', () => {
    expect(SessionOutcomeReason.finishedEarly).not.toBe(
      SessionOutcomeReason.belowThreshold,
    )
  })

  it('names the natural conclusion separately from a manual finish', () => {
    expect(SessionOutcomeReason.countdownElapsed).not.toBe(
      SessionOutcomeReason.finishedEarly,
    )
  })

  it('names an abort, which is neither of the finish-early branches', () => {
    expect(SessionOutcomeReason.aborted).toBe('aborted')
  })
})
