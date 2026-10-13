/**
 * Four pricing questions, answered in the open: a definition list, not an
 * accordion, because there are few and each answer is short — nothing to
 * expand, nothing to count.
 */
import {
  MarketingSection,
  Reveal,
  SectionHeader,
} from '../../../../design/marketing'
import { pricingFaqCopy, pricingFaqEntries } from '../../LandingCopy'
import { PRICING_SECTION_IDS, headingIdFor } from '../../LandingSections'

export function PricingFaqSection() {
  const titleId = headingIdFor(PRICING_SECTION_IDS.faq)
  return (
    <MarketingSection
      id={PRICING_SECTION_IDS.faq}
      width="narrow"
      labelledBy={titleId}
    >
      <SectionHeader
        eyebrow={pricingFaqCopy.eyebrow}
        title={pricingFaqCopy.title}
        headingId={titleId}
      />
      <Reveal>
        <dl className="m-0 grid gap-kro-x-large">
          {pricingFaqEntries.map((entry) => (
            <div key={entry.id} className="grid gap-kro-tiny">
              <dt className="font-semibold text-kro-fore text-xl">
                {entry.question}
              </dt>
              <dd className="m-0 text-kro-fore-secondary">{entry.answer}</dd>
            </div>
          ))}
        </dl>
      </Reveal>
    </MarketingSection>
  )
}
