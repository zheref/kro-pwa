import { oauthReturnQueryString } from '@kro/core'

/**
 * What `/` does with a visit — the decision, kept out of the route file.
 *
 * Two outcomes, in this order:
 *
 * 1. **An OAuth provider return always goes to the app.** Supabase Auth returns
 *    to the address it was given with `?code=…` (and maybe `state`, or `error`
 *    + `error_description`), and the installed app's history has `/` as that
 *    address. Those parameters — and only those (`oauthReturnQueryString`,
 *    `SEC-5`) — ride along to `/my-day`, where the PKCE exchange runs. This
 *    holds even while the landing is enabled: a sign-in must never strand on a
 *    marketing page.
 * 2. **Otherwise the landing** — the `landingPage` flag ships on through the
 *    web product's shipping overrides in `@kro/core`, so this is what `/`
 *    serves. With the flag off, the visit is the 307 fallback to `/my-day`.
 *    An arbitrary query (`?utm_source=…`) is never forwarded either way.
 *
 * On the hub host this file is never reached for `/`: the middleware rewrites
 * it to `/my-day` first (see `hostRouting.ts`).
 */
export type SearchParams = Readonly<
  Record<string, string | string[] | undefined>
>

export type LandingRouteDecision =
  | { readonly kind: 'redirect'; readonly to: string }
  | { readonly kind: 'landing' }

export const LANDING_FALLBACK_DESTINATION = '/my-day'

export const landingRouteDecision = ({
  searchParams,
  landingEnabled,
}: {
  readonly searchParams: SearchParams
  readonly landingEnabled: boolean
}): LandingRouteDecision => {
  const suffix = oauthReturnQueryString(searchParams)
  if (suffix.length > 0) {
    return { kind: 'redirect', to: `${LANDING_FALLBACK_DESTINATION}?${suffix}` }
  }
  if (landingEnabled) return { kind: 'landing' }
  return { kind: 'redirect', to: LANDING_FALLBACK_DESTINATION }
}
