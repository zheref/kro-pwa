/**
 * The pricing page's body — a pure Fragment (`RC-15`, `UZF-4`).
 *
 * It reads nothing from the store and dispatches nothing: the theme, the hub
 * link and one callback per intent arrive as props. It shares the landing's
 * bar and footer, pointed back at the landing's sections, with Pricing marked
 * as the current link. Exactly one `h1`, in the intro.
 */
import { BackToTop } from '../../../design/marketing'
import type { LandingTheme } from '../LandingFeature'
import type { CtaPlacement } from '../LandingProducer'
import { PRICING_NAV_ID } from '../LandingSections'
import { LandingFooter } from './sections/LandingFooter'
import { LandingNav } from './sections/LandingNav'
import { PricingCompareSection } from './sections/PricingCompareSection'
import { PricingCtaSection } from './sections/PricingCtaSection'
import { PricingFaqSection } from './sections/PricingFaqSection'
import { PricingIntroSection } from './sections/PricingIntroSection'
import { PricingTiersSection } from './sections/PricingTiersSection'

export interface PricingFragmentProps {
  readonly theme: LandingTheme
  readonly hubUrl: string
  readonly onToggleTheme: () => void
  readonly onOpenHub: (placement: CtaPlacement) => void
  readonly onGetEarlyAccess: (placement: CtaPlacement) => void
  readonly onOutbound: (href: string) => void
  readonly onNavigate: (href: string) => void
  readonly onOpenMenu: () => void
}

export function PricingFragment({
  theme,
  hubUrl,
  onToggleTheme,
  onOpenHub,
  onGetEarlyAccess,
  onOutbound,
  onNavigate,
  onOpenMenu,
}: PricingFragmentProps) {
  return (
    <div className="bg-kro-back text-kro-fore">
      <LandingNav
        surface="pricing"
        activeId={PRICING_NAV_ID}
        theme={theme}
        hubUrl={hubUrl}
        onToggleTheme={onToggleTheme}
        onOpenHub={() => onOpenHub('nav')}
        onNavigate={onNavigate}
        onOpenMenu={onOpenMenu}
      />
      <main id="main" tabIndex={-1} className="overflow-x-clip outline-none">
        <PricingIntroSection />
        <PricingTiersSection
          hubUrl={hubUrl}
          onOpenHub={onOpenHub}
          onGetEarlyAccess={onGetEarlyAccess}
        />
        <PricingCompareSection />
        <PricingFaqSection />
        <PricingCtaSection
          hubUrl={hubUrl}
          onOpenHub={onOpenHub}
          onGetEarlyAccess={onGetEarlyAccess}
        />
      </main>
      <LandingFooter surface="pricing" onOutbound={onOutbound} />
      <BackToTop />
    </div>
  )
}
