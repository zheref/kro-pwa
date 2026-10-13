import { redirect } from 'next/navigation'
import { LandingPageClient } from './LandingPageClient'
import { type SearchParams, landingRouteDecision } from './landingRoute'

/**
 * `/` — the front door, in the `(marketing)` group (a group changes no URL).
 *
 * A passive Server Component (`RC-38`): it reads its search params, asks
 * `landingRouteDecision` what to do with the visit, and either redirects or
 * forwards to the client wrapper. No hook, no store read, no markup of its own.
 *
 * **Today it still redirects every visit to My Day** (`landingEnabled: false`),
 * exactly as before the marketing split — a cold visit gets `/my-day`, a
 * provider return gets `/my-day?code=…`. On the hub host it is not even
 * reached: the middleware rewrites the hub's `/` to `/my-day`.
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
    // TODO(landing): mount <LandingPageClient /> when kind === 'landing' (piece P2-B)
    // — flip this to the landing's feature flag; the branch below already mounts it.
    landingEnabled: false,
  })
  if (decision.kind === 'landing') return <LandingPageClient />
  redirect(decision.to)
}
