/**
 * `POST /api/google/createEvent` — session logging.
 *
 * **This route is rebuilt, not amended.** The version it replaces carried three
 * problems KC-IS-#33's routed comment names, and none of them survives:
 *
 * 1. It read its access token from NextAuth, which KC-IS-#31 retired — so it
 *    answered `401` unconditionally. The token now comes from the sealed
 *    refresh-token cookie this issue introduces.
 * 2. It logged the failure with the caught error attached
 *    (`console.error('Error creating calendar event:', error)`), and its
 *    sibling routes logged the OAuth token response and whole event payloads
 *    (removed in KC-PR-#37 at `71c7828`). **The rebuilt route logs nothing**,
 *    and the SEC suite asserts that no operation touches `console` (`SEC-5`).
 * 3. It used `googleapis` — a Node-only SDK — for one `events.insert`. The
 *    service tier uses plain `fetch`, so no Node-only package is reachable from
 *    `packages/*` and no dependency was added.
 *
 * The request contract changed with it, deliberately: the body carries the
 * **intention**, not a pre-formatted title. Canon's `"Session: <intention>"`
 * rule now lives in `sessionCalendarEventRequest` where it is tested, instead of
 * in a React hook's template literal.
 *
 * ```json
 * { "intention": "Ship the calendar host",
 *   "start": "2026-08-31T09:00:00.000Z",
 *   "end":   "2026-08-31T09:25:00.000Z",
 *   "timeZone": "America/Bogota" }
 * ```
 */
import {
  googleRouteResponse,
  logGoogleSession,
  makeGoogleRouteDependencies,
  readJsonBody,
} from '@kro/app/google'

export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<Response> {
  const result = await logGoogleSession(
    {
      url: request.url,
      cookieHeader: request.headers.get('cookie'),
      body: await readJsonBody(request),
    },
    makeGoogleRouteDependencies(),
  )
  return googleRouteResponse(result)
}
