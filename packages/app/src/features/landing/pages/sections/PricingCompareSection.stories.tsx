import { MarketingStage } from '../../../../design/marketing/marketingStage'
import { PricingCompareSection } from './PricingCompareSection'

/**
 * `PricingCompareSection` stories — the three states the render tests mirror
 * (`PricingCompareSection.test.tsx`): light desktop, dark desktop, and a 390px phone.
 */
export default {
  title: 'Landing/PricingCompareSection',
  component: PricingCompareSection,
  parameters: { layout: 'fullscreen' },
}

export const Desktop = {
  name: 'Desktop · light',
  render: () => (
    <MarketingStage>
      <PricingCompareSection />
    </MarketingStage>
  ),
}

export const Dark = {
  name: 'Desktop · dark',
  render: () => (
    <MarketingStage theme="dark">
      <PricingCompareSection />
    </MarketingStage>
  ),
}

export const Phone = {
  name: 'Phone · 390px',
  render: () => (
    <MarketingStage idiom="mobile" width={390}>
      <PricingCompareSection />
    </MarketingStage>
  ),
}
