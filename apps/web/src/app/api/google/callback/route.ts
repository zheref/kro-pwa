/**
 * `GET /api/google/callback` — the OAuth redirect Google sends the browser back
 * to.
 *
 * Verifies the `state` against the sealed handshake cookie, exchanges the
 * authorization code, and stores the refresh token as a sealed `HttpOnly`
 * cookie. Every decision lives in `completeGoogleAuthorization`; this file
 * carries the `Request` adaptation and nothing else (`RC-43`).
 *
 * The redirect target is a **constant** in the handler, never taken from the
 * request — an open redirect here is how an authorization code gets stolen.
 */
import {
  completeGoogleAuthorization,
  googleRouteResponse,
  makeGoogleRouteDependencies,
} from '@kro/app/google'

export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
  const result = await completeGoogleAuthorization(
    {
      url: request.url,
      cookieHeader: request.headers.get('cookie'),
    },
    makeGoogleRouteDependencies(),
  )
  return googleRouteResponse(result)
}
