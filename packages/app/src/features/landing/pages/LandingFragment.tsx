/**
 * The landing page's body — a pure Fragment (`RC-15`, `UZF-4`).
 *
 * It reads nothing from the store and dispatches nothing: the selected values
 * and one callback per intent arrive as props. The early-access form is a slot
 * node, so the Page mounts the connected form and a story mounts a mock one.
 *
 * Landmarks: `header` (the nav), `main#main` (the skip link's target), one
 * `section[aria-labelledby]` per band, and the footer. There is exactly one
 * `h1`, in the hero.
 */
import type { KroPlatform } from '@kro/core'
import type { ReactNode } from 'react'
import { BackToTop } from '../../../design/marketing'
import type { LandingTheme } from '../LandingFeature'
import type { CtaPlacement } from '../LandingProducer'
import { EarlyAccessSection } from './sections/EarlyAccessSection'
import { FaqSection } from './sections/FaqSection'
import { FederationSection } from './sections/FederationSection'
import { FinalCtaSection } from './sections/FinalCtaSection'
import { FocusSection } from './sections/FocusSection'
import { HeroSection } from './sections/HeroSection'
import { LandingFooter } from './sections/LandingFooter'
import { LandingNav } from './sections/LandingNav'
import { LoopSection } from './sections/LoopSection'
import { PlatformsSection } from './sections/PlatformsSection'
import { PrivacySection } from './sections/PrivacySection'

export interface LandingFragmentProps {
  readonly activeSectionId: string | null
  readonly faqOpenId: string | null
  readonly theme: LandingTheme
  readonly hubUrl: string
  /** The early-access form card. */
  readonly earlyAccess: ReactNode
  readonly onToggleTheme: () => void
  readonly onOpenHub: (placement: CtaPlacement) => void
  readonly onGetEarlyAccess: (placement: CtaPlacement) => void
  readonly onPickPlatform: (platform: KroPlatform) => void
  readonly onVotePlatform: (platform: KroPlatform) => void
  readonly onFaqOpen: (id: string) => void
  readonly onFaqClose: () => void
  readonly onOutbound: (href: string) => void
  readonly onNavigate: (href: string) => void
  readonly onOpenMenu: () => void
}

export function LandingFragment({
  activeSectionId,
  faqOpenId,
  theme,
  hubUrl,
  earlyAccess,
  onToggleTheme,
  onOpenHub,
  onGetEarlyAccess,
  onPickPlatform,
  onVotePlatform,
  onFaqOpen,
  onFaqClose,
  onOutbound,
  onNavigate,
  onOpenMenu,
}: LandingFragmentProps) {
  return (
    <div className="bg-kro-back text-kro-fore">
      <LandingNav
        activeId={activeSectionId}
        theme={theme}
        hubUrl={hubUrl}
        onToggleTheme={onToggleTheme}
        onOpenHub={() => onOpenHub('nav')}
        onNavigate={onNavigate}
        onOpenMenu={onOpenMenu}
      />
      <main id="main" tabIndex={-1} className="overflow-x-clip outline-none">
        <HeroSection
          hubUrl={hubUrl}
          onOpenHub={onOpenHub}
          onGetEarlyAccess={onGetEarlyAccess}
        />
        <LoopSection />
        <FocusSection />
        <PlatformsSection
          hubUrl={hubUrl}
          onPickPlatform={onPickPlatform}
          onVotePlatform={onVotePlatform}
          onOpenHub={onOpenHub}
        />
        <FederationSection />
        <PrivacySection />
        <EarlyAccessSection>{earlyAccess}</EarlyAccessSection>
        <FaqSection
          openId={faqOpenId}
          onOpen={onFaqOpen}
          onClose={onFaqClose}
        />
        <FinalCtaSection
          hubUrl={hubUrl}
          onOpenHub={onOpenHub}
          onGetEarlyAccess={onGetEarlyAccess}
        />
      </main>
      <LandingFooter onOutbound={onOutbound} />
      <BackToTop />
    </div>
  )
}
