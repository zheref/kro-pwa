import { describe, expect, it } from 'vitest'
import {
  GOOGLE_CALENDAR_API_BASE,
  type RecordedGoogleRequest,
  buildCalendarListUrl,
  buildEventUrl,
  buildEventsUrl,
  makeLiveGoogleCalendarApiService,
  makeStubbedGoogleHttpTransport,
  validateGoogleStatus,
} from '../GoogleCalendarApiService'
import fixtures from '../google.fixtures.json'

const accessTokenFixture = 'ya29.NOT-A-REAL-ACCESS-TOKEN'
const FROM = new Date('2026-08-31T00:00:00Z')
const TO = new Date('2026-09-01T00:00:00Z')

const calendarListBody = {
  items: [
    { id: 'primary', summary: 'Sergio', primary: true },
    { id: 'team@example.com', summary: 'Team' },
  ],
}

describe('building request URLs', () => {
  it('scopes an events request to the window, expanding recurring series', () => {
    const url = new URL(
      buildEventsUrl({ calendarId: 'primary', from: FROM, to: TO }),
    )
    expect(url.searchParams.get('timeMin')).toBe(FROM.toISOString())
    expect(url.searchParams.get('timeMax')).toBe(TO.toISOString())
    // `singleEvents=true` is what gives each occurrence its own id, which is
    // what `SourceIdentity` needs to keep a week of a standing meeting apart.
    expect(url.searchParams.get('singleEvents')).toBe('true')
    expect(url.searchParams.get('showDeleted')).toBe('false')
  })

  it('escapes a calendar id that looks like an email address', () => {
    expect(
      buildEventsUrl({ calendarId: 'team@example.com', from: FROM, to: TO }),
    ).toContain('team%40example.com')
  })

  it('carries a page token only when there is one', () => {
    expect(
      buildEventsUrl({ calendarId: 'primary', from: FROM, to: TO }),
    ).not.toContain('pageToken')
    expect(
      buildEventsUrl({
        calendarId: 'primary',
        from: FROM,
        to: TO,
        pageToken: 'p2',
      }),
    ).toContain('pageToken=p2')
  })

  it('builds the calendar-list and single-event URLs against the v3 base', () => {
    expect(buildCalendarListUrl()).toContain(
      `${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList`,
    )
    expect(buildEventUrl('primary', 'abc')).toBe(
      `${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events/abc`,
    )
  })

  it('never takes a token, so no URL can contain one (SEC-5)', () => {
    // Structural: the builders have no token parameter at all.
    const urls = [
      buildEventsUrl({ calendarId: 'primary', from: FROM, to: TO }),
      buildCalendarListUrl('p2'),
      buildEventUrl('primary', 'abc'),
    ]
    for (const url of urls) expect(url).not.toContain(accessTokenFixture)
  })
})

describe('validating a Google status', () => {
  it('passes a 2xx', () => {
    expect(() => validateGoogleStatus(200, null)).not.toThrow()
  })

  it('raises the typed failure for a 401', () => {
    expect(() => validateGoogleStatus(401, null)).toThrowError(
      expect.objectContaining({ kind: 'unauthorized' }),
    )
  })

  it('reads Google’s rate-limit reason out of a 403 body, as canon does', () => {
    expect(() =>
      validateGoogleStatus(403, {
        error: { errors: [{ reason: 'userRateLimitExceeded' }] },
      }),
    ).toThrowError(expect.objectContaining({ kind: 'rateLimited' }))
  })

  it('drops the body from the failure, so no body can reach a log (SEC-5)', () => {
    // Canon puts the response body in the message; that body can quote the
    // request, which is how a token reaches a log.
    try {
      validateGoogleStatus(500, { error: { message: accessTokenFixture } })
      expect.unreachable('should have thrown')
    } catch (error) {
      expect((error as { message: string }).message).not.toContain(accessTokenFixture)
    }
  })
})

describe('listing calendars', () => {
  it('returns every entry Google reported', async () => {
    const service = makeLiveGoogleCalendarApiService(
      makeStubbedGoogleHttpTransport({
        routes: [{ match: 'calendarList', body: calendarListBody }],
      }),
    )
    const calendars = await service.listCalendars({ accessToken: accessTokenFixture })
    expect(calendars.map((entry) => entry.id)).toEqual([
      'primary',
      'team@example.com',
    ])
  })

  it('follows pagination until Google stops sending a token', async () => {
    let page = 0
    const service = makeLiveGoogleCalendarApiService({
      async request() {
        page += 1
        return page === 1
          ? { status: 200, body: { items: [{ id: 'a' }], nextPageToken: 'p2' } }
          : { status: 200, body: { items: [{ id: 'b' }] } }
      },
    })
    const calendars = await service.listCalendars({ accessToken: accessTokenFixture })
    expect(calendars.map((entry) => entry.id)).toEqual(['a', 'b'])
  })

  it('reports a malformed list rather than treating it as empty', async () => {
    const service = makeLiveGoogleCalendarApiService(
      makeStubbedGoogleHttpTransport({
        routes: [{ match: 'calendarList', body: '<html>' }],
      }),
    )
    await expect(
      service.listCalendars({ accessToken: accessTokenFixture }),
    ).rejects.toMatchObject({ kind: 'malformedResponse' })
  })
})

describe('listing events across every calendar', () => {
  const withEvents = (recorded?: RecordedGoogleRequest[]) =>
    makeLiveGoogleCalendarApiService(
      makeStubbedGoogleHttpTransport({
        ...(recorded === undefined ? {} : { recorded }),
        routes: [
          { match: 'calendarList', body: calendarListBody },
          { match: '/events', body: fixtures.eventListResponse },
        ],
      }),
    )

  it('pairs every event with the calendar it came from', async () => {
    const envelopes = await withEvents().listEvents({
      accessToken: accessTokenFixture,
      from: FROM,
      to: TO,
    })
    expect(envelopes).toHaveLength(4)
    expect(new Set(envelopes.map((envelope) => envelope.calendarName))).toEqual(
      new Set(['Sergio', 'Team']),
    )
  })

  it('honours an explicit calendar list without re-reading the inventory', async () => {
    const recorded: RecordedGoogleRequest[] = []
    await withEvents(recorded).listEvents({
      accessToken: accessTokenFixture,
      from: FROM,
      to: TO,
      calendarIds: ['primary'],
    })
    expect(recorded.every((call) => !call.url.includes('calendarList'))).toBe(
      true,
    )
  })

  it('lets ONE unreadable calendar contribute nothing without emptying the day', async () => {
    // Canon's per-calendar `catch`: a shared calendar the grant cannot read
    // must not take the rest of the day with it.
    const service = makeLiveGoogleCalendarApiService({
      async request({ url }) {
        if (url.includes('calendarList')) {
          return { status: 200, body: calendarListBody }
        }
        if (url.includes('team%40example.com')) {
          return { status: 404, body: null }
        }
        return { status: 200, body: fixtures.eventListResponse }
      },
    })
    const envelopes = await service.listEvents({
      accessToken: accessTokenFixture,
      from: FROM,
      to: TO,
    })
    expect(envelopes).toHaveLength(2)
    expect(envelopes.every((envelope) => envelope.calendarId === 'primary')).toBe(
      true,
    )
  })

  it('does NOT swallow a grant-level failure — the banner depends on it', async () => {
    // A 401 is not about one calendar. Returning an empty day would hide the
    // reconnect condition KC-IS-#19's banner exists to show.
    const service = makeLiveGoogleCalendarApiService({
      async request({ url }) {
        if (url.includes('calendarList')) {
          return { status: 200, body: calendarListBody }
        }
        return { status: 401, body: null }
      },
    })
    await expect(
      service.listEvents({ accessToken: accessTokenFixture, from: FROM, to: TO }),
    ).rejects.toMatchObject({ kind: 'unauthorized' })
  })

  it('refuses a window that does not move forward', async () => {
    await expect(
      withEvents().listEvents({ accessToken: accessTokenFixture, from: TO, to: FROM }),
    ).rejects.toMatchObject({ kind: 'invalidRequest' })
  })

  it('puts the token in an Authorization header and NOWHERE else (SEC-5)', async () => {
    const recorded: RecordedGoogleRequest[] = []
    await withEvents(recorded).listEvents({
      accessToken: accessTokenFixture,
      from: FROM,
      to: TO,
    })
    expect(recorded.length).toBeGreaterThan(0)
    for (const call of recorded) {
      expect(call.url).not.toContain(accessTokenFixture)
      expect(call.body ?? '').not.toContain(accessTokenFixture)
      expect(call.headers.authorization).toBe(`Bearer ${accessTokenFixture}`)
    }
  })

  it('surfaces a transport failure as offline', async () => {
    const service = makeLiveGoogleCalendarApiService(
      makeStubbedGoogleHttpTransport({ offline: true }),
    )
    await expect(
      service.listEvents({ accessToken: accessTokenFixture, from: FROM, to: TO }),
    ).rejects.toMatchObject({ kind: 'offline' })
  })
})

describe('creating an event', () => {
  const request = {
    summary: 'Session: ship it',
    start: { dateTime: '2026-08-31T09:00:00Z', timeZone: 'UTC' },
    end: { dateTime: '2026-08-31T09:25:00Z', timeZone: 'UTC' },
  }

  it('POSTs the body to the primary calendar by default', async () => {
    const recorded: RecordedGoogleRequest[] = []
    const service = makeLiveGoogleCalendarApiService(
      makeStubbedGoogleHttpTransport({
        recorded,
        routes: [{ match: '/events', status: 200, body: { id: 'created-1' } }],
      }),
    )
    const created = await service.createEvent({
      accessToken: accessTokenFixture,
      request,
    })
    expect(created.id).toBe('created-1')
    expect(recorded[0]?.method).toBe('POST')
    expect(recorded[0]?.url).toContain('/calendars/primary/events')
    expect(recorded[0]?.body).toContain('Session: ship it')
  })

  it('reports a malformed creation response rather than inventing an id', async () => {
    const service = makeLiveGoogleCalendarApiService(
      makeStubbedGoogleHttpTransport({
        routes: [{ match: '/events', status: 200, body: { noId: true } }],
      }),
    )
    await expect(
      service.createEvent({ accessToken: accessTokenFixture, request }),
    ).rejects.toMatchObject({ kind: 'malformedResponse' })
  })

  it('maps a 403 to forbidden — a read-only grant cannot insert', async () => {
    const service = makeLiveGoogleCalendarApiService(
      makeStubbedGoogleHttpTransport({
        routes: [{ match: '/events', status: 403, body: {} }],
      }),
    )
    await expect(
      service.createEvent({ accessToken: accessTokenFixture, request }),
    ).rejects.toMatchObject({ kind: 'forbidden' })
  })

  it('never sends the token in the request body (SEC-5)', async () => {
    const recorded: RecordedGoogleRequest[] = []
    const service = makeLiveGoogleCalendarApiService(
      makeStubbedGoogleHttpTransport({
        recorded,
        routes: [{ match: '/events', body: { id: 'x' } }],
      }),
    )
    await service.createEvent({ accessToken: accessTokenFixture, request })
    expect(recorded[0]?.body).not.toContain(accessTokenFixture)
    expect(recorded[0]?.url).not.toContain(accessTokenFixture)
  })
})
