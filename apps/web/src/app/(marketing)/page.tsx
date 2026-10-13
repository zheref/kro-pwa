import { redirect } from 'next/navigation'
import { contactEmail } from '../../contactConfig'
import { LandingPageClient } from './LandingPageClient'
import { isLandingEnabled } from './landingFlag'
import { type SearchParams, landingRouteDecision } from './landingRoute'

/**
 * `/` — the front door, in the `(marketing)` group (a group changes no URL).
 *
 * A passive Server Component (`RC-38`): it reads its search params, asks
 * `landingRouteDecision` what to do with the visit, and either redirects or
 * forwards to the client wrapper. No hook, no store read, no markup of its own.
 *
 * **What it does depends on the `landingPage` flag** (`UZF-22`), which ships
 * ON through the web product's shipping overrides in `@kro/core`. With the
 * flag on, `/` mounts the landing — except a provider return (`?code=…`),
 * which still 307s to `/my-day?code=…` so a sign-in never strands on a
 * marketing page. With the flag off, the route is the 307 fallback to
 * `/my-day` it was before the marketing split. On the hub host it is not
 * even reached: the middleware rewrites the hub's `/` to `/my-day`.
 *
 * **Why My Day.** Product canon decides the landing destination: KroApple's
 * `ElementsRepository` flags the Do tab `isInitial`, which this port serves at
 * `/my-day`; `MainFeature`'s initial selection agrees.
 *
 * **Temporary, deliberately.** `redirect()` answers 307, not 308 — the landing
 * destination is a product decision that can change, and a permanent redirect
 * would be cached by browsers past any such change.
 *
 * **The provider return survives the hop.** Only the OAuth return parameters
 * are forwarded (`oauthReturnQueryString`, inside `landingRouteDecision`), and
 * the code does transit the server tier on this route — hosting may exclude its
 * query string from access logs.
 */
export default async function RootRoute(props: {
  readonly searchParams?: Promise<SearchParams>
}) {
  const decision = landingRouteDecision({
    searchParams: (await props.searchParams) ?? {},
    // The flag registry decides (`UZF-22`): on, the landing mounts; off, the
    // route is the passive 307 to My Day it has been since KC-IS-#79.
    landingEnabled: isLandingEnabled(),
  })
  if (decision.kind === 'landing')
    return <LandingPageClient contactEmail={contactEmail()} />
  redirect(decision.to)
}
