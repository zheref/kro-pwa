/**
 * The pricing Page — the stateful container (`RC-37`, `UZF-4`).
 *
 * It runs the landing's own headless hook, so the page view, the theme switch,
 * the calls to action and the menu are counted and remembered exactly as on
 * the landing — the slice is the landing's; pricing has no state of its own.
 * No markup beyond the one Fragment.
 */
import { DEFAULT_HUB_URL } from '../LandingFeature'
import { useLanding } from '../useLanding'
import { PricingFragment } from './PricingFragment'

export interface PricingPageProps {
  /** Where "Open Kro" goes; `apps/web` passes the hub address. */
  readonly hubUrl?: string
}

export function PricingPage({ hubUrl = DEFAULT_HUB_URL }: PricingPageProps) {
  const landing = useLanding(hubUrl)
  return (
    <PricingFragment
      theme={landing.theme}
      hubUrl={landing.hubUrl}
      onToggleTheme={landing.onToggleTheme}
      onOpenHub={landing.onOpenHub}
      onGetEarlyAccess={landing.onGetEarlyAccess}
      onOutbound={landing.onOutbound}
      onNavigate={landing.onNavigate}
      onOpenMenu={landing.onOpenMenu}
    />
  )
}
