/**
 * The landing Page — the stateful container (`RC-37`, `UZF-4`).
 *
 * No markup of its own beyond the one Fragment: the headless hook supplies the
 * view model and the callbacks. The early-access form is its own Page
 * (`EarlyAccessPage`), composed in as the Fragment's slot; a Page may compose
 * across features, and each reads only its own slice.
 */
import { EarlyAccessPage } from '../../earlyAccess/pages/EarlyAccessPage'
import { DEFAULT_HUB_URL } from '../LandingFeature'
import { useLanding } from '../useLanding'
import { LandingFragment } from './LandingFragment'

export interface LandingPageProps {
  /**
   * Where "Open Kro" goes. The hub is a different origin in production, which
   * this package cannot read from the environment — `apps/web` passes it.
   */
  readonly hubUrl?: string
}

export function LandingPage({ hubUrl = DEFAULT_HUB_URL }: LandingPageProps) {
  const landing = useLanding(hubUrl)
  return (
    <LandingFragment
      {...landing}
      earlyAccess={
        <EarlyAccessPage
          hubUrl={hubUrl}
          onOpenHub={() => landing.onOpenHub('success')}
        />
      }
    />
  )
}
