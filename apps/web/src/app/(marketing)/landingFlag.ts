import { FeatureFlags, makeWebShippingFeatureFlagService } from '@kro/core'

/**
 * Whether the landing page is on for this build — read from the flag registry
 * (`UZF-22`), through the web product's shipping overrides in `@kro/core`, so
 * the Server Page and the running app answer from the same list. Synchronous
 * and pure: a Provider read, not a Service call (`RC-47`), and nothing here
 * touches a browser global, so it is safe in a Server Component.
 */
export const isLandingEnabled = (): boolean =>
  makeWebShippingFeatureFlagService().isEnabled(FeatureFlags.landingPage)
