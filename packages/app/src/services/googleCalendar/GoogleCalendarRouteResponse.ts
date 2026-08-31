/**
 * `Result` → `Response`, so a `route.ts` file is three lines.
 *
 * `Response` and `Headers` are **Web standards**, not Next.js APIs — a Next 15
 * App Router route handler returns a plain `Response`, and `NextResponse` is a
 * convenience subclass this code has no need for. So this belongs in the shared
 * tier: `packages/app` may not import `next/*` (`RC-40`,
 * `check-uzf-boundaries.mjs`), and it does not have to.
 *
 * Keeping it here is also what lets `apps/web/src/app/api/google/**` contain
 * **only** `route.ts` files. KC-IS-#33's routed comment flags the legacy
 * `listEvents.ts` — *"a non-route-style file inside `app/api`"* — and a shared
 * `googleRouteResponse.ts` sitting beside the routes would be the same defect
 * with a different name.
 *
 * ## Why `Headers.append` rather than an object literal
 *
 * A response may carry **two** `Set-Cookie` headers (the callback clears the
 * handshake cookie and sets the token cookie in one answer). A plain headers
 * object cannot express that — the second key overwrites the first, and the
 * handshake cookie would silently survive. `append` is the only correct shape.
 */
import type { GoogleRouteResult } from './GoogleCalendarRouteHandlers'
import { googleRouteResponseFrom } from './GoogleCalendarRouteHandlers'

/**
 * `no-store` on every answer.
 *
 * All of these responses are per-user and credential-derived: a cached
 * connection status or event list served to a second visitor from a CDN would
 * be one user's calendar shown to another. `Cache-Control: no-store` is the
 * blunt, correct instrument (`SEC-5`).
 */
const NO_STORE = 'no-store, no-cache, must-revalidate'

export const googleRouteResponse = (result: GoogleRouteResult): Response => {
  const outcome = googleRouteResponseFrom(result)
  const headers = new Headers({ 'cache-control': NO_STORE })
  for (const cookie of outcome.setCookies) headers.append('set-cookie', cookie)

  if (outcome.redirectTo !== null) {
    headers.set('location', outcome.redirectTo)
    // 302, not 307: the callback and the connect leg are both GETs, and a
    // browser following either must not be asked to repeat a method.
    return new Response(null, { status: 302, headers })
  }

  headers.set('content-type', 'application/json')
  return new Response(JSON.stringify(outcome.body), {
    status: outcome.status,
    headers,
  })
}

/**
 * Read a JSON request body without throwing.
 *
 * A POST with no body, or with a body that is not JSON, is a client mistake and
 * must surface as the route's own `invalidRequest` — not as an unhandled
 * `SyntaxError` that Next renders as a 500 with a stack trace.
 */
export const readJsonBody = async (request: Request): Promise<unknown> => {
  try {
    const text = await request.text()
    return text.length === 0 ? null : JSON.parse(text)
  } catch {
    return null
  }
}
