/**
 * The early-access band: a header, two glow blobs and a slot for the form
 * card. The slot is a node, not a component, so this Fragment stays pure and
 * the landing Page decides which form to mount (the real Page, or a Fragment
 * built from mocks in a story).
 */
import type { ReactNode } from 'react'
import {
  MarketingSection,
  Reveal,
  SectionHeader,
} from '../../../../design/marketing'
import { earlyAccessCopy } from '../../LandingCopy'
import { LANDING_SECTION_IDS, headingIdFor } from '../../LandingSections'

export interface EarlyAccessSectionProps {
  readonly children: ReactNode
}

export function EarlyAccessSection({ children }: EarlyAccessSectionProps) {
  const titleId = headingIdFor(LANDING_SECTION_IDS.earlyAccess)
  return (
    <MarketingSection
      id={LANDING_SECTION_IDS.earlyAccess}
      width="narrow"
      labelledBy={titleId}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span
          className="kro-glow-blob"
          style={{ top: '10%', left: '-20%', opacity: 0.35 }}
        />
        <span
          className="kro-glow-blob kro-glow-blob--grape"
          style={{ bottom: '-10%', right: '-20%', opacity: 0.35 }}
        />
      </div>
      <div className="relative">
        <SectionHeader
          eyebrow={earlyAccessCopy.eyebrow}
          title={earlyAccessCopy.title}
          lede={earlyAccessCopy.lede}
          headingId={titleId}
          className="kro-section-header--on-glow"
        />
        <Reveal>{children}</Reveal>
      </div>
    </MarketingSection>
  )
}
