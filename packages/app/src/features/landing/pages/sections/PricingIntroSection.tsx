/**
 * The pricing page's opening — its one `h1`, on the indigo→grape field the
 * landing's hero uses, and the launch-pricing label next to the prices'
 * first mention.
 */
import { MarketingSection } from '../../../../design/marketing'
import { pricingCopy } from '../../LandingCopy'
import { PRICING_SECTION_IDS, headingIdFor } from '../../LandingSections'

export function PricingIntroSection() {
  const titleId = headingIdFor(PRICING_SECTION_IDS.top)
  return (
    <MarketingSection
      id={PRICING_SECTION_IDS.top}
      tone="gradient"
      width="wide"
      labelledBy={titleId}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span className="kro-hairline-grid absolute inset-0 opacity-30" />
        <span className="kro-glow-blob" style={{ top: '-40%', left: '-12%' }} />
        <span
          className="kro-glow-blob kro-glow-blob--grape"
          style={{ bottom: '-44%', right: '-10%' }}
        />
      </div>
      <div className="relative grid max-w-[52rem] grid-cols-1 justify-items-start gap-kro-large">
        <p className="kro-eyebrow">{pricingCopy.eyebrow}</p>
        <h1 id={titleId} className="kro-display-1">
          {pricingCopy.title}
        </h1>
        <p className="kro-lede">{pricingCopy.lede}</p>
        <p className="m-0 rounded-kro-pill border border-current px-kro-medium py-kro-tiny font-semibold text-base">
          {pricingCopy.note}
        </p>
      </div>
    </MarketingSection>
  )
}
