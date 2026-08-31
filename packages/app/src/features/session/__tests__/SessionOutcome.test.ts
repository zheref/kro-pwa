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
  sessionCalendarEventFor,
} from '../SessionOutcome'

const START = new Date(2026, 2, 17, 9, 0, 0)
const MIDDLE = new Date(2026, 2, 17, 9, 10, 0)
const RESUMED = new Date(2026, 2, 17, 9, 15, 0)
const END = new Date(2026, 2, 17, 9, 30, 0)

const outcome = (
  overrides: Partial<SessionOutcome> = {},
): SessionOutcome =>
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

describe('sessionCalendarEventFor', () => {
  it('spans the whole session, pauses included — first start to last end', () => {
    const event = sessionCalendarEventFor(outcome(), 'Europe/Madrid')
    expect(event?.start).toEqual(START)
    expect(event?.end).toEqual(END)
  })

  it('titles the event the way canon does', () => {
    expect(sessionCalendarEventFor(outcome(), 'UTC')?.title).toBe(
      'Session: Prepare slides',
    )
  })

  it('carries the caller’s timezone — this tier reads no Intl of its own', () => {
    expect(sessionCalendarEventFor(outcome(), 'America/Bogota')?.timezone).toBe(
      'America/Bogota',
    )
  })

  it('answers null for a session with no fragments at all', () => {
    expect(sessionCalendarEventFor(outcome({ fragments: [] }), 'UTC')).toBeNull()
  })

  it('answers null when the trailing fragment is still open', () => {
    const open = outcome({
      fragments: [makeFocusSessionFragment({ start: START })],
    })
    expect(sessionCalendarEventFor(open, 'UTC')).toBeNull()
  })

  it('logs an aborted attempt too — the span happened either way', () => {
    const aborted = outcome({
      resolution: PerformResolution.aborted,
      reason: SessionOutcomeReason.belowThreshold,
    })
    expect(sessionCalendarEventFor(aborted, 'UTC')?.title).toBe(
      'Session: Prepare slides',
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
