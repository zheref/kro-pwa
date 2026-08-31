import { cookies, headers } from 'next/headers'
import {
  googleCalendarConnectionCopy,
  googleCalendarNeedsReconnect,
  makeGoogleRouteDependencies,
  resolveGoogleConnection,
} from '@kro/app/google'
import { PlanPageClient } from './PlanPageClient'

/**
 * `/plan` — the Plan destination.
 *
 * A passive Server Component (`RC-38`): it resolves one prefetch and renders
 * the Client Wrapper. No hook, no store read, no markup.
 *
 * ## Why the connection is prefetched here rather than fetched by a Producer
 *
 * `RC-38` allows a Server Page one optional prefetch *"only because its result
 * is handed down as a plain prop, never touched directly"* — and
 * `resolveGoogleConnection`'s own header names this exact call site: *"the same
 * resolution, as a value — what a Producer or a page prefetch wants."* It is
 * the page prefetch, because the Plan slice has no field to hold a connection
 * (that file belongs to KC-IS-#18) and a Page may not import a Service
 * (`RC-6`). The prop that reaches `@kro/app` is two booleans and a string, so
 * no Service type crosses the boundary either.
 *
 * ## What this costs, and why it is nearly always nothing
 *
 * `resolveGoogleConnection` short-circuits on `unconfigured` (no Google client
 * in the environment — every dev machine and CI) and on a missing cookie (any
 * user who has not connected), so the common paths make **no** network call.
 * A connected user costs one token refresh, which is also the only way to know
 * the grant is still honoured: *"a revoked grant leaves the cookie untouched,
 * so a cookie-only check would report `connected` forever and the banner would
 * never appear."*
 *
 * A failure here is swallowed on purpose. The banner is an *extra*; a Google
 * outage must not take the Plan page down with it.
 */
export const dynamic = 'force-dynamic'

export default async function PlanRoute() {
  let needsReconnect = false
  let reconnectDetail: string | null = null

  try {
    const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])
    // The real request URL, rebuilt from the proxy headers. `GoogleRouteRequest`
    // documents `url` as *"used for query params and the cookie scheme"* — the
    // scheme half is what decides whether a cookie may be `Secure`, so a
    // fabricated `http://…` here would be a real answer to a real question,
    // and the wrong one behind TLS.
    const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host')
    const proto = headerStore.get('x-forwarded-proto') ?? 'http'
    const connection = await resolveGoogleConnection(
      {
        url:
          host === null ? 'http://localhost/plan' : `${proto}://${host}/plan`,
        cookieHeader: cookieStore.toString(),
      },
      makeGoogleRouteDependencies(),
    )
    needsReconnect = googleCalendarNeedsReconnect(connection)
    reconnectDetail = googleCalendarConnectionCopy(connection)
  } catch {
    // Silent: the timeline is the page, the banner is a courtesy.
  }

  return (
    <PlanPageClient
      googleNeedsReconnect={needsReconnect}
      googleReconnectDetail={reconnectDetail}
    />
  )
}
