/** The closing call to action — the same two doors as the hero. */
import { GlassCta, MarketingSection } from '../../../../design/marketing'
import { finalCtaCopy } from '../../LandingCopy'
import type { CtaPlacement } from '../../LandingProducer'
import { LANDING_SECTION_IDS, sectionHref } from '../../LandingSections'

export interface FinalCtaSectionProps {
  readonly hubUrl: string
  readonly onOpenHub: (placement: CtaPlacement) => void
  readonly onGetEarlyAccess: (placement: CtaPlacement) => void
}

export function FinalCtaSection({
  hubUrl,
  onOpenHub,
  onGetEarlyAccess,
}: FinalCtaSectionProps) {
  return (
    <MarketingSection id={LANDING_SECTION_IDS.start} width="wide" as="div">
      <GlassCta
        eyebrow={finalCtaCopy.eyebrow}
        title={finalCtaCopy.title}
        lede={finalCtaCopy.lede}
        primary={{
          label: finalCtaCopy.primary,
          href: hubUrl,
          onClick: () => onOpenHub('final'),
        }}
        secondary={{
          label: finalCtaCopy.secondary,
          href: sectionHref(LANDING_SECTION_IDS.earlyAccess),
          onClick: () => onGetEarlyAccess('final'),
        }}
      />
    </MarketingSection>
  )
}
