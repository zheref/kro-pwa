/**
 * The Google **calendar-scope** OAuth 2.0 authorization-code + PKCE flow, ported
 * from canon `GoogleAuth.swift` to the web.
 *
 * ## What changed from canon, and why
 *
 * | Canon (iOS) | Here (web) | Why |
 * |---|---|---|
 * | `ASWebAuthenticationSession` opens the consent screen and hands back the callback URL | A **302 to Google** from `/api/google/connect`, and Google navigates back to `/api/google/callback` | A browser has no `ASWebAuthenticationSession`; a top-level redirect is the web idiom, and it keeps the code out of any JavaScript context. |
 * | Public client: no secret, PKCE alone | **Confidential** client: PKCE *and* a client secret, held server-side | A web app can keep a secret, and Google's "Web application" client type requires one for the token exchange. PKCE is kept anyway — it costs nothing and defends the authorization code in transit. |
 * | Tokens land in the keychain on the device | Tokens land in a sealed `HttpOnly` cookie (`GoogleTokenVault`) | See that module for the decision and its tradeoff. |
 * | `state` held in a local variable across the `await` | `state` sealed into a 10-minute cookie | There is no process to hold it in: the request that starts the flow and the request that finishes it are different serverless invocations. |
 *
 * ## SEC-5 — the two places a token could leak, closed
 *
 * 1. **A URL.** The only URL this module *builds* is the authorization URL, and
 *    its parameters are the client id, the redirect, the scope, the state and
 *    the PKCE challenge — no token, and no secret. The token and revocation
 *    endpoints are constants; everything secret travels in a POST **form body**.
 * 2. **A log.** Nothing here logs. `postForm` never puts a response body into an
 *    exception message — canon does (`"HTTP \(status): \(body)"`) and that body
 *    is a token response on the success path and an error envelope on the
 *    failure path. This port maps the status to a typed exception instead, which
 *    is why `GoogleCalendarExceptions.server(status)` takes a number and not a
 *    string.
 *
 * ## `invalid_grant` is the reconnect signal
 *
 * Google answers HTTP 400 with `{"error":"invalid_grant"}` when a refresh token
 * has been revoked, has expired, or belongs to a consent that was withdrawn.
 * That — and only that — becomes `needsReconnect`. Every other 4xx stays an
 * ordinary failure, so a malformed request during development does not tell the
 * user their Google account was disconnected.
 */
import {
  GoogleCalendarExceptions,
  googleCalendarExceptionForStatus,
  googleCalendarExceptionFrom,
} from './GoogleCalendarException'
import {
  type GoogleTokenResponse,
  googleOAuthErrorCode,
  parseGoogleTokenResponse,
} from './GoogleCalendarResponse'
import type { CryptoSource } from './GoogleTokenVault'
import { ambientCryptoSource, toBase64Url } from './GoogleTokenVault'

/** Canon's endpoints — `GoogleOAuthConfig`. */
export const GOOGLE_AUTHORIZATION_ENDPOINT =
  'https://accounts.google.com/o/oauth2/v2/auth'
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
export const GOOGLE_REVOCATION_ENDPOINT = 'https://oauth2.googleapis.com/revoke'

/**
 * Canon's scope, unchanged: read **and** write on every calendar the user can
 * reach. Google defines nothing narrower that still permits `events.insert`,
 * and session logging needs to insert. Canon's own note says the same.
 */
export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar'

/** The callback path this app registers with Google. */
export const GOOGLE_CALLBACK_PATH = '/api/google/callback'

/** A PKCE pair — canon's `GoogleAuth.PKCE`. */
export interface PkcePair {
  readonly verifier: string
  readonly challenge: string
}

const URL_SAFE_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'

/**
 * A random URL-safe string — canon's `randomURLSafeString`.
 *
 * **Canon divergence, deliberate and security-relevant.** Canon uses
 * `UInt8.random(in:) % chars.count`, which is modulo-biased: 256 is not a
 * multiple of 66, so the first 58 characters of the alphabet are ~1.5× likelier
 * than the last 8. That is harmless at 64 characters of verifier but it is
 * still a biased CSPRNG output, and rejection sampling costs one loop. The
 * bytes come from `getRandomValues`, never `Math.random`.
 */
export const randomUrlSafeString = (
  length: number,
  crypto: CryptoSource,
): string => {
  const alphabet = URL_SAFE_ALPHABET
  // The largest multiple of the alphabet size that fits in a byte; bytes at or
  // above it are discarded so every character is uniformly likely.
  const limit = Math.floor(256 / alphabet.length) * alphabet.length
  let result = ''
  while (result.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length))
    for (const byte of bytes) {
      if (byte >= limit) continue
      result += alphabet[byte % alphabet.length]
      if (result.length === length) break
    }
  }
  return result
}

/** S256 PKCE — canon's `makePKCE`, with the same 64-character verifier. */
export const makePkcePair = async (
  crypto: CryptoSource,
): Promise<PkcePair> => {
  const verifier = randomUrlSafeString(64, crypto)
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  )
  return { verifier, challenge: toBase64Url(new Uint8Array(digest)) }
}

/**
 * The authorization URL — canon's `authorizationURL(pkce:state:…)`.
 *
 * `access_type=offline` and `prompt=consent` are both canon's, and both are
 * required rather than defensive: without `offline` Google issues no refresh
 * token at all, and without `consent` it declines to reissue one to a user who
 * has already granted the scope — which is exactly the reconnect case.
 */
export const googleAuthorizationUrl = (params: {
  readonly clientId: string
  readonly redirectUri: string
  readonly state: string
  readonly challenge: string
  readonly scope?: string
}): string => {
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT)
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', params.scope ?? GOOGLE_CALENDAR_SCOPE)
  url.searchParams.set('state', params.state)
  url.searchParams.set('code_challenge', params.challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  return url.toString()
}

/** What the callback carried — canon's `parseCallback`. */
export type GoogleCallbackParams =
  | { readonly ok: true; readonly code: string; readonly state: string }
  | { readonly ok: false; readonly error: string }

export const parseGoogleCallbackUrl = (
  requestUrl: string,
): GoogleCallbackParams => {
  let parsed: URL
  try {
    parsed = new URL(requestUrl)
  } catch {
    return { ok: false, error: 'malformed_callback' }
  }
  const error = parsed.searchParams.get('error')
  // `access_denied` is the user pressing Cancel — an outcome, not a fault.
  if (error !== null) return { ok: false, error }
  const code = parsed.searchParams.get('code')
  const state = parsed.searchParams.get('state')
  if (code === null || state === null) {
    return { ok: false, error: 'missing_code_or_state' }
  }
  return { ok: true, code, state }
}

/**
 * The HTTP surface, injected (`RC-6`, `RC-33`).
 *
 * Narrower than `fetch` on purpose: a form POST is the only shape this module
 * needs, so a test double implements one method rather than the whole Fetch
 * API, and no test can accidentally satisfy it with something that reaches the
 * network.
 */
export interface GoogleFormTransport {
  postForm(
    url: string,
    fields: Readonly<Record<string, string>>,
    options?: { readonly signal?: AbortSignal },
  ): Promise<{ readonly status: number; readonly body: unknown }>
}

/** The live transport. The only `fetch` in this module. */
export const liveGoogleFormTransport: GoogleFormTransport = {
  async postForm(url, fields, options) {
    const body = new URLSearchParams()
    for (const [key, value] of Object.entries(fields)) body.set(key, value)
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    })
    // The body is read as text then parsed, because Google answers `text/html`
    // on some infrastructure errors and `response.json()` would throw a
    // `SyntaxError` that reads as a bug rather than as a bad response.
    const text = await response.text()
    let parsed: unknown = null
    try {
      parsed = text.length === 0 ? null : JSON.parse(text)
    } catch {
      parsed = null
    }
    return { status: response.status, body: parsed }
  },
}

export interface GoogleOAuthService {
  /** `exchangeCode` — authorization code → tokens. */
  exchangeCode(params: {
    readonly code: string
    readonly verifier: string
    readonly redirectUri: string
  }): Promise<GoogleTokenResponse>
  /** `refresh` — a refresh token → a fresh access token. */
  refresh(refreshToken: string): Promise<GoogleTokenResponse>
  /** `revoke` — hand the token back to Google. */
  revoke(token: string): Promise<void>
}

export interface LiveGoogleOAuthServiceOptions {
  readonly clientId: string
  readonly clientSecret: string
  readonly transport?: GoogleFormTransport
}

/**
 * Turn a token-endpoint failure into a typed exception.
 *
 * The one place `invalid_grant` becomes `needsReconnect`. Google does not
 * distinguish revoked from expired in the response, so the reason defaults to
 * `revoked` — the commonest cause and the one whose copy is safe for all three.
 */
const tokenEndpointException = (status: number, body: unknown) => {
  if (googleOAuthErrorCode(body) === 'invalid_grant') {
    return GoogleCalendarExceptions.needsReconnect(
      'Google no longer honours the saved grant',
    )
  }
  return googleCalendarExceptionForStatus(status)
}

export const makeLiveGoogleOAuthService = (
  options: LiveGoogleOAuthServiceOptions,
): GoogleOAuthService => {
  const transport = options.transport ?? liveGoogleFormTransport

  const postTokens = async (
    fields: Readonly<Record<string, string>>,
  ): Promise<GoogleTokenResponse> => {
    let response: { readonly status: number; readonly body: unknown }
    try {
      response = await transport.postForm(GOOGLE_TOKEN_ENDPOINT, fields)
    } catch (error) {
      throw googleCalendarExceptionFrom(error)
    }
    if (response.status < 200 || response.status >= 300) {
      throw tokenEndpointException(response.status, response.body)
    }
    const tokens = parseGoogleTokenResponse(response.body)
    if (tokens === null) {
      throw GoogleCalendarExceptions.malformedResponse('token response')
    }
    return tokens
  }

  return {
    exchangeCode: ({ code, verifier, redirectUri }) =>
      postTokens({
        client_id: options.clientId,
        client_secret: options.clientSecret,
        code,
        code_verifier: verifier,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),

    refresh: (refreshToken) =>
      postTokens({
        client_id: options.clientId,
        client_secret: options.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),

    async revoke(token) {
      let response: { readonly status: number; readonly body: unknown }
      try {
        response = await transport.postForm(GOOGLE_REVOCATION_ENDPOINT, {
          token,
        })
      } catch (error) {
        throw googleCalendarExceptionFrom(error)
      }
      // Google answers 400 for a token it has already forgotten. That is the
      // desired end state, so it is success — canon clears the keychain in a
      // `defer` for exactly the same reason.
      if (response.status === 400) return
      if (response.status < 200 || response.status >= 300) {
        throw googleCalendarExceptionForStatus(response.status)
      }
    },
  }
}

/**
 * The deterministic double (`RC-33`).
 *
 * Fixture-shaped rather than fixture-file-backed: the OAuth surface has three
 * operations and no list responses, so a `google.fixtures.json` entry would be
 * three constants read through a lookup. The knobs let a suite drive the
 * failure arms — `refreshOutcome: 'invalidGrant'` is the `needsReconnect`
 * transition, which is acceptance criterion 2.
 */
export interface StubbedGoogleOAuthOptions {
  readonly accessToken?: string
  readonly refreshToken?: string | null
  readonly exchangeOutcome?: 'ok' | 'invalidGrant' | 'offline'
  readonly refreshOutcome?: 'ok' | 'invalidGrant' | 'offline'
  readonly revokeOutcome?: 'ok' | 'offline'
  /** Every call, in order — what a SEC assertion inspects. */
  readonly calls?: string[]
}

export const makeStubbedGoogleOAuthService = (
  options: StubbedGoogleOAuthOptions = {},
): GoogleOAuthService => {
  const accessToken = options.accessToken ?? 'stub-access-token'
  const refreshToken =
    options.refreshToken === undefined ? 'stub-refresh-token' : options.refreshToken
  const record = (call: string) => options.calls?.push(call)

  const answer = (
    outcome: 'ok' | 'invalidGrant' | 'offline',
  ): GoogleTokenResponse => {
    if (outcome === 'offline') throw new TypeError('Failed to fetch')
    if (outcome === 'invalidGrant') {
      throw GoogleCalendarExceptions.needsReconnect(
        'Google no longer honours the saved grant',
      )
    }
    return {
      access_token: accessToken,
      ...(refreshToken === null ? {} : { refresh_token: refreshToken }),
      expires_in: 3600,
      scope: GOOGLE_CALENDAR_SCOPE,
      token_type: 'Bearer',
    }
  }

  return {
    async exchangeCode() {
      record('exchangeCode')
      return answer(options.exchangeOutcome ?? 'ok')
    },
    async refresh() {
      record('refresh')
      return answer(options.refreshOutcome ?? 'ok')
    },
    async revoke() {
      record('revoke')
      if ((options.revokeOutcome ?? 'ok') === 'offline') {
        throw new TypeError('Failed to fetch')
      }
    },
  }
}

export const stubbedGoogleOAuthService: GoogleOAuthService =
  makeStubbedGoogleOAuthService()

/** The ambient crypto source, re-exported so a route needs one import. */
export const oauthCryptoSource = ambientCryptoSource
