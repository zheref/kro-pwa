/**
 * The landing document's security headers (`SEC-10`), as one pure value.
 *
 * The landing hosts the early-access email field and may load one third-party
 * script (Umami), so its policy admits `'self'` plus that script's origin and
 * nothing else; it cannot be framed, and it submits forms only to itself.
 * `'unsafe-eval'` is admitted only outside production, where Next's dev
 * runtime needs it.
 */
// A nonce-based strict CSP (no 'unsafe-inline') is deferred by the lead.

export interface LandingSecurityHeadersInput {
  /** The Umami script origin (`umamiConfig()?.origin`), or `null` when off. */
  readonly umamiOrigin: string | null
  readonly production: boolean
}

export const landingSecurityHeaders = ({
  umamiOrigin,
  production,
}: LandingSecurityHeadersInput): Record<string, string> => {
  const third = umamiOrigin === null ? [] : [umamiOrigin]
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    ...(production ? [] : ["'unsafe-eval'"]),
    ...third,
  ]
  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    `connect-src ${["'self'", ...third].join(' ')}`,
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
