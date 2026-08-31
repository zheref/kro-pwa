import { makeFocusSessionFragment, makeSessionSummary } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  parseSessionCalendarLogInput,
  sessionCalendarEventRequest,
  sessionCalendarEventRequestFor,
  sessionCalendarEventTitle,
  sessionCalendarLogInputFrom,
} from '../GoogleCalendarSessionEvent'

const FIRST_START = new Date('2026-08-31T09:00:00Z')
const FIRST_END = new Date('2026-08-31T09:25:00Z')
const LAST_START = new Date('2026-08-31T10:00:00Z')
const LAST_END = new Date('2026-08-31T10:25:00Z')

const concluded = makeSessionSummary({
  id: 'session-1',
  intention: 'Ship the calendar host',
  duration: 3000,
  fragments: [
    makeFocusSessionFragment({ start: FIRST_START, end: FIRST_END }),
    makeFocusSessionFragment({ start: LAST_START, end: LAST_END }),
  ],
})

describe('the session event title', () => {
  it('follows canon’s "Session: <intention>" format', () => {
    expect(sessionCalendarEventTitle('Ship the calendar host')).toBe(
      'Session: Ship the calendar host',
    )
  })

  it('trims a stray space the conclusion sheet may carry', () => {
    expect(sessionCalendarEventTitle('  Write the PR  ')).toBe(
      'Session: Write the PR',
    )
  })
})

describe('reducing a concluded summary to what the log needs', () => {
  it('spans the FIRST fragment’s start to the LAST fragment’s end', () => {
    // Canon's rule: the event says when the work happened, so a session paused
    // for lunch spans the lunch. `summary.duration` is the other number.
    const input = sessionCalendarLogInputFrom(concluded, 'America/Bogota')
    expect(input?.start).toBe(FIRST_START)
    expect(input?.end).toBe(LAST_END)
  })

  it('carries the intention and the time zone through unchanged', () => {
    const input = sessionCalendarLogInputFrom(concluded, 'Europe/Madrid')
    expect(input?.intention).toBe('Ship the calendar host')
    expect(input?.timeZone).toBe('Europe/Madrid')
  })

  it('answers null while the trailing fragment is still open', () => {
    // A running session is not a session to log, and stamping `now` here would
    // put a clock in a value type — `@kro/core` refuses to, and so does this.
    const running = makeSessionSummary({
      id: 'session-2',
      intention: 'Still going',
      duration: 600,
      fragments: [makeFocusSessionFragment({ start: FIRST_START })],
    })
    expect(sessionCalendarLogInputFrom(running, 'UTC')).toBeNull()
  })

  it('answers null for a summary with no fragments at all', () => {
    const empty = makeSessionSummary({
      id: 'session-3',
      intention: 'Never started',
      duration: 0,
    })
    expect(sessionCalendarLogInputFrom(empty, 'UTC')).toBeNull()
  })
})

describe('building the calendar event for a concluded session', () => {
  it('produces canon’s title, span and zone in one request body', () => {
    const built = sessionCalendarEventRequestFor(concluded, 'America/Bogota')
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.request.summary).toBe('Session: Ship the calendar host')
    expect(built.request.start.dateTime).toBe('2026-08-31T09:00:00Z')
    expect(built.request.end.dateTime).toBe('2026-08-31T10:25:00Z')
    expect(built.request.start.timeZone).toBe('America/Bogota')
    expect(built.request.end.timeZone).toBe('America/Bogota')
  })

  it('refuses a still-running session with a typed failure, not a null', () => {
    const running = makeSessionSummary({
      id: 'session-4',
      intention: 'Still going',
      duration: 60,
      fragments: [makeFocusSessionFragment({ start: FIRST_START })],
    })
    const built = sessionCalendarEventRequestFor(running, 'UTC')
    expect(built.ok).toBe(false)
    if (built.ok) return
    expect(built.error.kind).toBe('invalidRequest')
  })

  it('refuses an empty intention rather than logging "Session: "', () => {
    const built = sessionCalendarEventRequest({
      intention: '   ',
      start: FIRST_START,
      end: LAST_END,
      timeZone: 'UTC',
    })
    expect(built.ok).toBe(false)
    if (built.ok) return
    expect(built.error.kind).toBe('invalidRequest')
  })

  it('refuses a missing time zone — the event would render in the wrong one', () => {
    const built = sessionCalendarEventRequest({
      intention: 'Ship it',
      start: FIRST_START,
      end: LAST_END,
      timeZone: '',
    })
    expect(built.ok).toBe(false)
  })

  it('refuses a zero-length session, which Google would reject with a 400', () => {
    const built = sessionCalendarEventRequest({
      intention: 'Instant',
      start: FIRST_START,
      end: FIRST_START,
      timeZone: 'UTC',
    })
    expect(built.ok).toBe(false)
  })
})

describe('reading the /api/google/createEvent body (SEC-7)', () => {
  it('accepts the four-field contract', () => {
    const parsed = parseSessionCalendarLogInput({
      intention: 'Ship it',
      start: '2026-08-31T09:00:00.000Z',
      end: '2026-08-31T09:25:00.000Z',
      timeZone: 'UTC',
    })
    expect(parsed?.intention).toBe('Ship it')
    expect(parsed?.start.toISOString()).toBe('2026-08-31T09:00:00.000Z')
  })

  it('refuses an unparseable instant rather than passing an Invalid Date on', () => {
    expect(
      parseSessionCalendarLogInput({
        intention: 'x',
        start: 'yesterday',
        end: '2026-08-31T09:25:00.000Z',
        timeZone: 'UTC',
      }),
    ).toBeNull()
  })

  it('refuses a body missing a required field', () => {
    expect(
      parseSessionCalendarLogInput({
        intention: 'x',
        start: '2026-08-31T09:00:00.000Z',
      }),
    ).toBeNull()
    expect(parseSessionCalendarLogInput(null)).toBeNull()
    expect(parseSessionCalendarLogInput([])).toBeNull()
  })

  it('ignores extra fields a caller may send', () => {
    const parsed = parseSessionCalendarLogInput({
      intention: 'x',
      start: '2026-08-31T09:00:00.000Z',
      end: '2026-08-31T09:25:00.000Z',
      timeZone: 'UTC',
      attendees: ['victim@example.com'],
    })
    expect(Object.keys(parsed ?? {})).toEqual([
      'intention',
      'start',
      'end',
      'timeZone',
    ])
  })
})
