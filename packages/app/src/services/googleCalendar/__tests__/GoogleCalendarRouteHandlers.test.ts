/**
 * The `/api/google/**` Producers, tested as pure functions over injected
 * services (`RC-43`) — no HTTP server, no Next.js runtime, and no network.
 */
import { describe, expect, it } from 'vitest'
import { makeRecordEnvironment } from '../../supabase/SupabaseEnvironment'
import {
  type RecordedGoogleRequest,
  makeLiveGoogleCalendarApiService,
  makeStubbedGoogleHttpTransport,
} from '../GoogleCalendarApiService'
import {
  GOOGLE_OAUTH_COOKIE,
  GOOGLE_TOKEN_COOKIE,
  readCookie,
  serializeHandshake,
} from '../GoogleCalendarCookies'
import {
  googleCalendarEnvironmentFrom,
  googleCalendarEnvironmentVariableNames as names,
} from '../GoogleCalendarEnvironment'
import {
  GOOGLE_CONNECTED_DESTINATION,
  GOOGLE_FAILED_DESTINATION,
  type GoogleRouteDependencies,
  completeGoogleAuthorization,
  disconnectGoogle,
  googleConnectionStatus,
  googleRedirectUriFor,
  googleRouteResponseFrom,
  googleRouteStatusFor,
  listGoogleCalendars,
  listGoogleEvents,
  logGoogleSession,
  parseGoogleEventsQuery,
  resolveGoogleAccessToken,
  resolveGoogleConnection,
  startGoogleAuthorization,
} from '../GoogleCalendarRouteHandlers'
import {
  type StubbedGoogleOAuthOptions,
  makeStubbedGoogleOAuthService,
} from '../GoogleOAuthService'
import { ambientCryptoSource, makeStubbedTokenVault } from '../GoogleTokenVault'
import fixtures from '../google.fixtures.json'

const crypto = ambientCryptoSource()
if (crypto === null) throw new Error('This suite needs Web Crypto.')

const CONFIGURED = {
  [names.clientId]: 'client-id.apps.googleusercontent.com',
  [names.clientSecret]: 'not-a-real-value',
  [names.tokenKey]: 'not-a-real-key',
}

const calendarListBody = {
  items: [{ id: 'primary', summary: 'Sergio', primary: true }],
}

const makeDeps = (
  overrides: {
    readonly configured?: boolean
    readonly oauth?: StubbedGoogleOAuthOptions
    readonly recorded?: RecordedGoogleRequest[]
    readonly eventsStatus?: number
  } = {},
): GoogleRouteDependencies => ({
  environment: googleCalendarEnvironmentFrom(
    makeRecordEnvironment(overrides.configured === false ? {} : CONFIGURED),
  ),
  vault: makeStubbedTokenVault(),
  oauth: makeStubbedGoogleOAuthService(overrides.oauth),
  api: makeLiveGoogleCalendarApiService(
    makeStubbedGoogleHttpTransport({
      ...(overrides.recorded === undefined
        ? {}
        : { recorded: overrides.recorded }),
      routes: [
        { match: 'calendarList', body: calendarListBody },
        // `events.insert` answers a single event; `events.list` answers a page.
        {
          match: '/events',
          method: 'POST',
          status: 200,
          body: { id: 'created-session-event' },
        },
        {
          match: '/events',
          method: 'GET',
          status: overrides.eventsStatus ?? 200,
          body: fixtures.eventListResponse,
        },
      ],
    }),
  ),
  crypto,
})

/** A request carrying a sealed refresh token, as a connected browser would. */
const connectedRequest = async (url = 'https://kro.app/api/google/events') => {
  const sealed = await makeStubbedTokenVault().seal('stored-refresh-token')
  return { url, cookieHeader: `${GOOGLE_TOKEN_COOKIE}=${sealed}` }
}

// ---------------------------------------------------------------------------

describe('mapping a failure to an HTTP status', () => {
  it('gives needsReconnect its OWN status, distinct from 401', () => {
    // 409, not 401: the Kro session is fine; the Google grant is gone. A
    // browser's auth machinery must not confuse the two.
    expect(googleRouteStatusFor({ kind: 'needsReconnect' } as never)).toBe(409)
    expect(googleRouteStatusFor({ kind: 'notConnected' } as never)).toBe(401)
  })

  it('reports an unconfigured deployment as 503, not 500', () => {
    expect(googleRouteStatusFor({ kind: 'unconfigured' } as never)).toBe(503)
  })

  it('reports a bad request as 400', () => {
    expect(googleRouteStatusFor({ kind: 'invalidRequest' } as never)).toBe(400)
  })

  it('carries the whole typed exception into the body, so the client keeps the kind', () => {
    const response = googleRouteResponseFrom({
      ok: false,
      error: { kind: 'needsReconnect', message: 'detail', recoverable: true },
    })
    expect(response.status).toBe(409)
    expect(response.body).toEqual({
      error: { kind: 'needsReconnect', message: 'detail', recoverable: true },
    })
  })
})

describe('starting authorization', () => {
  it('redirects to Google with state and a PKCE challenge', async () => {
    const result = await startGoogleAuthorization(
      { url: 'https://kro.app/api/google/connect', cookieHeader: null },
      makeDeps(),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const redirect = new URL(result.value.redirectTo ?? '')
    expect(redirect.host).toBe('accounts.google.com')
    expect(redirect.searchParams.get('state')).toBeTruthy()
    expect(redirect.searchParams.get('code_challenge')).toBeTruthy()
  })

  it('seals the state and verifier into a short-lived HttpOnly cookie', async () => {
    const result = await startGoogleAuthorization(
      { url: 'https://kro.app/api/google/connect', cookieHeader: null },
      makeDeps(),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const [cookie] = result.value.setCookies
    expect(cookie).toContain(GOOGLE_OAUTH_COOKIE)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Max-Age=600')
    expect(cookie).toContain('Secure')
  })

  it('NEVER puts the verifier in the redirect URL (SEC-5)', async () => {
    const deps = makeDeps()
    const result = await startGoogleAuthorization(
      { url: 'https://kro.app/api/google/connect', cookieHeader: null },
      deps,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const sealed = readCookie(
      (result.value.setCookies[0] ?? '').replace(/;.*$/, ''),
      GOOGLE_OAUTH_COOKIE,
    )
    const opened = await deps.vault.open(sealed ?? '')
    const verifier = (opened ?? '').split('\n')[1] ?? ''
    expect(verifier.length).toBeGreaterThan(0)
    expect(result.value.redirectTo).not.toContain(verifier)
  })

  it('refuses on an unconfigured deployment instead of building a broken URL', async () => {
    const result = await startGoogleAuthorization(
      { url: 'https://kro.app/api/google/connect', cookieHeader: null },
      makeDeps({ configured: false }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.kind).toBe('unconfigured')
  })

  it('derives the redirect URI from the request origin when none is configured', () => {
    expect(
      googleRedirectUriFor(
        {
          url: 'https://preview.kro.app/api/google/connect',
          cookieHeader: null,
        },
        null,
      ),
    ).toBe('https://preview.kro.app/api/google/callback')
  })

  it('prefers an explicitly configured redirect URI', () => {
    expect(
      googleRedirectUriFor(
        {
          url: 'https://preview.kro.app/api/google/connect',
          cookieHeader: null,
        },
        'https://kro.app/api/google/callback',
      ),
    ).toBe('https://kro.app/api/google/callback')
  })
})

describe('completing authorization', () => {
  const handshakeCookie = async (state: string) => {
    const sealed = await makeStubbedTokenVault().seal(
      serializeHandshake({
        state,
        verifier: 'verifier-value',
        redirectUri: 'https://kro.app/api/google/callback',
      }),
    )
    return `${GOOGLE_OAUTH_COOKIE}=${sealed}`
  }

  it('stores the refresh token and sends the browser to Integrations', async () => {
    const result = await completeGoogleAuthorization(
      {
        url: 'https://kro.app/api/google/callback?code=auth-code&state=s1',
        cookieHeader: await handshakeCookie('s1'),
      },
      makeDeps(),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.redirectTo).toBe(GOOGLE_CONNECTED_DESTINATION)
    expect(
      result.value.setCookies.some((cookie) =>
        cookie.startsWith(`${GOOGLE_TOKEN_COOKIE}=`),
      ),
    ).toBe(true)
  })

  it('clears the handshake cookie on the success path too', async () => {
    const result = await completeGoogleAuthorization(
      {
        url: 'https://kro.app/api/google/callback?code=auth-code&state=s1',
        cookieHeader: await handshakeCookie('s1'),
      },
      makeDeps(),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(
      result.value.setCookies.some(
        (cookie) =>
          cookie.startsWith(`${GOOGLE_OAUTH_COOKIE}=`) &&
          cookie.includes('Max-Age=0'),
      ),
    ).toBe(true)
  })

  it('REFUSES a mismatched state — the CSRF check', async () => {
    const result = await completeGoogleAuthorization(
      {
        url: 'https://kro.app/api/google/callback?code=auth-code&state=attacker',
        cookieHeader: await handshakeCookie('s1'),
      },
      makeDeps(),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.redirectTo).toBe(GOOGLE_FAILED_DESTINATION)
    expect(
      result.value.setCookies.some((cookie) =>
        cookie.startsWith(`${GOOGLE_TOKEN_COOKIE}=`),
      ),
    ).toBe(false)
  })

  it('refuses when Google issued no refresh token — there is nothing to store', async () => {
    const result = await completeGoogleAuthorization(
      {
        url: 'https://kro.app/api/google/callback?code=auth-code&state=s1',
        cookieHeader: await handshakeCookie('s1'),
      },
      makeDeps({ oauth: { refreshToken: null } }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.redirectTo).toBe(GOOGLE_FAILED_DESTINATION)
  })

  it('handles the user pressing Cancel on Google’s consent screen', async () => {
    const result = await completeGoogleAuthorization(
      {
        url: 'https://kro.app/api/google/callback?error=access_denied',
        cookieHeader: await handshakeCookie('s1'),
      },
      makeDeps(),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.redirectTo).toBe(GOOGLE_FAILED_DESTINATION)
  })

  it('handles an expired handshake cookie', async () => {
    const result = await completeGoogleAuthorization(
      {
        url: 'https://kro.app/api/google/callback?code=c&state=s1',
        cookieHeader: null,
      },
      makeDeps(),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.redirectTo).toBe(GOOGLE_FAILED_DESTINATION)
  })

  it('NEVER redirects anywhere the request asked for (open-redirect guard)', async () => {
    const result = await completeGoogleAuthorization(
      {
        url: 'https://kro.app/api/google/callback?code=c&state=s1&next=https://evil.example',
        cookieHeader: await handshakeCookie('s1'),
      },
      makeDeps(),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.redirectTo).toBe(GOOGLE_CONNECTED_DESTINATION)
    expect(result.value.redirectTo).not.toContain('evil.example')
  })

  it('never puts the authorization code in the redirect (SEC-5)', async () => {
    const result = await completeGoogleAuthorization(
      {
        url: 'https://kro.app/api/google/callback?code=super-secret-code&state=s1',
        cookieHeader: await handshakeCookie('s1'),
      },
      makeDeps(),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.redirectTo).not.toContain('super-secret-code')
  })
})

describe('resolving an access token', () => {
  it('mints one from the sealed refresh token', async () => {
    const result = await resolveGoogleAccessToken(
      await connectedRequest(),
      makeDeps(),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.accessToken).toBe('stub-access-token')
    // The sliding lifetime is real only if a successful use re-arms it.
    expect(result.value.renewedCookie).toContain('kro_gcal=')
    expect(result.value.renewedCookie).toContain('Max-Age=')
    expect(result.value.renewedCookie).toContain('HttpOnly')
  })

  it('reports notConnected when there is no credential cookie', async () => {
    const result = await resolveGoogleAccessToken(
      { url: 'https://kro.app/api/google/events', cookieHeader: null },
      makeDeps(),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.kind).toBe('notConnected')
  })

  it('reports needsReconnect when the cookie will not open (a rotated key)', async () => {
    // Offering "Connect" here would silently overwrite a cookie the app could
    // not read; "Reconnect" is the honest offer.
    const result = await resolveGoogleAccessToken(
      {
        url: 'https://kro.app/api/google/events',
        cookieHeader: `${GOOGLE_TOKEN_COOKIE}=someone-elses-value`,
      },
      makeDeps(),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.kind).toBe('needsReconnect')
  })

  it('reports needsReconnect when Google rejects the refresh token', async () => {
    const result = await resolveGoogleAccessToken(
      await connectedRequest(),
      makeDeps({ oauth: { refreshOutcome: 'invalidGrant' } }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.kind).toBe('needsReconnect')
  })

  it('reports unconfigured before it ever looks at a cookie', async () => {
    const result = await resolveGoogleAccessToken(
      await connectedRequest(),
      makeDeps({ configured: false }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.kind).toBe('unconfigured')
  })
})

describe('the connection status route', () => {
  it('reports unconfigured on a deployment with no Google client', async () => {
    const result = await googleConnectionStatus(
      { url: 'https://kro.app/api/google/status', cookieHeader: null },
      makeDeps({ configured: false }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.body).toMatchObject({ kind: 'unconfigured' })
  })

  it('reports disconnected when the user has never connected', async () => {
    const connection = await resolveGoogleConnection(
      { url: 'https://kro.app/api/google/status', cookieHeader: null },
      makeDeps(),
    )
    expect(connection.kind).toBe('disconnected')
  })

  it('reports connected, with the granted scopes', async () => {
    const connection = await resolveGoogleConnection(
      await connectedRequest('https://kro.app/api/google/status'),
      makeDeps(),
    )
    expect(connection.kind).toBe('connected')
    if (connection.kind !== 'connected') return
    expect(connection.scopes).toEqual([
      'https://www.googleapis.com/auth/calendar',
    ])
  })

  it('reports needsReconnect when Google has revoked the grant', async () => {
    // Acceptance criterion 2. A cookie-only check would report `connected`
    // here forever and the banner would never appear.
    const connection = await resolveGoogleConnection(
      await connectedRequest('https://kro.app/api/google/status'),
      makeDeps({ oauth: { refreshOutcome: 'invalidGrant' } }),
    )
    expect(connection.kind).toBe('needsReconnect')
  })

  it('does NOT report needsReconnect for a transient network failure', async () => {
    // A banner that appears on every hiccup trains the user to ignore it.
    const connection = await resolveGoogleConnection(
      await connectedRequest('https://kro.app/api/google/status'),
      makeDeps({ oauth: { refreshOutcome: 'offline' } }),
    )
    expect(connection.kind).toBe('connected')
  })

  it('never puts a token in the answer (SEC-5)', async () => {
    const result = await googleConnectionStatus(
      await connectedRequest('https://kro.app/api/google/status'),
      makeDeps(),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const serialised = JSON.stringify(result.value.body)
    expect(serialised).not.toContain('stub-access-token')
    expect(serialised).not.toContain('stored-refresh-token')
  })
})

describe('the events route', () => {
  it('reads the window from the query string', () => {
    const parsed = parseGoogleEventsQuery(
      'https://kro.app/api/google/events?from=2026-08-31T00:00:00Z&to=2026-09-01T00:00:00Z',
    )
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.from.toISOString()).toBe('2026-08-31T00:00:00.000Z')
  })

  it('refuses a request missing either bound', () => {
    const parsed = parseGoogleEventsQuery(
      'https://kro.app/api/google/events?from=2026-08-31T00:00:00Z',
    )
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.error.kind).toBe('invalidRequest')
  })

  it('refuses a window that does not move forward', () => {
    expect(
      parseGoogleEventsQuery(
        'https://kro.app/api/google/events?from=2026-09-01T00:00:00Z&to=2026-08-31T00:00:00Z',
      ).ok,
    ).toBe(false)
  })

  it('answers the calendar-paired envelopes for a connected user', async () => {
    const request = await connectedRequest(
      'https://kro.app/api/google/events?from=2026-08-31T00:00:00Z&to=2026-09-01T00:00:00Z',
    )
    const result = await listGoogleEvents(request, makeDeps())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const body = result.value.body as { events: readonly unknown[] }
    expect(body.events).toHaveLength(2)
  })

  it('validates the query BEFORE it spends a token refresh', async () => {
    const calls: string[] = []
    const result = await listGoogleEvents(
      await connectedRequest('https://kro.app/api/google/events'),
      makeDeps({ oauth: { calls } }),
    )
    expect(result.ok).toBe(false)
    expect(calls).toEqual([])
  })

  it('surfaces needsReconnect so the banner can appear', async () => {
    const request = await connectedRequest(
      'https://kro.app/api/google/events?from=2026-08-31T00:00:00Z&to=2026-09-01T00:00:00Z',
    )
    const result = await listGoogleEvents(
      request,
      makeDeps({ oauth: { refreshOutcome: 'invalidGrant' } }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.kind).toBe('needsReconnect')
  })

  it('never puts a token in a request URL it builds (SEC-5)', async () => {
    const recorded: RecordedGoogleRequest[] = []
    const request = await connectedRequest(
      'https://kro.app/api/google/events?from=2026-08-31T00:00:00Z&to=2026-09-01T00:00:00Z',
    )
    await listGoogleEvents(request, makeDeps({ recorded }))
    expect(recorded.length).toBeGreaterThan(0)
    for (const call of recorded) {
      expect(call.url).not.toContain('stub-access-token')
      expect(call.headers.authorization).toBe('Bearer stub-access-token')
    }
  })
})

describe('the calendars route', () => {
  it('answers the flattened inventory', async () => {
    const result = await listGoogleCalendars(
      await connectedRequest('https://kro.app/api/google/calendars'),
      makeDeps(),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.body).toEqual({
      calendars: [
        { id: 'primary', name: 'Sergio', isPrimary: true, isSelected: true },
      ],
    })
  })

  it('refuses when the user is not connected', async () => {
    const result = await listGoogleCalendars(
      { url: 'https://kro.app/api/google/calendars', cookieHeader: null },
      makeDeps(),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.kind).toBe('notConnected')
  })

  it('refuses on an unconfigured deployment', async () => {
    const result = await listGoogleCalendars(
      { url: 'https://kro.app/api/google/calendars', cookieHeader: null },
      makeDeps({ configured: false }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.kind).toBe('unconfigured')
  })
})

describe('the session-logging route', () => {
  const body = {
    intention: 'Ship the calendar host',
    start: '2026-08-31T09:00:00.000Z',
    end: '2026-08-31T09:25:00.000Z',
    timeZone: 'America/Bogota',
  }

  it('creates the canon-shaped event and answers 201', async () => {
    const recorded: RecordedGoogleRequest[] = []
    const request = {
      ...(await connectedRequest('https://kro.app/api/google/createEvent')),
      body,
    }
    const result = await logGoogleSession(request, makeDeps({ recorded }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.status).toBe(201)
    const sent = JSON.parse(recorded.at(-1)?.body ?? '{}')
    expect(sent.summary).toBe('Session: Ship the calendar host')
    expect(sent.start.dateTime).toBe('2026-08-31T09:00:00Z')
    expect(sent.end.dateTime).toBe('2026-08-31T09:25:00Z')
    expect(sent.start.timeZone).toBe('America/Bogota')
  })

  it('refuses a body that is not the four-field contract', async () => {
    const request = {
      ...(await connectedRequest('https://kro.app/api/google/createEvent')),
      body: { title: 'Session: legacy shape' },
    }
    const result = await logGoogleSession(request, makeDeps())
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.kind).toBe('invalidRequest')
  })

  it('validates the body BEFORE it spends a token refresh', async () => {
    const calls: string[] = []
    const request = {
      ...(await connectedRequest('https://kro.app/api/google/createEvent')),
      body: null,
    }
    await logGoogleSession(request, makeDeps({ oauth: { calls } }))
    expect(calls).toEqual([])
  })

  it('refuses a session that has not finished', async () => {
    const request = {
      ...(await connectedRequest('https://kro.app/api/google/createEvent')),
      body: { ...body, end: body.start },
    }
    const result = await logGoogleSession(request, makeDeps())
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.kind).toBe('invalidRequest')
  })

  it('refuses when the user is not connected', async () => {
    const result = await logGoogleSession(
      {
        url: 'https://kro.app/api/google/createEvent',
        cookieHeader: null,
        body,
      },
      makeDeps(),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.kind).toBe('notConnected')
  })
})

describe('the disconnect route', () => {
  it('revokes the grant and clears the credential cookie', async () => {
    const calls: string[] = []
    const result = await disconnectGoogle(
      await connectedRequest('https://kro.app/api/google/disconnect'),
      makeDeps({ oauth: { calls } }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(calls).toEqual(['revoke'])
    expect(result.value.body).toEqual({ revoked: true })
    expect(result.value.setCookies[0]).toContain('Max-Age=0')
  })

  it('clears the cookie EVEN when Google cannot be reached', async () => {
    // A user who asked to disconnect must end up disconnected; a network
    // failure at Google is not a reason to keep the credential.
    const result = await disconnectGoogle(
      await connectedRequest('https://kro.app/api/google/disconnect'),
      makeDeps({ oauth: { revokeOutcome: 'offline' } }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.body).toEqual({ revoked: false })
    expect(result.value.setCookies[0]).toContain('Max-Age=0')
  })

  it('is a no-op — not a failure — when there was nothing to disconnect', async () => {
    const result = await disconnectGoogle(
      { url: 'https://kro.app/api/google/disconnect', cookieHeader: null },
      makeDeps(),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.body).toEqual({ revoked: false })
  })

  it('clears an unreadable cookie rather than leaving it behind', async () => {
    const result = await disconnectGoogle(
      {
        url: 'https://kro.app/api/google/disconnect',
        cookieHeader: `${GOOGLE_TOKEN_COOKIE}=unreadable`,
      },
      makeDeps(),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.setCookies[0]).toContain('Max-Age=0')
  })
})
