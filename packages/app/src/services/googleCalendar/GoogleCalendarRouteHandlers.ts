/**
 * The `/api/google/**` route handlers — **Producers**, per `RC-43`: *"Server
 * Actions and route handlers are Producers: they call Services and return a
 * `Result`."*
 *
 * Every handler here is a pure function of `(request data, injected services)`
 * returning `Promise<Result<GoogleRouteSuccess, GoogleCalendarException>>`. None
 * of them touches `Request`, `Response`, `NextResponse`, `next/headers` or any
 * global. The `route.ts` files in `apps/web` do exactly two things: adapt the
 * incoming `Request` into the plain record below, and turn the returned `Result`
 * into an HTTP response with `googleRouteResponseFrom`.
 *
 * ## Why they live here and not beside the routes
 *
 * KC-IS-#33's routed comment records the shape problem the rebuild must not
 * inherit: *"`listEvents.ts` is a non-route-style file inside `app/api`"*. A
 * helper module sitting in the App Router's directory looks like a route, is not
 * one, and is the thing that got flagged. So `apps/web/src/app/api/google/**`
 * contains **only** `route.ts` files (plus their co-located specs), and the
 * logic they delegate to lives in the service tier where it is testable with no
 * jsdom, no Next runtime, and no HTTP.
 *
 * ## SEC-5 — what these functions may and may not do
 *
 * - A refresh token exists here only between `vault.open(...)` and the
 *   `oauth.*` call that consumes it. It is never returned in a body, never put
 *   in `redirectTo`, never in an exception message.
 * - An **access** token exists only between the refresh and the API call. It is
 *   never stored, so a stolen cookie yields a refresh token that revocation
 *   kills, not a bearer token with an hour of life.
 * - `console` is never called. The legacy `createEvent` route logged the OAuth
 *   token response and full event payloads (removed in KC-PR-#37 at `71c7828`);
 *   the rebuilt routes carry no logging at all, and the SEC suite asserts it.
 * - Redirect targets are **never** taken from the request. An open redirect on
 *   an OAuth callback is how an authorization code gets stolen; the two
 *   destinations are constants below.
 *
 * ## The access token is minted per request, deliberately
 *
 * Only the *refresh* token is stored. Every call therefore spends one extra
 * round trip on `oauth.refresh(...)`. The alternative — sealing the access
 * token and its expiry alongside — saves that trip but pushes a ~2 KB bearer
 * token into a 4 KB cookie on every response, and leaves a live credential in
 * the browser's cookie store for an hour after a revoke. The round trip is the
 * cheaper thing to spend.
 */
import { type Result, err, ok } from '@kro/core'
import type { GoogleCalendarApiService } from './GoogleCalendarApiService'
import type { GoogleCalendarConnection } from './GoogleCalendarConnection'
import { GoogleCalendarConnections } from './GoogleCalendarConnection'
import {
  GOOGLE_OAUTH_COOKIE,
  GOOGLE_OAUTH_COOKIE_MAX_AGE,
  GOOGLE_TOKEN_COOKIE,
  GOOGLE_TOKEN_COOKIE_MAX_AGE,
  clearCookieHeader,
  parseHandshake,
  readCookie,
  serializeHandshake,
  setCookieHeader,
  shouldUseSecureCookies,
} from './GoogleCalendarCookies'
import type { GoogleCalendarEnvironment } from './GoogleCalendarEnvironment'
import {
  type GoogleCalendarException,
  GoogleCalendarExceptions,
  googleCalendarExceptionFrom,
} from './GoogleCalendarException'
import type { GoogleCalendarEventEnvelope } from './GoogleCalendarResponse'
import { googleCalendarSummariesFrom } from './GoogleCalendarResponse'
import { parseSessionCalendarLogInput } from './GoogleCalendarSessionEvent'
import { sessionCalendarEventRequest } from './GoogleCalendarSessionEvent'
import {
  GOOGLE_CALLBACK_PATH,
  type GoogleOAuthService,
  googleAuthorizationUrl,
  makePkcePair,
  parseGoogleCallbackUrl,
  randomUrlSafeString,
} from './GoogleOAuthService'
import type { CryptoSource, GoogleTokenVault } from './GoogleTokenVault'

/** Where the callback sends the browser. Constants — never request-derived. */
export const GOOGLE_CONNECTED_DESTINATION = '/integrations?google=connected'
export const GOOGLE_FAILED_DESTINATION = '/integrations?google=failed'

/** What a route file hands in. Plain data — no `Request`. */
export interface GoogleRouteRequest {
  /** The absolute request URL, used for query params and the cookie scheme. */
  readonly url: string
  /** The raw `Cookie` header, or `null`. */
  readonly cookieHeader: string | null
  /** The already-parsed JSON body, for POST routes. */
  readonly body?: unknown
}

/** What a route file turns into an HTTP response. */
export interface GoogleRouteSuccess {
  readonly status: number
  /** The JSON body, or `null` for a redirect. */
  readonly body: unknown
  readonly setCookies: readonly string[]
  /** A `Location`, or `null`. */
  readonly redirectTo: string | null
}

export type GoogleRouteResult = Result<
  GoogleRouteSuccess,
  GoogleCalendarException
>

/** Everything the handlers need from the outside (`RC-6`). */
export interface GoogleRouteDependencies {
  readonly environment: GoogleCalendarEnvironment
  readonly vault: GoogleTokenVault
  readonly oauth: GoogleOAuthService
  readonly api: GoogleCalendarApiService
  readonly crypto: CryptoSource
}

/** The `setCookies` extras carrying a sliding renewal, when one was minted. */
const renewalExtras = (
  access: GoogleResolvedAccess,
): Partial<GoogleRouteSuccess> =>
  access.renewedCookie === null ? {} : { setCookies: [access.renewedCookie] }

const json = (
  body: unknown,
  extras: Partial<GoogleRouteSuccess> = {},
): GoogleRouteSuccess => ({
  status: 200,
  body,
  setCookies: [],
  redirectTo: null,
  ...extras,
})

/**
 * The HTTP status a failure deserves.
 *
 * `needsReconnect` is **409**, not 401: 401 is what a browser's own auth
 * machinery reacts to, and this is not an authentication failure of the Kro
 * session — the user is signed in; their *Google grant* is gone. Giving it a
 * distinct status keeps the two apart for anything sitting between the browser
 * and the route.
 */
export const googleRouteStatusFor = (
  failure: GoogleCalendarException,
): number => {
  switch (failure.kind) {
    case 'unconfigured':
      return 503
    case 'notConnected':
      return 401
    case 'needsReconnect':
      return 409
    case 'unauthorized':
      return 401
    case 'forbidden':
      return 403
    case 'rateLimited':
      return 429
    case 'conflict':
      return 412
    case 'notFound':
      return 404
    case 'invalidRequest':
      return 400
    case 'offline':
    case 'server':
    case 'malformedResponse':
    case 'unknown':
      return 502
    default:
      return 500
  }
}

/**
 * The wire form of a failure.
 *
 * The whole exception crosses — `kind`, `message`, `recoverable` — because the
 * browser's `GoogleCalendarService` reconstructs it and needs the kind to tell
 * `needsReconnect` from an ordinary 4xx. That is safe precisely because
 * `GoogleCalendarException`'s factories build every message from fixed strings
 * plus at most a status code or a variable name; no response body, header or
 * URL ever reaches one.
 */
export const googleRouteResponseFrom = (
  result: GoogleRouteResult,
): {
  readonly status: number
  readonly body: unknown
  readonly setCookies: readonly string[]
  readonly redirectTo: string | null
} => {
  if (result.ok) return result.value
  return {
    status: googleRouteStatusFor(result.error),
    body: { error: result.error },
    setCookies: [],
    redirectTo: null,
  }
}

/** The configured client, or the typed `unconfigured` failure. */
const configurationOf = (deps: GoogleRouteDependencies) =>
  deps.environment.kind === 'configured'
    ? ok(deps.environment.configuration)
    : err(GoogleCalendarExceptions.unconfigured(deps.environment.missing))

/**
 * The redirect URI for this deployment.
 *
 * The configured value wins; otherwise it is derived from the request's own
 * origin, which is what makes a preview deployment work without a new
 * environment variable. Deriving from `request.url` is safe here — unlike a
 * *redirect target*, this value is only ever sent to Google, which rejects any
 * URI not registered on the client.
 */
export const googleRedirectUriFor = (
  request: GoogleRouteRequest,
  configured: string | null,
): string => {
  if (configured !== null) return configured
  return new URL(GOOGLE_CALLBACK_PATH, request.url).toString()
}

// ---------------------------------------------------------------------------
// Connect — GET /api/google/connect
// ---------------------------------------------------------------------------

/**
 * Start authorization: mint PKCE + `state`, seal them into a 10-minute cookie,
 * and redirect to Google's consent screen.
 *
 * The `state` is verified on the way back and the verifier is what proves the
 * exchange comes from the same browser that started the flow. Both live in a
 * cookie because the two halves of the flow are different serverless
 * invocations with no shared memory.
 */
export const startGoogleAuthorization = async (
  request: GoogleRouteRequest,
  deps: GoogleRouteDependencies,
): Promise<GoogleRouteResult> => {
  const configuration = configurationOf(deps)
  if (!configuration.ok) return configuration

  try {
    const redirectUri = googleRedirectUriFor(
      request,
      configuration.value.redirectUri,
    )
    const pkce = await makePkcePair(deps.crypto)
    const state = randomUrlSafeString(32, deps.crypto)
    const sealed = await deps.vault.seal(
      serializeHandshake({ state, verifier: pkce.verifier, redirectUri }),
    )

    return ok({
      status: 302,
      body: null,
      setCookies: [
        setCookieHeader(GOOGLE_OAUTH_COOKIE, sealed, {
          maxAge: GOOGLE_OAUTH_COOKIE_MAX_AGE,
          secure: shouldUseSecureCookies(request.url),
        }),
      ],
      redirectTo: googleAuthorizationUrl({
        clientId: configuration.value.clientId,
        redirectUri,
        state,
        challenge: pkce.challenge,
      }),
    })
  } catch (error) {
    return err(googleCalendarExceptionFrom(error))
  }
}

// ---------------------------------------------------------------------------
// Callback — GET /api/google/callback
// ---------------------------------------------------------------------------

/**
 * Finish authorization.
 *
 * Always redirects — a browser landed here from Google, so a JSON body would
 * be shown as text. Both destinations are constants (see the module note on
 * open redirects), and the handshake cookie is cleared on every path, success
 * or not, so a stale verifier cannot be replayed.
 *
 * A refresh token is **required**: without one there is nothing to store and
 * the connection would appear to succeed and then fail on the next request.
 * `prompt=consent` on the authorization URL is what guarantees Google issues
 * one even on a repeat grant.
 */
export const completeGoogleAuthorization = async (
  request: GoogleRouteRequest,
  deps: GoogleRouteDependencies,
): Promise<GoogleRouteResult> => {
  const secure = shouldUseSecureCookies(request.url)
  const clearHandshake = clearCookieHeader(GOOGLE_OAUTH_COOKIE, secure)

  const failed = (): GoogleRouteResult =>
    ok({
      status: 302,
      body: null,
      setCookies: [clearHandshake],
      redirectTo: GOOGLE_FAILED_DESTINATION,
    })

  const configuration = configurationOf(deps)
  if (!configuration.ok) return failed()

  const callback = parseGoogleCallbackUrl(request.url)
  if (!callback.ok) return failed()

  const sealedHandshake = readCookie(request.cookieHeader, GOOGLE_OAUTH_COOKIE)
  if (sealedHandshake === null) return failed()

  try {
    const opened = await deps.vault.open(sealedHandshake)
    if (opened === null) return failed()
    const handshake = parseHandshake(opened)
    if (handshake === null) return failed()
    // CSRF: the state Google echoed must be the one this browser started with.
    if (handshake.state !== callback.state) return failed()

    const tokens = await deps.oauth.exchangeCode({
      code: callback.code,
      verifier: handshake.verifier,
      redirectUri: handshake.redirectUri,
    })
    const refreshToken = tokens.refresh_token
    if (refreshToken === undefined || refreshToken.length === 0) {
      return failed()
    }

    const sealedToken = await deps.vault.seal(refreshToken)
    return ok({
      status: 302,
      body: null,
      setCookies: [
        clearHandshake,
        setCookieHeader(GOOGLE_TOKEN_COOKIE, sealedToken, {
          maxAge: GOOGLE_TOKEN_COOKIE_MAX_AGE,
          secure,
        }),
      ],
      redirectTo: GOOGLE_CONNECTED_DESTINATION,
    })
  } catch {
    // Deliberately swallowed: the browser gets the failure destination, and the
    // exception cannot be reported to it without risking the code or the token
    // in a query string. The connection state route reports the real reason.
    return failed()
  }
}

// ---------------------------------------------------------------------------
// The shared credential path
// ---------------------------------------------------------------------------

/** A live access token, plus the best-effort sliding-renewal cookie. */
export interface GoogleResolvedAccess {
  readonly accessToken: string
  /**
   * A fresh `Set-Cookie` for the SAME sealed refresh token with a full
   * `Max-Age` — the sliding 180-day lifetime is real only if every
   * successful use re-arms it; the cookie was otherwise written once at the
   * callback and silently dropped by the browser at expiry while Google
   * still honoured the token. `null` when re-sealing failed: renewal is
   * best-effort and never fails a request that already has its token.
   */
  readonly renewedCookie: string | null
}

/** A live access token, or the failure that explains why there is none. */
export const resolveGoogleAccessToken = async (
  request: GoogleRouteRequest,
  deps: GoogleRouteDependencies,
): Promise<Result<GoogleResolvedAccess, GoogleCalendarException>> => {
  const configuration = configurationOf(deps)
  if (!configuration.ok) return configuration

  const sealed = readCookie(request.cookieHeader, GOOGLE_TOKEN_COOKIE)
  if (sealed === null) return err(GoogleCalendarExceptions.notConnected())

  let refreshToken: string | null
  try {
    refreshToken = await deps.vault.open(sealed)
  } catch (error) {
    return err(googleCalendarExceptionFrom(error))
  }
  // The cookie exists but will not open: a rotated `GOOGLE_CALENDAR_TOKEN_KEY`,
  // or tampering. Either way the credential is unusable and the user must
  // reconnect — reporting `notConnected` would offer a Connect button that
  // silently overwrites a cookie the app could not read.
  if (refreshToken === null) {
    return err(
      GoogleCalendarExceptions.needsReconnect(
        'the stored credential could not be read',
      ),
    )
  }

  let accessToken: string
  try {
    const tokens = await deps.oauth.refresh(refreshToken)
    accessToken = tokens.access_token
  } catch (error) {
    return err(googleCalendarExceptionFrom(error))
  }

  let renewedCookie: string | null = null
  try {
    const resealed = await deps.vault.seal(refreshToken)
    renewedCookie = setCookieHeader(GOOGLE_TOKEN_COOKIE, resealed, {
      maxAge: GOOGLE_TOKEN_COOKIE_MAX_AGE,
      secure: shouldUseSecureCookies(request.url),
    })
  } catch {
    // Renewal is best-effort; the request proceeds on the existing cookie.
  }
  return ok({ accessToken, renewedCookie })
}

// ---------------------------------------------------------------------------
// Status — GET /api/google/status
// ---------------------------------------------------------------------------

/**
 * The connection state, resolved by actually asking Google.
 *
 * A cheaper implementation would report `connected` whenever the cookie exists.
 * That is the bug KC-IS-#19's banner exists to catch: a revoked grant leaves the
 * cookie untouched, so a cookie-only check would report `connected` forever and
 * the banner would never appear. One refresh call is what makes the state true.
 */
export const googleConnectionStatus = async (
  request: GoogleRouteRequest,
  deps: GoogleRouteDependencies,
): Promise<GoogleRouteResult> => {
  const connection = await resolveGoogleConnection(request, deps)
  return ok(json(connection))
}

/** The same resolution, as a value — what a Producer or a page prefetch wants. */
export const resolveGoogleConnection = async (
  request: GoogleRouteRequest,
  deps: GoogleRouteDependencies,
): Promise<GoogleCalendarConnection> => {
  if (deps.environment.kind === 'unconfigured') {
    return GoogleCalendarConnections.unconfigured(deps.environment.missing)
  }

  const sealed = readCookie(request.cookieHeader, GOOGLE_TOKEN_COOKIE)
  if (sealed === null) return GoogleCalendarConnections.disconnected()

  let refreshToken: string | null
  try {
    refreshToken = await deps.vault.open(sealed)
  } catch {
    refreshToken = null
  }
  if (refreshToken === null) return GoogleCalendarConnections.needsReconnect()

  try {
    const tokens = await deps.oauth.refresh(refreshToken)
    const scopes =
      tokens.scope === undefined
        ? null
        : tokens.scope.split(' ').filter((scope) => scope.length > 0)
    return GoogleCalendarConnections.connected(scopes)
  } catch (error) {
    const failure = googleCalendarExceptionFrom(error)
    if (failure.kind === 'needsReconnect' || failure.kind === 'unauthorized') {
      return GoogleCalendarConnections.needsReconnect()
    }
    // A transient failure — offline, a Google 5xx — says nothing about the
    // grant. Reporting `needsReconnect` here would show the banner every time
    // the network hiccuped and train the user to ignore it.
    return GoogleCalendarConnections.connected(null)
  }
}

// ---------------------------------------------------------------------------
// Events — GET /api/google/events?from=&to=
// ---------------------------------------------------------------------------

/** `from` / `to` as instants, or the typed failure. */
export const parseGoogleEventsQuery = (
  url: string,
): Result<{ readonly from: Date; readonly to: Date }, GoogleCalendarException> => {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return err(
      GoogleCalendarExceptions.invalidRequest('The request URL is malformed.'),
    )
  }
  const rawFrom = parsed.searchParams.get('from')
  const rawTo = parsed.searchParams.get('to')
  if (rawFrom === null || rawTo === null) {
    return err(
      GoogleCalendarExceptions.invalidRequest(
        'A calendar window needs both `from` and `to`.',
      ),
    )
  }
  const from = new Date(rawFrom)
  const to = new Date(rawTo)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return err(
      GoogleCalendarExceptions.invalidRequest(
        'A calendar window needs two ISO-8601 instants.',
      ),
    )
  }
  if (to.getTime() <= from.getTime()) {
    return err(
      GoogleCalendarExceptions.invalidRequest(
        'A calendar window must end after it starts.',
      ),
    )
  }
  return ok({ from, to })
}

export const listGoogleEvents = async (
  request: GoogleRouteRequest,
  deps: GoogleRouteDependencies,
): Promise<GoogleRouteResult> => {
  const window = parseGoogleEventsQuery(request.url)
  if (!window.ok) return window

  const access = await resolveGoogleAccessToken(request, deps)
  if (!access.ok) return access

  try {
    const events = await deps.api.listEvents({
      accessToken: access.value.accessToken,
      from: window.value.from,
      to: window.value.to,
    })
    return ok(json({ events }, renewalExtras(access.value)))
  } catch (error) {
    return err(googleCalendarExceptionFrom(error))
  }
}

// ---------------------------------------------------------------------------
// Calendars — GET /api/google/calendars
// ---------------------------------------------------------------------------

export const listGoogleCalendars = async (
  request: GoogleRouteRequest,
  deps: GoogleRouteDependencies,
): Promise<GoogleRouteResult> => {
  const access = await resolveGoogleAccessToken(request, deps)
  if (!access.ok) return access

  try {
    const entries = await deps.api.listCalendars({
      accessToken: access.value.accessToken,
    })
    return ok(
      json({ calendars: googleCalendarSummariesFrom(entries) }, renewalExtras(access.value)),
    )
  } catch (error) {
    return err(googleCalendarExceptionFrom(error))
  }
}

// ---------------------------------------------------------------------------
// Session logging — POST /api/google/createEvent
// ---------------------------------------------------------------------------

/**
 * Log a concluded focus session as a calendar event.
 *
 * The route takes the **intention**, not a pre-formatted title: canon's
 * `"Session: <intention>"` rule is composed by `sessionCalendarEventRequest`
 * where it is tested, rather than in the caller's render layer where the legacy
 * `/session` page built it.
 *
 * The answer reuses the events payload shape so the browser parses one thing.
 */
export const logGoogleSession = async (
  request: GoogleRouteRequest,
  deps: GoogleRouteDependencies,
): Promise<GoogleRouteResult> => {
  const input = parseSessionCalendarLogInput(request.body)
  if (input === null) {
    return err(
      GoogleCalendarExceptions.invalidRequest(
        'A session log needs an intention, a start, an end and a time zone.',
      ),
    )
  }

  const built = sessionCalendarEventRequest(input)
  if (!built.ok) return err(built.error)

  const access = await resolveGoogleAccessToken(request, deps)
  if (!access.ok) return access

  try {
    const created = await deps.api.createEvent({
      accessToken: access.value.accessToken,
      request: built.request,
    })
    const envelope: GoogleCalendarEventEnvelope = {
      event: created,
      calendarId: 'primary',
      calendarName: null,
    }
    return ok(
      json({ events: [envelope] }, { status: 201, ...renewalExtras(access.value) }),
    )
  } catch (error) {
    return err(googleCalendarExceptionFrom(error))
  }
}

// ---------------------------------------------------------------------------
// Disconnect — POST /api/google/disconnect
// ---------------------------------------------------------------------------

/**
 * Revoke the grant at Google and clear the credential.
 *
 * The cookie is cleared **whether or not** the revocation succeeds — canon
 * clears the keychain in a `defer` for the same reason: a user who asked to
 * disconnect must end up disconnected, and a network failure at Google is not a
 * reason to keep a credential this device is no longer supposed to hold. The
 * revocation outcome is reported in the body so a surface can say "we could not
 * reach Google — revoke it in your Google account too".
 */
export const disconnectGoogle = async (
  request: GoogleRouteRequest,
  deps: GoogleRouteDependencies,
): Promise<GoogleRouteResult> => {
  const secure = shouldUseSecureCookies(request.url)
  const cleared = [clearCookieHeader(GOOGLE_TOKEN_COOKIE, secure)]
  const sealed = readCookie(request.cookieHeader, GOOGLE_TOKEN_COOKIE)

  if (sealed === null) {
    return ok(json({ revoked: false }, { setCookies: cleared }))
  }

  let refreshToken: string | null = null
  try {
    refreshToken = await deps.vault.open(sealed)
  } catch {
    refreshToken = null
  }
  if (refreshToken === null) {
    return ok(json({ revoked: false }, { setCookies: cleared }))
  }

  try {
    await deps.oauth.revoke(refreshToken)
    return ok(json({ revoked: true }, { setCookies: cleared }))
  } catch {
    return ok(json({ revoked: false }, { setCookies: cleared }))
  }
}
