/**
 * `GET /api/google/events?from=<iso>&to=<iso>` — every Google event overlapping
 * the window, across every calendar the grant can read.
 *
 * This is the route the Plan preload's Google `PlanHost` calls, one request per
 * −3…+3 window. It answers the **wire** shape (`GoogleCalendarEventEnvelope[]`);
 * the browser maps it to `Endeavor`s with the same `GoogleCalendarMapper` the
 * server would use, so there is one mapping and one place canon's rules live.
 *
 * The access token is minted from the sealed refresh-token cookie inside the
 * handler and used only as an `Authorization` header. It is never in this URL,
 * never in the answer, and never logged (`SEC-5`).
 */
import {
  googleRouteResponse,
  listGoogleEvents,
  makeGoogleRouteDependencies,
} from '@kro/app/google'

export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
  const result = await listGoogleEvents(
    {
      url: request.url,
      cookieHeader: request.headers.get('cookie'),
    },
    makeGoogleRouteDependencies(),
  )
  return googleRouteResponse(result)
}
