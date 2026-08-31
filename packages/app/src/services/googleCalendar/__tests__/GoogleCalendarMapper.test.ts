import { EndeavorHost, EndeavorKind } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  GOOGLE_EVENT_FALLBACK_TITLE,
  GoogleCalendarMapper,
  googleRfc3339,
  googleTimedEventRequest,
  isAllDayGoogleEvent,
  isCancelledGoogleEvent,
  parseGoogleEventWriteRequest,
  resolvedGoogleDate,
} from '../GoogleCalendarMapper'
import type { GoogleCalendarEventEnvelope } from '../GoogleCalendarResponse'

const envelope = (
  event: GoogleCalendarEventEnvelope['event'],
  calendarName: string | null = 'Sergio',
): GoogleCalendarEventEnvelope => ({
  event,
  calendarId: 'primary',
  calendarName,
})

describe('resolving a Google date field to an instant', () => {
  it('reads a timed event’s RFC 3339 dateTime', () => {
    expect(
      resolvedGoogleDate({ dateTime: '2026-08-31T09:00:00Z' })?.toISOString(),
    ).toBe('2026-08-31T09:00:00.000Z')
  })

  it('reads an all-day date as LOCAL midnight, as canon does', () => {
    // The divergence that matters: `new Date('2026-08-31')` parses as UTC
    // midnight, which lands an all-day event on the previous day for anyone
    // west of Greenwich. Canon pins its formatter to the device zone.
    const resolved = resolvedGoogleDate({ date: '2026-08-31' })
    expect(resolved?.getFullYear()).toBe(2026)
    expect(resolved?.getMonth()).toBe(7)
    expect(resolved?.getDate()).toBe(31)
    expect(resolved?.getHours()).toBe(0)
  })

  it('answers null for a field carrying neither form', () => {
    expect(resolvedGoogleDate(undefined)).toBeNull()
    expect(resolvedGoogleDate({ timeZone: 'UTC' })).toBeNull()
  })

  it('answers null for an unparseable dateTime rather than an Invalid Date', () => {
    expect(resolvedGoogleDate({ dateTime: 'yesterday' })).toBeNull()
  })

  it('answers null for a date that is not yyyy-MM-dd', () => {
    expect(resolvedGoogleDate({ date: '31/08/2026' })).toBeNull()
  })
})

describe('recognising the two event shapes', () => {
  it('calls a date-only start an all-day event', () => {
    expect(isAllDayGoogleEvent({ id: 'a', start: { date: '2026-08-31' } })).toBe(
      true,
    )
  })

  it('does not call a timed event all-day', () => {
    expect(
      isAllDayGoogleEvent({
        id: 'a',
        start: { dateTime: '2026-08-31T09:00:00Z' },
      }),
    ).toBe(false)
  })

  it('recognises a cancelled event', () => {
    expect(isCancelledGoogleEvent({ id: 'a', status: 'cancelled' })).toBe(true)
    expect(isCancelledGoogleEvent({ id: 'a', status: 'confirmed' })).toBe(false)
    expect(isCancelledGoogleEvent({ id: 'a' })).toBe(false)
  })
})

describe('mapping a Google event onto an endeavor', () => {
  it('maps an ordinary meeting to a calendarEvent hosted by Google', () => {
    const mapped = GoogleCalendarMapper.toDomain(
      envelope({
        id: 'gcal-1',
        summary: 'Design review',
        status: 'confirmed',
        start: { dateTime: '2026-08-31T14:00:00Z' },
        end: { dateTime: '2026-08-31T15:00:00Z' },
      }),
    )
    expect(mapped?.id).toBe('gcal-1')
    expect(mapped?.title).toBe('Design review')
    expect(mapped?.kind).toBe(EndeavorKind.calendarEvent)
    expect(mapped?.hostedBy).toEqual([EndeavorHost.googleCalendar])
    expect(mapped?.duration).toBe(3600)
  })

  it('reuses the event id as the shadow’s source identifier', () => {
    // This is what makes a Kro-hosted mirror and the Google row reconcile to
    // one endeavor — `SourceIdentity.identitiesOf` keys on exactly this pair.
    const mapped = GoogleCalendarMapper.toDomain(
      envelope({
        id: 'gcal-1',
        summary: 'Design review',
        start: { dateTime: '2026-08-31T14:00:00Z' },
      }),
    )
    const shadow = mapped?.shadows?.[0]
    expect(shadow?.sourceIdentifier).toBe('gcal-1')
    expect(shadow?.source).toBe(EndeavorHost.googleCalendar)
    expect(shadow?.kind).toBe(EndeavorKind.calendarEvent)
  })

  it('records the calendar’s name as the shadow’s group, for the lens', () => {
    const mapped = GoogleCalendarMapper.toDomain(
      envelope(
        {
          id: 'gcal-2',
          summary: 'Offsite',
          start: { dateTime: '2026-08-31T14:00:00Z' },
        },
        'Team',
      ),
    )
    expect(mapped?.shadows?.[0]?.group).toBe('Team')
  })

  it('leaves priority evidence null — Google supplies none', () => {
    // Not an omission: `null` is the evidence gate's "this provider has none".
    const mapped = GoogleCalendarMapper.toDomain(
      envelope({ id: 'g', start: { dateTime: '2026-08-31T14:00:00Z' } }),
    )
    expect(mapped?.shadows?.[0]?.appleReminderPriority).toBeNull()
  })

  it('gives an all-day event NO duration, as canon does', () => {
    const mapped = GoogleCalendarMapper.toDomain(
      envelope({
        id: 'gcal-3',
        summary: 'Company offsite',
        start: { date: '2026-08-31' },
        end: { date: '2026-09-01' },
      }),
    )
    expect(mapped?.duration).toBeNull()
  })

  it('discards a non-positive span rather than storing a zero-length block', () => {
    // Canon's `d > 0 ? d : nil`. A zero-length card draws nothing.
    const mapped = GoogleCalendarMapper.toDomain(
      envelope({
        id: 'gcal-4',
        start: { dateTime: '2026-08-31T14:00:00Z' },
        end: { dateTime: '2026-08-31T14:00:00Z' },
      }),
    )
    expect(mapped?.duration).toBeNull()
  })

  it('falls back to canon’s placeholder when Google gives no summary', () => {
    const mapped = GoogleCalendarMapper.toDomain(
      envelope({ id: 'g', start: { dateTime: '2026-08-31T17:00:00Z' } }),
    )
    expect(mapped?.title).toBe(GOOGLE_EVENT_FALLBACK_TITLE)
    expect(mapped?.shadows?.[0]?.originalTitle).toBe(GOOGLE_EVENT_FALLBACK_TITLE)
  })

  it('refuses an event with no usable start rather than storing a partial row', () => {
    expect(GoogleCalendarMapper.toDomain(envelope({ id: 'g' }))).toBeNull()
    expect(
      GoogleCalendarMapper.toDomain(envelope({ id: 'g', start: { date: 'x' } })),
    ).toBeNull()
  })
})

describe('mapping a whole fetch', () => {
  const fetched: readonly GoogleCalendarEventEnvelope[] = [
    envelope({
      id: 'ok',
      summary: 'Kept',
      status: 'confirmed',
      start: { dateTime: '2026-08-31T09:00:00Z' },
      end: { dateTime: '2026-08-31T09:30:00Z' },
    }),
    envelope({
      id: 'cancelled',
      summary: 'Dropped',
      status: 'cancelled',
      start: { dateTime: '2026-08-31T10:00:00Z' },
    }),
    envelope({ id: 'startless', summary: 'Also dropped' }),
  ]

  it('drops cancelled events — a tombstone is not a meeting', () => {
    const mapped = GoogleCalendarMapper.toDomainAll(fetched)
    expect(mapped.map((endeavor) => endeavor.id)).toEqual(['ok'])
  })

  it('drops unmappable events without failing the whole fetch', () => {
    expect(GoogleCalendarMapper.toDomainAll(fetched)).toHaveLength(1)
  })

  it('answers an empty list for an empty fetch', () => {
    expect(GoogleCalendarMapper.toDomainAll([])).toEqual([])
  })
})

describe('building a write request', () => {
  it('emits RFC 3339 to the second, matching canon’s formatter', () => {
    expect(googleRfc3339(new Date('2026-08-31T09:00:00.123Z'))).toBe(
      '2026-08-31T09:00:00Z',
    )
  })

  it('carries the time zone beside the instant', () => {
    const built = googleTimedEventRequest({
      summary: 'Session: ship it',
      start: new Date('2026-08-31T09:00:00Z'),
      end: new Date('2026-08-31T09:25:00Z'),
      timeZone: 'America/Bogota',
    })
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.request.start.timeZone).toBe('America/Bogota')
    expect(built.request.end.dateTime).toBe('2026-08-31T09:25:00Z')
  })

  it('refuses an end that does not follow the start, before Google has to', () => {
    const built = googleTimedEventRequest({
      summary: 'Backwards',
      start: new Date('2026-08-31T10:00:00Z'),
      end: new Date('2026-08-31T09:00:00Z'),
      timeZone: 'UTC',
    })
    expect(built.ok).toBe(false)
    if (built.ok) return
    expect(built.error.kind).toBe('invalidRequest')
  })

  it('refuses an empty title', () => {
    const built = googleTimedEventRequest({
      summary: '   ',
      start: new Date('2026-08-31T09:00:00Z'),
      end: new Date('2026-08-31T09:25:00Z'),
      timeZone: 'UTC',
    })
    expect(built.ok).toBe(false)
  })

  it('refuses an invalid instant rather than emitting “Invalid Date”', () => {
    const built = googleTimedEventRequest({
      summary: 'Broken',
      start: new Date('nope'),
      end: new Date('2026-08-31T09:25:00Z'),
      timeZone: 'UTC',
    })
    expect(built.ok).toBe(false)
  })
})

describe('validating an untrusted write body (SEC-7)', () => {
  it('accepts the four fields it allows', () => {
    const parsed = parseGoogleEventWriteRequest({
      summary: 'Session: ship it',
      start: { dateTime: '2026-08-31T09:00:00Z', timeZone: 'UTC' },
      end: { dateTime: '2026-08-31T09:25:00Z', timeZone: 'UTC' },
      description: 'note',
    })
    expect(parsed?.summary).toBe('Session: ship it')
    expect(parsed?.description).toBe('note')
  })

  it('drops anything else, so the route cannot set arbitrary Google fields', () => {
    const parsed = parseGoogleEventWriteRequest({
      summary: 'x',
      start: { dateTime: '2026-08-31T09:00:00Z' },
      end: { dateTime: '2026-08-31T09:25:00Z' },
      attendees: [{ email: 'victim@example.com' }],
      organizer: { email: 'attacker@example.com' },
    })
    expect(parsed).not.toBeNull()
    expect(Object.keys(parsed ?? {})).toEqual(['summary', 'start', 'end'])
  })

  it('refuses a body with no usable start or end', () => {
    expect(
      parseGoogleEventWriteRequest({ summary: 'x', start: {}, end: {} }),
    ).toBeNull()
    expect(parseGoogleEventWriteRequest({ summary: 'x' })).toBeNull()
    expect(parseGoogleEventWriteRequest(null)).toBeNull()
  })
})
