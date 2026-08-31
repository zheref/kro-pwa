/**
 * `GET /api/google/connect` — start the calendar authorization.
 *
 * A `route.ts` and nothing else: it adapts the incoming `Request` into plain
 * data, calls the Producer (`RC-43`), and turns the `Result` into a response.
 * All of the logic — PKCE, `state`, the sealed handshake cookie, the
 * authorization URL — lives in `@kro/app/google`'s
 * `startGoogleAuthorization`, where it is tested as a pure function with no
 * HTTP runtime. That split is the fix for the shape problem KC-IS-#33's routed
 * comment records: `app/api/google/**` now contains only routes.
 *
 * `dynamic = 'force-dynamic'` because the handler reads cookies and mints
 * randomness; a statically rendered copy would hand every visitor the same
 * `state`.
 */
import {
  googleRouteResponse,
  makeGoogleRouteDependencies,
  startGoogleAuthorization,
} from '@kro/app/google'

export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
  const result = await startGoogleAuthorization(
    {
      url: request.url,
      cookieHeader: request.headers.get('cookie'),
    },
    makeGoogleRouteDependencies(),
  )
  return googleRouteResponse(result)
}
