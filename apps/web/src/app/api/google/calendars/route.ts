/**
 * `GET /api/google/calendars` — the calendar inventory the lens's
 * hidden-calendars control needs.
 *
 * Each entry carries the id, the display name, whether it is the account's own
 * calendar, and whether the user has it selected in Google's own UI — the four
 * facts a visibility control renders. Nothing about a token crosses.
 */
import {
  googleRouteResponse,
  listGoogleCalendars,
  makeGoogleRouteDependencies,
} from '@kro/app/google'

export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
  const result = await listGoogleCalendars(
    {
      url: request.url,
      cookieHeader: request.headers.get('cookie'),
    },
    makeGoogleRouteDependencies(),
  )
  return googleRouteResponse(result)
}
