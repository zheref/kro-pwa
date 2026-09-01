import { EndeavorHost, EndeavorKind } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  GoogleCalendarConnections,
  GoogleReconnectReason,
} from '../GoogleCalendarConnection'
import { GoogleCalendarExceptions } from '../GoogleCalendarException'
import {
  type KroApiTransport,
  googleApiPaths,
  makeLiveGoogleCalendarService,
  makeStubbedGoogleCalendarService,
  proxyFailureFrom,
  stubbedGoogleCalendarService,
} from '../GoogleCalendarService'
import fixtures from '../google.fixtures.json'

const DAY = {
  start: new Date('2026-08-31T00:00:00Z'),
  end: new Date('2026-09-01T00:00:00Z'),
}

interface RecordedCall {
  readonly method: 'GET' | 'POST'
  readonly path: string
  readonly body?: unknown
}

/** A transport double that records every call and answers from a route table. */
const proxyTransport = (
  routes: readonly {
    readonly match: string
    readonly status?: number
    readonly body?: unknown
  }[],
  recorded: RecordedCall[] = [],
): KroApiTransport => {
  const answer = (path: string) => {
    for (const route of routes) {
      if (path.includes(route.match)) {
        return { status: route.status ?? 200, body: route.body ?? null }
      }
    }
    return { status: 404, body: null }
  }
  return {
    async get(path) {
      recorded.push({ method: 'GET', path })
      return answer(path)
    },
    async post(path, body) {
      recorded.push({ method: 'POST', path, body })
      return answer(path)
    },
  }
}

describe('reading the connection state', () => {
  it('reports what the status route said', async () => {
    const service = makeLiveGoogleCalendarService({
      transport: proxyTransport([
        {
          match: googleApiPaths.status,
          body: { kind: 'connected', scopes: ['calendar'] },
        },
      ]),
    })
    expect(await service.connection()).toEqual(
      GoogleCalendarConnections.connected(['calendar']),
    )
  })

  it('reports needsReconnect when the route says so, not a bare 409', async () => {
    const service = makeLiveGoogleCalendarService({
      transport: proxyTransport([
        {
          match: googleApiPaths.status,
          body: {
            kind: 'needsReconnect',
            reason: GoogleReconnectReason.expired,
          },
        },
      ]),
    })
    const connection = await service.connection()
    expect(connection.kind).toBe('needsReconnect')
  })

  it('refuses an unreadable body rather than guessing at the state', async () => {
    const service = makeLiveGoogleCalendarService({
      transport: proxyTransport([
        { match: googleApiPaths.status, body: '<html>' },
      ]),
    })
    await expect(service.connection()).rejects.toMatchObject({
      kind: 'malformedResponse',
    })
  })

  it('surfaces a transport failure as offline', async () => {
    const service = makeLiveGoogleCalendarService({
      transport: {
        get: () => Promise.reject(new TypeError('Failed to fetch')),
        post: () => Promise.reject(new TypeError('Failed to fetch')),
      },
    })
    await expect(service.connection()).rejects.toMatchObject({
      kind: 'offline',
    })
  })
})

describe('fetching a day range', () => {
  it('maps the proxy’s envelopes to endeavors hosted by Google', async () => {
    const service = makeLiveGoogleCalendarService({
      transport: proxyTransport([
        { match: googleApiPaths.events, body: fixtures.events },
      ]),
    })
    const endeavors = await service.fetchRange(DAY)
    expect(endeavors.length).toBeGreaterThan(0)
    for (const endeavor of endeavors) {
      expect(endeavor.kind).toBe(EndeavorKind.calendarEvent)
      expect(endeavor.hostedBy).toEqual([EndeavorHost.googleCalendar])
    }
  })

  it('drops the cancelled fixture on the way through', async () => {
    const service = makeLiveGoogleCalendarService({
      transport: proxyTransport([
        { match: googleApiPaths.events, body: fixtures.events },
      ]),
    })
    const ids = (await service.fetchRange(DAY)).map((endeavor) => endeavor.id)
    expect(ids).not.toContain('gcal-cancelled-2026-08-31')
  })

  it('sends the window as ISO instants in the query', async () => {
    const recorded: RecordedCall[] = []
    const service = makeLiveGoogleCalendarService({
      transport: proxyTransport(
        [{ match: googleApiPaths.events, body: { events: [] } }],
        recorded,
      ),
    })
    await service.fetchRange(DAY)
    expect(recorded[0]?.path).toContain(
      `from=${encodeURIComponent(DAY.start.toISOString())}`,
    )
    expect(recorded[0]?.path).toContain(
      `to=${encodeURIComponent(DAY.end.toISOString())}`,
    )
  })

  it('answers an empty day for an unconfigured deployment, not a failure', async () => {
    // A Plan preload that failed because Google is not set up would be a
    // failure the user cannot act on.
    const service = makeLiveGoogleCalendarService({
      transport: proxyTransport([
        {
          match: googleApiPaths.events,
          status: 503,
          body: { error: GoogleCalendarExceptions.unconfigured([]) },
        },
      ]),
    })
    expect(await service.fetchRange(DAY)).toEqual([])
  })

  it('answers an empty day when the user has never connected', async () => {
    const service = makeLiveGoogleCalendarService({
      transport: proxyTransport([
        {
          match: googleApiPaths.events,
          status: 401,
          body: { error: GoogleCalendarExceptions.notConnected() },
        },
      ]),
    })
    expect(await service.fetchRange(DAY)).toEqual([])
  })

  it('DOES raise needsReconnect — that one has a button behind it', async () => {
    const service = makeLiveGoogleCalendarService({
      transport: proxyTransport([
        {
          match: googleApiPaths.events,
          status: 409,
          body: { error: GoogleCalendarExceptions.needsReconnect() },
        },
      ]),
    })
    await expect(service.fetchRange(DAY)).rejects.toMatchObject({
      kind: 'needsReconnect',
    })
  })

  it('answers an empty day for a window that does not move forward', async () => {
    const service = makeLiveGoogleCalendarService({
      transport: proxyTransport([]),
    })
    expect(
      await service.fetchRange({ start: DAY.end, end: DAY.start }),
    ).toEqual([])
  })
})

describe('listing calendars for the lens', () => {
  it('returns the flattened inventory', async () => {
    const service = makeLiveGoogleCalendarService({
      transport: proxyTransport([
        { match: googleApiPaths.calendars, body: fixtures.calendars },
      ]),
    })
    const calendars = await service.listCalendars()
    expect(calendars.map((calendar) => calendar.id)).toContain('primary')
    expect(
      calendars.find((calendar) => calendar.id === 'primary')?.isPrimary,
    ).toBe(true)
  })

  it('answers an empty inventory when not connected', async () => {
    const service = makeLiveGoogleCalendarService({
      transport: proxyTransport([
        {
          match: googleApiPaths.calendars,
          status: 401,
          body: { error: GoogleCalendarExceptions.notConnected() },
        },
      ]),
    })
    expect(await service.listCalendars()).toEqual([])
  })

  it('refuses an unreadable inventory', async () => {
    const service = makeLiveGoogleCalendarService({
      transport: proxyTransport([
        { match: googleApiPaths.calendars, body: { nope: [] } },
      ]),
    })
    await expect(service.listCalendars()).rejects.toMatchObject({
      kind: 'malformedResponse',
    })
  })
})

describe('logging a session', () => {
  const input = {
    intention: 'Ship the calendar host',
    start: new Date('2026-08-31T09:00:00Z'),
    end: new Date('2026-08-31T09:25:00Z'),
    timeZone: 'America/Bogota',
  }

  it('posts the intention, not a pre-formatted title', async () => {
    // Canon's "Session: <intention>" is composed server-side, where it is
    // tested — not in a caller's template literal.
    const recorded: RecordedCall[] = []
    const service = makeLiveGoogleCalendarService({
      transport: proxyTransport(
        [
          {
            match: googleApiPaths.createEvent,
            status: 201,
            body: fixtures.events,
          },
        ],
        recorded,
      ),
    })
    await service.logSession(input)
    expect(recorded[0]?.method).toBe('POST')
    expect(recorded[0]?.body).toEqual({
      intention: 'Ship the calendar host',
      start: '2026-08-31T09:00:00.000Z',
      end: '2026-08-31T09:25:00.000Z',
      timeZone: 'America/Bogota',
    })
  })

  it('returns the created event so a caller can record its id', async () => {
    const service = makeLiveGoogleCalendarService({
      transport: proxyTransport([
        {
          match: googleApiPaths.createEvent,
          status: 201,
          body: fixtures.events,
        },
      ]),
    })
    expect((await service.logSession(input)).event.id).toBe(
      'gcal-standup-2026-08-31',
    )
  })

  it('raises the typed failure the route reported', async () => {
    const service = makeLiveGoogleCalendarService({
      transport: proxyTransport([
        {
          match: googleApiPaths.createEvent,
          status: 409,
          body: { error: GoogleCalendarExceptions.needsReconnect() },
        },
      ]),
    })
    await expect(service.logSession(input)).rejects.toMatchObject({
      kind: 'needsReconnect',
    })
  })
})

describe('disconnecting', () => {
  it('posts to the disconnect route', async () => {
    const recorded: RecordedCall[] = []
    const service = makeLiveGoogleCalendarService({
      transport: proxyTransport(
        [{ match: googleApiPaths.disconnect, body: { revoked: true } }],
        recorded,
      ),
    })
    await service.disconnect()
    expect(recorded[0]).toMatchObject({
      method: 'POST',
      path: googleApiPaths.disconnect,
    })
  })

  it('raises when the route refuses', async () => {
    const service = makeLiveGoogleCalendarService({
      transport: proxyTransport([
        { match: googleApiPaths.disconnect, status: 502, body: null },
      ]),
    })
    await expect(service.disconnect()).rejects.toMatchObject({ kind: 'server' })
  })

  it('names the path a surface sends the browser to for authorization', async () => {
    const service = makeLiveGoogleCalendarService({
      transport: proxyTransport([]),
    })
    expect(service.authorizationPath()).toBe('/api/google/connect')
  })
})

describe('reconstructing a failure from the proxy', () => {
  it('recovers the typed kind the route sent', () => {
    expect(
      proxyFailureFrom(409, {
        error: GoogleCalendarExceptions.needsReconnect(),
      }).kind,
    ).toBe('needsReconnect')
  })

  it('falls back to the status when the body is not one of ours', () => {
    expect(proxyFailureFrom(429, { message: 'slow down' }).kind).toBe(
      'rateLimited',
    )
  })

  it('falls back to the status for an empty body', () => {
    expect(proxyFailureFrom(403, null).kind).toBe('forbidden')
  })
})

describe('the stubbed service', () => {
  it('is DISCONNECTED by default, so a suite sees shipping behaviour', async () => {
    expect((await stubbedGoogleCalendarService.connection()).kind).toBe(
      'disconnected',
    )
    expect(await stubbedGoogleCalendarService.fetchRange(DAY)).toEqual([])
  })

  it('serves fixture events once a suite says it is connected', async () => {
    const service = makeStubbedGoogleCalendarService({
      connection: GoogleCalendarConnections.connected(),
    })
    expect((await service.fetchRange(DAY)).length).toBeGreaterThan(0)
  })

  it('filters fixtures to the asked-for window', async () => {
    const service = makeStubbedGoogleCalendarService({
      connection: GoogleCalendarConnections.connected(),
    })
    const otherDay = {
      start: new Date('2026-09-05T00:00:00Z'),
      end: new Date('2026-09-06T00:00:00Z'),
    }
    expect(await service.fetchRange(otherDay)).toEqual([])
  })

  it('raises needsReconnect from a needsReconnect binding', async () => {
    const service = makeStubbedGoogleCalendarService({
      connection: GoogleCalendarConnections.needsReconnect(),
    })
    await expect(service.fetchRange(DAY)).rejects.toMatchObject({
      kind: 'needsReconnect',
    })
  })

  it('records calls so a Producer test can assert on the sequence', async () => {
    const calls: string[] = []
    const service = makeStubbedGoogleCalendarService({
      connection: GoogleCalendarConnections.connected(),
      calls,
    })
    await service.connection()
    await service.listCalendars()
    await service.disconnect()
    expect(calls).toEqual(['connection', 'listCalendars', 'disconnect'])
  })
})
