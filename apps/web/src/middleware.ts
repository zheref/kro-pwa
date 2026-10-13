import { type NextRequest, NextResponse } from 'next/server'
import { umamiConfig } from './analyticsConfig'
import { isMarketingPath, resolveHostRouting } from './hostRouting'
import { landingSecurityHeaders } from './securityHeaders'

/**
 * The host-routing adapter — a thin shell over `resolveHostRouting`.
 *
 * All of the decision lives in `hostRouting.ts`, which is pure and unit-tested
 * across the whole apex/hub/other matrix; this file only reads the request and
 * turns the decision into a `NextResponse`. Redirects are 307 for the same
 * reason `/` has always used one: the split is a product decision that can
 * change, and a 308 would be cached past it.
 *
 * The hosts are read from `NEXT_PUBLIC_SITE_HOST` / `NEXT_PUBLIC_HUB_HOST`,
 * inlined at build time (see `hostRouting.ts`). Unset → no host redirects.
 *
 * The marketing documents — `/` and the `MARKETING_PATHS` (`/pricing`) served
 * as is, which the decision table yields only on a non-hub host — also carry
 * `landingSecurityHeaders` (`SEC-10`). The hub's `/` is a rewrite to the app
 * and never gets the landing's policy; the hub's `/pricing` is a redirect to
 * the apex and carries nothing either.
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl
  const decision = resolveHostRouting({
    host: request.headers.get('host'),
    pathname,
    search,
    siteHost: process.env.NEXT_PUBLIC_SITE_HOST,
    hubHost: process.env.NEXT_PUBLIC_HUB_HOST,
  })

  if (decision.kind === 'redirect') {
    return NextResponse.redirect(new URL(decision.url, request.url), 307)
  }
  const response =
    decision.kind === 'rewrite'
      ? NextResponse.rewrite(new URL(decision.url, request.url))
      : NextResponse.next()
  const servesMarketing =
    decision.kind === 'next' && (pathname === '/' || isMarketingPath(pathname))
  const umami = servesMarketing ? umamiConfig() : null
  const headers = {
    ...(decision.headers ?? {}),
    ...(servesMarketing
      ? landingSecurityHeaders({
          umamiOrigin: umami?.origin ?? null,
          umamiCollectOrigin: umami?.collectOrigin ?? null,
          production: process.env.NODE_ENV === 'production',
        })
      : {}),
  }
  for (const [name, value] of Object.entries(headers)) {
    response.headers.set(name, value)
  }
  return response
}

/**
 * Static files and API routes never reach the middleware. Kept in step with
 * `isBypassed` in `hostRouting.ts`, which re-checks the same list so a matcher
 * slip cannot route an asset. Must stay a literal: Next reads it statically.
 */
export const config = {
  matcher: [
    '/((?!api/|api$|_next/|icons/|sounds/|landing/|sw\\.js|favicon\\.ico|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|llms\\.txt|opengraph-image).*)',
  ],
}
