/**
 * Reading an `X-Forwarded-*` header safely.
 *
 * A module of its own rather than a helper inside `page.tsx`, and not by
 * preference: Next.js type-checks a route file against a closed page-module
 * signature, so any export beyond the known keys (`default`, `dynamic`,
 * `metadata`, …) fails `tsc` outright. A helper worth testing therefore has to
 * live beside the route rather than inside it.
 */

/**
 * The first value of a forwarded header, trimmed — or `null` when it carries
 * nothing usable.
 *
 * These headers are **lists**: every proxy in a chain appends its own hop, so
 * two of them yield `"https,http"` or `"a.example, b.internal"`. Read verbatim
 * that builds `https,http://host/plan`, which is not a URL at all — and the
 * URL is what decides the cookie scheme, so getting it wrong behind a
 * multi-proxy deployment is a real answer to a real question, and the wrong
 * one.
 *
 * The **first** entry is the client-facing hop, which is the one being asked
 * about. An empty first entry (`" , b"`) is treated as absent rather than as
 * an empty scheme, so a malformed header falls back to the caller's default
 * instead of producing `://host`.
 */
export const firstForwardedValue = (raw: string | null): string | null => {
  if (raw === null) return null
  const first = raw.split(',')[0]?.trim() ?? ''
  return first.length > 0 ? first : null
}
