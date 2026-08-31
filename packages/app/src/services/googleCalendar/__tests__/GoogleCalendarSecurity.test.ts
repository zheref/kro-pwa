/**
 * `SEC-5` proofs — **no token ever appears in a URL, a log call, or a
 * client-visible payload**.
 *
 * The per-module suites already assert this locally. This file is the
 * end-to-end version: it drives the whole integration — connect, callback,
 * status, events, calendars, session log, disconnect — through recording
 * doubles and then asserts, over **every recorded artefact at once**, that no
 * credential appears anywhere it must not.
 *
 * It exists because `SEC-5` is a property of the *system*, not of any one
 * function, and because the legacy files this issue replaces failed it exactly
 * there: `apps/web/src/domain/googleCalendar.ts` redirected to
 * `/session?token=<access token>` (a token in a URL, now deleted), and the
 * routes logged the OAuth token response and full event payloads (removed in
 * KC-PR-#37 at `71c7828`). Both failure modes are asserted against below.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeRecordEnvironment } from '../../supabase/SupabaseEnvironment'
import {
  type RecordedGoogleRequest,
  makeLiveGoogleCalendarApiService,
  makeStubbedGoogleHttpTransport,
} from '../GoogleCalendarApiService'
import {
  GOOGLE_TOKEN_COOKIE,
  readCookie,
  serializeHandshake,
} from '../GoogleCalendarCookies'
import {
  googleCalendarEnvironmentFrom,
  googleCalendarEnvironmentVariableNames as names,
} from '../GoogleCalendarEnvironment'
import type { GoogleRouteDependencies } from '../GoogleCalendarRouteHandlers'
import {
  completeGoogleAuthorization,
  disconnectGoogle,
  googleConnectionStatus,
  googleRouteResponseFrom,
  listGoogleCalendars,
  listGoogleEvents,
  logGoogleSession,
  startGoogleAuthorization,
} from '../GoogleCalendarRouteHandlers'
import {
  type GoogleFormTransport,
  makeLiveGoogleOAuthService,
} from '../GoogleOAuthService'
import { ambientCryptoSource, makeWebCryptoTokenVault } from '../GoogleTokenVault'
import fixtures from '../google.fixtures.json'

const crypto = ambientCryptoSource()
if (crypto === null) throw new Error('This suite needs Web Crypto.')

/** The four secrets that must never escape. Distinctive so a match is certain. */
const clientSecretFixture = 'SECRETVALUE-client-4f2a'
const refreshTokenFixture = 'SECRETVALUE-refresh-9c1d'
const accessTokenFixture = 'SECRETVALUE-access-77be'
const authCodeFixture = 'SECRETVALUE-code-a11e'
const tokenKeyFixture = 'SECRETVALUE-key-0d3f'

const allSecretFixtures = [
  clientSecretFixture,
  refreshTokenFixture,
  accessTokenFixture,
  authCodeFixture,
  tokenKeyFixture,
]

const ENVIRONMENT = {
  [names.clientId]: 'client-id.apps.googleusercontent.com',
  [names.clientSecret]: clientSecretFixture,
  [names.tokenKey]: tokenKeyFixture,
}

/** Everything that crossed a wire, in one place, for one sweep at the end. */
interface Ledger {
  readonly formCalls: { url: string; fields: Record<string, string> }[]
  readonly httpCalls: RecordedGoogleRequest[]
  /** Bodies and headers a browser would receive. */
  readonly clientVisible: string[]
}

const makeLedger = (): Ledger => ({
  formCalls: [],
  httpCalls: [],
  clientVisible: [],
})

const formTransport = (ledger: Ledger): GoogleFormTransport => ({
  async postForm(url, fields) {
    ledger.formCalls.push({ url, fields: { ...fields } })
    if (url.includes('revoke')) return { status: 200, body: {} }
    return {
      status: 200,
      body: {
        access_token: accessTokenFixture,
        refresh_token: refreshTokenFixture,
        expires_in: 3600,
        scope: 'https://www.googleapis.com/auth/calendar',
      },
    }
  },
})

const makeDeps = (ledger: Ledger): GoogleRouteDependencies => ({
  environment: googleCalendarEnvironmentFrom(makeRecordEnvironment(ENVIRONMENT)),
  vault: makeWebCryptoTokenVault({ secret: tokenKeyFixture, crypto }),
  oauth: makeLiveGoogleOAuthService({
    clientId: ENVIRONMENT[names.clientId] as string,
    clientSecret: clientSecretFixture,
    transport: formTransport(ledger),
  }),
  api: makeLiveGoogleCalendarApiService(
    makeStubbedGoogleHttpTransport({
      recorded: ledger.httpCalls,
      routes: [
        {
          match: 'calendarList',
          body: { items: [{ id: 'primary', summary: 'Sergio' }] },
        },
        { match: '/events', method: 'POST', body: { id: 'created-1' } },
        { match: '/events', method: 'GET', body: fixtures.eventListResponse },
      ],
    }),
  ),
  crypto,
})

/** Record everything a browser would see from one handler outcome. */
const recordClientVisible = (
  ledger: Ledger,
  outcome: ReturnType<typeof googleRouteResponseFrom>,
): void => {
  ledger.clientVisible.push(JSON.stringify(outcome.body ?? null))
  ledger.clientVisible.push(outcome.redirectTo ?? '')
  for (const cookie of outcome.setCookies) {
    // The cookie's *attributes* are client-visible; its sealed value is
    // asserted separately below (it must not be the plaintext token).
    ledger.clientVisible.push(cookie.replace(/^[^=]+=[^;]*/, ''))
  }
}

/** Drive the whole integration once, recording everything. */
const runWholeIntegration = async (ledger: Ledger) => {
  const deps = makeDeps(ledger)

  // 1. Connect.
  const connect = await startGoogleAuthorization(
    { url: 'https://kro.app/api/google/connect', cookieHeader: null },
    deps,
  )
  recordClientVisible(ledger, googleRouteResponseFrom(connect))

  // 2. Callback — with a handshake this vault can open.
  const handshake = await deps.vault.seal(
    serializeHandshake({
      state: 'state-1',
      verifier: 'verifier-1',
      redirectUri: 'https://kro.app/api/google/callback',
    }),
  )
  const callback = await completeGoogleAuthorization(
    {
      url: `https://kro.app/api/google/callback?code=${authCodeFixture}&state=state-1`,
      cookieHeader: `kro_gcal_oauth=${handshake}`,
    },
    deps,
  )
  recordClientVisible(ledger, googleRouteResponseFrom(callback))

  const credentialCookie = callback.ok
    ? (callback.value.setCookies.find((cookie) =>
        cookie.startsWith(`${GOOGLE_TOKEN_COOKIE}=`),
      ) ?? '')
    : ''
  const sealed = readCookie(
    credentialCookie.replace(/;.*$/, ''),
    GOOGLE_TOKEN_COOKIE,
  )
  const connected = {
    url: 'https://kro.app/api/google',
    cookieHeader: `${GOOGLE_TOKEN_COOKIE}=${sealed}`,
  }

  // 3–7. Every authenticated operation.
  recordClientVisible(
    ledger,
    googleRouteResponseFrom(
      await googleConnectionStatus(
        { ...connected, url: 'https://kro.app/api/google/status' },
        deps,
      ),
    ),
  )
  recordClientVisible(
    ledger,
    googleRouteResponseFrom(
      await listGoogleEvents(
        {
          ...connected,
          url: 'https://kro.app/api/google/events?from=2026-08-31T00:00:00Z&to=2026-09-01T00:00:00Z',
        },
        deps,
      ),
    ),
  )
  recordClientVisible(
    ledger,
    googleRouteResponseFrom(
      await listGoogleCalendars(
        { ...connected, url: 'https://kro.app/api/google/calendars' },
        deps,
      ),
    ),
  )
  recordClientVisible(
    ledger,
    googleRouteResponseFrom(
      await logGoogleSession(
        {
          ...connected,
          url: 'https://kro.app/api/google/createEvent',
          body: {
            intention: 'Ship the calendar host',
            start: '2026-08-31T09:00:00.000Z',
            end: '2026-08-31T09:25:00.000Z',
            timeZone: 'UTC',
          },
        },
        deps,
      ),
    ),
  )
  recordClientVisible(
    ledger,
    googleRouteResponseFrom(
      await disconnectGoogle(
        { ...connected, url: 'https://kro.app/api/google/disconnect' },
        deps,
      ),
    ),
  )

  return { sealed, credentialCookie }
}

describe('SEC-5 — no credential reaches a URL', () => {
  it('leaves every secret out of every URL the integration builds', async () => {
    const ledger = makeLedger()
    await runWholeIntegration(ledger)

    const urls = [
      ...ledger.formCalls.map((call) => call.url),
      ...ledger.httpCalls.map((call) => call.url),
    ]
    expect(urls.length).toBeGreaterThan(5)
    for (const url of urls) {
      for (const secret of allSecretFixtures) expect(url).not.toContain(secret)
    }
  })

  it('leaves every secret out of every redirect Location', async () => {
    // The exact defect the deleted `apps/web/src/domain/googleCalendar.ts`
    // shipped: `res.redirect('/session?token=' + data.access_token)`.
    const ledger = makeLedger()
    await runWholeIntegration(ledger)
    for (const value of ledger.clientVisible) {
      for (const secret of allSecretFixtures) expect(value).not.toContain(secret)
    }
  })

  it('sends the client secret only as a form field, never as a query parameter', async () => {
    const ledger = makeLedger()
    await runWholeIntegration(ledger)
    const exchange = ledger.formCalls[0]
    expect(exchange?.fields.client_secret).toBe(clientSecretFixture)
    expect(exchange?.url).not.toContain('?')
  })
})

describe('SEC-5 — no credential reaches a log', () => {
  const spies: ReturnType<typeof vi.spyOn>[] = []

  beforeEach(() => {
    for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
      spies.push(vi.spyOn(console, method).mockImplementation(() => {}))
    }
  })

  afterEach(() => {
    for (const spy of spies) spy.mockRestore()
    spies.length = 0
  })

  it('never calls console AT ALL across the whole integration', async () => {
    // Not "never logs a token" — never logs. The legacy routes' problem was
    // that a log line existed at all; the payload it carried was incidental.
    await runWholeIntegration(makeLedger())
    for (const spy of spies) expect(spy).not.toHaveBeenCalled()
  })

  it('keeps every secret out of the failure messages it does produce', async () => {
    const ledger = makeLedger()
    const deps = makeDeps(ledger)
    // Force the failure paths: no credential cookie, then an unreadable one.
    const outcomes = [
      googleRouteResponseFrom(
        await listGoogleEvents(
          {
            url: 'https://kro.app/api/google/events?from=2026-08-31T00:00:00Z&to=2026-09-01T00:00:00Z',
            cookieHeader: null,
          },
          deps,
        ),
      ),
      googleRouteResponseFrom(
        await listGoogleCalendars(
          {
            url: 'https://kro.app/api/google/calendars',
            cookieHeader: `${GOOGLE_TOKEN_COOKIE}=someone-elses-value`,
          },
          deps,
        ),
      ),
    ]
    for (const outcome of outcomes) {
      const serialised = JSON.stringify(outcome.body)
      for (const secret of allSecretFixtures) {
        expect(serialised).not.toContain(secret)
      }
    }
  })
})

describe('SEC-5 — no credential reaches the browser', () => {
  it('keeps every secret out of every response body', async () => {
    const ledger = makeLedger()
    await runWholeIntegration(ledger)
    const bodies = ledger.clientVisible.join('\n')
    expect(bodies.length).toBeGreaterThan(0)
    for (const secret of allSecretFixtures) expect(bodies).not.toContain(secret)
  })

  it('stores the refresh token SEALED, never in the clear', async () => {
    const ledger = makeLedger()
    const { sealed, credentialCookie } = await runWholeIntegration(ledger)
    expect(sealed).toBeTruthy()
    expect(sealed).not.toContain(refreshTokenFixture)
    expect(credentialCookie).not.toContain(refreshTokenFixture)
  })

  it('marks the credential cookie HttpOnly, so no script can read it', async () => {
    const ledger = makeLedger()
    const { credentialCookie } = await runWholeIntegration(ledger)
    expect(credentialCookie).toContain('HttpOnly')
    expect(credentialCookie).toContain('Secure')
    expect(credentialCookie).toContain('SameSite=Lax')
  })

  it('never stores the ACCESS token anywhere at all', async () => {
    // Only the refresh token is persisted; the access token lives for the
    // duration of one request. A stolen cookie yields something revocation
    // kills, not a bearer token with an hour of life.
    const ledger = makeLedger()
    const { sealed } = await runWholeIntegration(ledger)
    const deps = makeDeps(ledger)
    const opened = await deps.vault.open(sealed ?? '')
    expect(opened).toBe(refreshTokenFixture)
    expect(opened).not.toContain(accessTokenFixture)
  })

  it('sends the access token to Google as a header and nowhere else', async () => {
    const ledger = makeLedger()
    await runWholeIntegration(ledger)
    expect(ledger.httpCalls.length).toBeGreaterThan(0)
    for (const call of ledger.httpCalls) {
      expect(call.url).not.toContain(accessTokenFixture)
      expect(call.body ?? '').not.toContain(accessTokenFixture)
      expect(call.headers.authorization).toBe(`Bearer ${accessTokenFixture}`)
    }
  })
})

describe('SEC-5 — the client tier structurally cannot leak a token', () => {
  it('exposes no operation that accepts or returns one', async () => {
    // The strongest form of the proof: `GoogleCalendarService` — the binding
    // registered in `ThunkExtra` and reachable from a Producer — has no token
    // parameter and no token in any answer. The reviewer can check this by
    // reading the interface; this pins it.
    const { makeStubbedGoogleCalendarService } = await import(
      '../GoogleCalendarService'
    )
    const { GoogleCalendarConnections } = await import('../GoogleCalendarConnection')
    const service = makeStubbedGoogleCalendarService({
      connection: GoogleCalendarConnections.connected(['calendar']),
    })

    const answers = [
      JSON.stringify(await service.connection()),
      JSON.stringify(
        await service.fetchRange({
          start: new Date('2026-08-31T00:00:00Z'),
          end: new Date('2026-09-01T00:00:00Z'),
        }),
      ),
      JSON.stringify(await service.listCalendars()),
      service.authorizationPath(),
    ].join('\n')

    for (const secret of allSecretFixtures) expect(answers).not.toContain(secret)
    expect(answers).not.toMatch(/access_token|refresh_token|Bearer /)
  })
})
