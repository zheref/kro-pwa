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
  /** Where to write to be removed from the list; `null` when none is set. */
  readonly contactEmail?: string | null
}

export function LandingPage({
  hubUrl = DEFAULT_HUB_URL,
  contactEmail = null,
}: LandingPageProps) {
  const { platformRequest, ...landing } = useLanding(hubUrl)
  return (
    <LandingFragment
      {...landing}
      earlyAccess={
        <EarlyAccessPage
          hubUrl={hubUrl}
          contactEmail={contactEmail}
          requestedPlatform={platformRequest}
          onOpenHub={() => landing.onOpenHub('success')}
        />
      }
    />
  )
}
