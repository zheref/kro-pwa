/**
 * Privacy — three plain promises on a glass panel over the indigo field.
 * The panel is frosted, so the secondary ink is the on-glass token, not the
 * canvas one: the custom property is re-pointed for this subtree only.
 */
import { EyeOff, Fingerprint, ShieldCheck } from 'lucide-react'
import type { CSSProperties } from 'react'
import {
  FeatureCard,
  MarketingSection,
  Reveal,
  SectionHeader,
} from '../../../../design/marketing'
import { privacyCards, privacyCopy } from '../../LandingCopy'
import { LANDING_SECTION_IDS, headingIdFor } from '../../LandingSections'

const ICONS = {
  yours: ShieldCheck,
  'never-sent': EyeOff,
  'random-id': Fingerprint,
} as const

const ON_GLASS_INK = {
  '--kro-color-fore-secondary': 'var(--kro-color-fore-secondary-on-glass)',
} as CSSProperties

export function PrivacySection() {
  const titleId = headingIdFor(LANDING_SECTION_IDS.privacy)
  return (
    <MarketingSection
      id={LANDING_SECTION_IDS.privacy}
      tone="glass"
      width="wide"
      labelledBy={titleId}
    >
      <div className="text-kro-fore" style={ON_GLASS_INK}>
        <SectionHeader
          eyebrow={privacyCopy.eyebrow}
          title={privacyCopy.title}
          lede={privacyCopy.lede}
          headingId={titleId}
        />
        <Reveal className="grid grid-cols-1 gap-kro-large md:grid-cols-3">
          {privacyCards.map((card) => (
            <FeatureCard
              key={card.id}
              icon={ICONS[card.id as keyof typeof ICONS] ?? ShieldCheck}
              title={card.title}
              body={card.body}
            />
          ))}
        </Reveal>
      </div>
    </MarketingSection>
  )
}
