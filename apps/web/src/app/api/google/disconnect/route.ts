/**
 * `POST /api/google/disconnect` — revoke the grant at Google and clear the
 * stored credential.
 *
 * `POST`, not `GET`: this is a state change, and a `GET` would be disconnectable
 * by any `<img>` tag on any page. The credential cookie is cleared whether or
 * not the revocation call succeeds — see `disconnectGoogle` for why — and the
 * body reports which of the two happened.
 */
import {
  disconnectGoogle,
  googleRouteResponse,
  makeGoogleRouteDependencies,
} from '@kro/app/google'

export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<Response> {
  const result = await disconnectGoogle(
    {
      url: request.url,
      cookieHeader: request.headers.get('cookie'),
    },
    makeGoogleRouteDependencies(),
  )
  return googleRouteResponse(result)
}
