import { describe, expect, it } from 'vitest'
import fixtures from '../google.fixtures.json'
import {
  googleCalendarSummariesFrom,
  googleOAuthErrorCode,
  isGoogleRateLimitBody,
  parseGoogleCalendarEvent,
  parseGoogleCalendarEventEnvelope,
  parseGoogleCalendarEventList,
  parseGoogleCalendarEventsPayload,
  parseGoogleCalendarList,
  parseGoogleCalendarListEntry,
  parseGoogleCalendarListPayload,
  parseGoogleDateTimeField,
  parseGoogleTokenResponse,
} from '../GoogleCalendarResponse'

describe('parsing a Google date-time field (SEC-7)', () => {
  it('reads a timed event’s dateTime and zone', () => {
    expect(
      parseGoogleDateTimeField({
        dateTime: '2026-08-31T09:00:00Z',
        timeZone: 'UTC',
      }),
    ).toEqual({ dateTime: '2026-08-31T09:00:00Z', timeZone: 'UTC' })
  })

  it('reads an all-day event’s date', () => {
    expect(parseGoogleDateTimeField({ date: '2026-08-31' })).toEqual({
      date: '2026-08-31',
    })
  })

  it('drops a field carrying neither, so “sent a start” means “sent a usable start”', () => {
    expect(parseGoogleDateTimeField({ timeZone: 'UTC' })).toBeUndefined()
    expect(parseGoogleDateTimeField(null)).toBeUndefined()
    expect(parseGoogleDateTimeField('2026-08-31')).toBeUndefined()
  })
})

describe('parsing one event', () => {
  it('reads a confirmed timed event', () => {
    const parsed = parseGoogleCalendarEvent({
      id: 'abc',
      summary: 'Standup',
      status: 'confirmed',
      start: { dateTime: '2026-08-31T09:00:00Z' },
      end: { dateTime: '2026-08-31T09:15:00Z' },
    })
    expect(parsed?.id).toBe('abc')
    expect(parsed?.summary).toBe('Standup')
  })

  it('refuses an event with no id — nothing downstream could identify it', () => {
    // `id` is what every identity rule keys on; inventing one would create a
    // row that can never reconcile with its own future fetches.
    expect(parseGoogleCalendarEvent({ summary: 'No id' })).toBeNull()
    expect(parseGoogleCalendarEvent({ id: '' })).toBeNull()
  })

  it('refuses a non-object (an HTML error page behind a 200)', () => {
    expect(parseGoogleCalendarEvent('<html>')).toBeNull()
    expect(parseGoogleCalendarEvent(null)).toBeNull()
    expect(parseGoogleCalendarEvent([])).toBeNull()
  })

  it('keeps only string entries of a recurrence array', () => {
    const parsed = parseGoogleCalendarEvent({
      id: 'abc',
      recurrence: ['RRULE:FREQ=DAILY', 42, null],
    })
    expect(parsed?.recurrence).toEqual(['RRULE:FREQ=DAILY'])
  })
})

describe('parsing a page of events', () => {
  it('reads the fixture page', () => {
    const parsed = parseGoogleCalendarEventList(fixtures.eventListResponse)
    expect(parsed?.items).toHaveLength(2)
  })

  it('drops an unreadable entry rather than emptying the day', () => {
    // Canon `compactMap`s for the same reason `endeavorsFromRecords` does.
    const parsed = parseGoogleCalendarEventList({
      items: [{ id: 'good' }, { summary: 'no id' }, 'nonsense'],
    })
    expect(parsed?.items).toHaveLength(1)
  })

  it('refuses a body with no items key — that is not a page at all', () => {
    expect(parseGoogleCalendarEventList({ error: 'nope' })).toBeNull()
    expect(parseGoogleCalendarEventList(null)).toBeNull()
  })

  it('carries the pagination token through', () => {
    expect(
      parseGoogleCalendarEventList({ items: [], nextPageToken: 'p2' })
        ?.nextPageToken,
    ).toBe('p2')
  })
})

describe('parsing the calendar list', () => {
  it('reads the fixture list', () => {
    const parsed = parseGoogleCalendarList(fixtures.calendarListResponse)
    expect(parsed?.items).toHaveLength(3)
  })

  it('refuses an entry with no id', () => {
    expect(parseGoogleCalendarListEntry({ summary: 'Nameless' })).toBeNull()
  })

  it('refuses a body with no items key', () => {
    expect(parseGoogleCalendarList({})).toBeNull()
  })
})

describe('flattening calendars for the lens', () => {
  it('falls back to the id when Google gives no display name', () => {
    const [only] = googleCalendarSummariesFrom([{ id: 'team@example.com' }])
    expect(only?.name).toBe('team@example.com')
  })

  it('treats an absent `selected` as selected, matching the Google UI', () => {
    // The conservative direction: show an event rather than silently hide it.
    const [only] = googleCalendarSummariesFrom([{ id: 'primary' }])
    expect(only?.isSelected).toBe(true)
  })

  it('honours an explicit false', () => {
    const [only] = googleCalendarSummariesFrom([
      { id: 'holidays', selected: false },
    ])
    expect(only?.isSelected).toBe(false)
  })

  it('marks the primary calendar', () => {
    const [only] = googleCalendarSummariesFrom([
      { id: 'primary', primary: true },
    ])
    expect(only?.isPrimary).toBe(true)
  })
})

describe('parsing a token response', () => {
  it('reads a full grant', () => {
    const parsed = parseGoogleTokenResponse({
      access_token: 'a',
      refresh_token: 'r',
      expires_in: 3600,
      scope: 'https://www.googleapis.com/auth/calendar',
    })
    expect(parsed?.access_token).toBe('a')
    expect(parsed?.refresh_token).toBe('r')
  })

  it('refuses a body with no access token — that is not a grant', () => {
    expect(parseGoogleTokenResponse({ refresh_token: 'r' })).toBeNull()
    expect(parseGoogleTokenResponse({ access_token: '' })).toBeNull()
  })

  it('drops a non-numeric expires_in rather than letting NaN through', () => {
    // `"3600"` would become NaN seconds downstream and mark a fresh token
    // permanently expired.
    expect(
      parseGoogleTokenResponse({ access_token: 'a', expires_in: '3600' })
        ?.expires_in,
    ).toBeUndefined()
  })
})

describe('parsing the proxy payloads the browser reads', () => {
  it('reads the events payload the /api/google/events route answers with', () => {
    const parsed = parseGoogleCalendarEventsPayload(fixtures.events)
    expect(parsed?.events).toHaveLength(5)
  })

  it('refuses an envelope with no calendar id', () => {
    expect(parseGoogleCalendarEventEnvelope({ event: { id: 'a' } })).toBeNull()
  })

  it('normalises a missing calendar name to null', () => {
    const parsed = parseGoogleCalendarEventEnvelope({
      event: { id: 'a' },
      calendarId: 'primary',
    })
    expect(parsed?.calendarName).toBeNull()
  })

  it('reads the calendars payload', () => {
    expect(
      parseGoogleCalendarListPayload(fixtures.calendars)?.calendars,
    ).toHaveLength(3)
  })

  it('refuses an HTML error page where a payload was expected', () => {
    expect(parseGoogleCalendarEventsPayload('<html>')).toBeNull()
    expect(parseGoogleCalendarListPayload({ nope: [] })).toBeNull()
  })
})

describe('reading Google’s error envelopes', () => {
  it('recognises a rate-limited 403 body', () => {
    expect(
      isGoogleRateLimitBody({
        error: { errors: [{ reason: 'userRateLimitExceeded' }] },
      }),
    ).toBe(true)
  })

  it('does not mistake an ordinary forbidden body for a rate limit', () => {
    expect(
      isGoogleRateLimitBody({ error: { errors: [{ reason: 'forbidden' }] } }),
    ).toBe(false)
    expect(isGoogleRateLimitBody(null)).toBe(false)
  })

  it('extracts the OAuth error code that means “reconnect”', () => {
    expect(googleOAuthErrorCode({ error: 'invalid_grant' })).toBe(
      'invalid_grant',
    )
    expect(googleOAuthErrorCode({})).toBeNull()
    expect(googleOAuthErrorCode('invalid_grant')).toBeNull()
  })
})
