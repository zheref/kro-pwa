/** The pricing page's closing call to action — the same two doors as its cards. */
import { GlassCta, MarketingSection } from '../../../../design/marketing'
import { pricingCtaCopy } from '../../LandingCopy'
import type { CtaPlacement } from '../../LandingProducer'
import {
  LANDING_SECTION_IDS,
  PRICING_SECTION_IDS,
  landingSectionHref,
} from '../../LandingSections'

export interface PricingCtaSectionProps {
  readonly hubUrl: string
  readonly onOpenHub: (placement: CtaPlacement) => void
  readonly onGetEarlyAccess: (placement: CtaPlacement) => void
}

export function PricingCtaSection({
  hubUrl,
  onOpenHub,
  onGetEarlyAccess,
}: PricingCtaSectionProps) {
  return (
    <MarketingSection id={PRICING_SECTION_IDS.start} width="wide" as="div">
      <GlassCta
        eyebrow={pricingCtaCopy.eyebrow}
        title={pricingCtaCopy.title}
        lede={pricingCtaCopy.lede}
        primary={{
          label: pricingCtaCopy.primary,
          href: hubUrl,
          onClick: () => onOpenHub('pricing'),
        }}
        secondary={{
          label: pricingCtaCopy.secondary,
          href: landingSectionHref(LANDING_SECTION_IDS.earlyAccess, 'pricing'),
          onClick: () => onGetEarlyAccess('pricing'),
        }}
      />
    </MarketingSection>
  )
}
