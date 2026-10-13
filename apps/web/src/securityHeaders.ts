/**
 * The landing document's security headers (`SEC-10`), as one pure value.
 *
 * The landing hosts the early-access email field and may load one third-party
 * script (Umami), so its policy admits `'self'` plus Umami's two origins and
 * nothing else: the script's origin in `script-src`, the origin it posts
 * events to in `connect-src` (for Umami Cloud these differ —
 * `cloud.umami.is` serves the script, `gateway.umami.is` takes the events).
 * It cannot be framed, and it submits forms only to itself.
 * `'unsafe-eval'` is admitted only outside production, where Next's dev
 * runtime needs it.
 */
// A nonce-based strict CSP (no 'unsafe-inline') is deferred by the lead.

export interface LandingSecurityHeadersInput {
  /** The Umami script origin (`umamiConfig()?.origin`), or `null` when off. */
  readonly umamiOrigin: string | null
  /**
   * Where the Umami script posts events (`umamiConfig()?.collectOrigin`), or
   * `null` when off.
   */
  readonly umamiCollectOrigin: string | null
  readonly production: boolean
}

export const landingSecurityHeaders = ({
  umamiOrigin,
  umamiCollectOrigin,
  production,
}: LandingSecurityHeadersInput): Record<string, string> => {
  const scriptThird = umamiOrigin === null ? [] : [umamiOrigin]
  const connectThird = umamiCollectOrigin === null ? [] : [umamiCollectOrigin]
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    ...(production ? [] : ["'unsafe-eval'"]),
    ...scriptThird,
  ]
  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    `connect-src ${["'self'", ...connectThird].join(' ')}`,
    "img-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ]
  return {
    'Content-Security-Policy': directives.join('; '),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
  }
}
