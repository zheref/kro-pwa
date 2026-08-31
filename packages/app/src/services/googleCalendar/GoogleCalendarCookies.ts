/**
 * The two cookies the Google Calendar connection uses, and the pure functions
 * that read and write them.
 *
 * Pure string handling, no framework: a route handler passes the request's
 * `Cookie` header in and puts the returned `Set-Cookie` strings out. That is
 * what lets every route be tested as a function over data (`RC-43`) with no
 * Next.js request/response runtime, and it is why this lives beside the vault
 * rather than inside `apps/web`.
 *
 * ## The two cookies
 *
 * | Cookie | Holds | Lifetime |
 * |---|---|---|
 * | `kro_gcal` | The **sealed refresh token** (`GoogleTokenVault`) | 180 days, renewed on every successful refresh |
 * | `kro_gcal_oauth` | The sealed `state` + PKCE `code_verifier` for one in-flight authorization | 10 minutes |
 *
 * Both are `HttpOnly` (no script may read them), `SameSite=Lax` (the OAuth
 * callback is a top-level GET navigation from Google, which `Lax` permits and
 * `Strict` would break) and `Path=/`.
 *
 * `Secure` is **conditional on the request's scheme**, not hard-coded. A
 * `Secure` cookie is silently dropped on `http://localhost`, which would make
 * the whole flow fail on a developer machine in a way that looks like an OAuth
 * error; and hard-coding it off would ship an insecure cookie to production.
 * The scheme is the honest discriminator, and `localhost` is the only origin a
 * browser treats as a secure context without TLS.
 *
 * ## SEC-5
 *
 * Nothing here logs. The values written are already sealed by the caller — this
 * module never sees a raw token, and there is no code path that would put a
 * cookie value into a URL or a message.
 */

/** The long-lived credential cookie. */
export const GOOGLE_TOKEN_COOKIE = 'kro_gcal'
/** The short-lived per-authorization cookie. */
export const GOOGLE_OAUTH_COOKIE = 'kro_gcal_oauth'

/** 180 days. Google refresh tokens do not expire for a published client. */
export const GOOGLE_TOKEN_COOKIE_MAX_AGE = 180 * 24 * 60 * 60
/** 10 minutes — longer than any consent screen, shorter than a coffee break. */
export const GOOGLE_OAUTH_COOKIE_MAX_AGE = 10 * 60

/**
 * Read one cookie out of a `Cookie` request header.
 *
 * `null` for a missing header, a missing cookie, or an empty value — all three
 * mean the same thing to every caller, which is why they are not distinguished.
 * The value is `decodeURIComponent`-ed because that is what a browser does to
 * whatever `Set-Cookie` wrote; a value that fails to decode is treated as
 * absent rather than passed through half-decoded.
 */
export const readCookie = (
  cookieHeader: string | null | undefined,
  name: string,
): string | null => {
  if (cookieHeader === null || cookieHeader === undefined) return null
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0) continue
    if (part.slice(0, separator).trim() !== name) continue
    const raw = part.slice(separator + 1).trim()
    if (raw.length === 0) return null
    try {
      return decodeURIComponent(raw)
    } catch {
      return null
    }
  }
  return null
}

export interface CookieOptions {
  /** Seconds. `0` expires the cookie immediately. */
  readonly maxAge: number
  /** Whether to mark the cookie `Secure`. See the module note. */
  readonly secure: boolean
}

/** Build one `Set-Cookie` header value. */
export const setCookieHeader = (
  name: string,
  value: string,
  options: CookieOptions,
): string => {
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.max(0, Math.trunc(options.maxAge))}`,
  ]
  if (options.secure) attributes.push('Secure')
  return attributes.join('; ')
}

/**
 * Clear a cookie.
 *
 * `Max-Age=0` **and** an empty value: some intermediaries honour only one of
 * the two, and a disconnect that leaves a stale sealed token behind would keep
 * reporting `connected` after the user asked to be disconnected.
 */
export const clearCookieHeader = (name: string, secure: boolean): string =>
  setCookieHeader(name, '', { maxAge: 0, secure })

/**
 * Whether cookies for this request should be `Secure`.
 *
 * `https:` always. Plain `http:` only on loopback, which browsers already treat
 * as a secure context — anything else on `http:` is a misconfiguration, and
 * marking the cookie `Secure` there makes it visibly fail rather than quietly
 * transmit a credential in the clear.
 */
export const shouldUseSecureCookies = (requestUrl: string): boolean => {
  try {
    const parsed = new URL(requestUrl)
    if (parsed.protocol === 'https:') return true
    return !(parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
  } catch {
    // An unparseable URL is not a reason to downgrade a cookie.
    return true
  }
}

/** The sealed payload the in-flight authorization cookie carries. */
export interface GoogleOAuthHandshake {
  readonly state: string
  readonly verifier: string
  /** The redirect URI this authorization was started with, echoed on exchange. */
  readonly redirectUri: string
}

/**
 * Serialize the handshake for sealing.
 *
 * A newline-delimited triple rather than JSON: the three fields are all
 * URL-safe by construction (`state` and `verifier` are generated from a
 * URL-safe alphabet, `redirectUri` is a URL), so the format is unambiguous, and
 * it keeps the sealed payload small enough that the cookie stays far under the
 * 4 KB limit even after base64.
 */
export const serializeHandshake = (handshake: GoogleOAuthHandshake): string =>
  [handshake.state, handshake.verifier, handshake.redirectUri].join('\n')

export const parseHandshake = (raw: string): GoogleOAuthHandshake | null => {
  const parts = raw.split('\n')
  if (parts.length !== 3) return null
  const [state, verifier, redirectUri] = parts
  if (
    state === undefined ||
    verifier === undefined ||
    redirectUri === undefined
  ) {
    return null
  }
  if (state.length === 0 || verifier.length === 0 || redirectUri.length === 0) {
    return null
  }
  return { state, verifier, redirectUri }
}
