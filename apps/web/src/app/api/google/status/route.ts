/**
 * `GET /api/google/status` — the connection state KC-IS-#19's reconnect banner
 * and the Settings surface read.
 *
 * Answers one of `unconfigured` / `disconnected` / `connected` /
 * `needsReconnect`, and resolves it by actually asking Google rather than by
 * looking for a cookie — see `googleConnectionStatus` for why that difference is
 * the whole point of the banner.
 *
 * No token appears in the answer: the payload is the discriminated state and, on
 * `connected`, the granted scope names.
 */
import {
  googleConnectionStatus,
  googleRouteResponse,
  makeGoogleRouteDependencies,
} from '@kro/app/google'

export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
  const result = await googleConnectionStatus(
    {
      url: request.url,
      cookieHeader: request.headers.get('cookie'),
    },
    makeGoogleRouteDependencies(),
  )
  return googleRouteResponse(result)
}
