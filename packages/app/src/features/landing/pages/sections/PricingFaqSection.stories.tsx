import { MarketingStage } from '../../../../design/marketing/marketingStage'
import { PricingFaqSection } from './PricingFaqSection'

/**
 * `PricingFaqSection` stories — the three states the render tests mirror
 * (`PricingFaqSection.test.tsx`): light desktop, dark desktop, and a 390px phone.
 */
export default {
  title: 'Landing/PricingFaqSection',
  component: PricingFaqSection,
  parameters: { layout: 'fullscreen' },
}

export const Desktop = {
  name: 'Desktop · light',
  render: () => (
    <MarketingStage>
      <PricingFaqSection />
    </MarketingStage>
  ),
}

export const Dark = {
  name: 'Desktop · dark',
  render: () => (
    <MarketingStage theme="dark">
      <PricingFaqSection />
    </MarketingStage>
  ),
}

export const Phone = {
  name: 'Phone · 390px',
  render: () => (
    <MarketingStage idiom="mobile" width={390}>
      <PricingFaqSection />
    </MarketingStage>
  ),
}
