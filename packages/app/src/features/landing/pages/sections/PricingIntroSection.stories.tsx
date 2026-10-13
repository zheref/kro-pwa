import { MarketingStage } from '../../../../design/marketing/marketingStage'
import { PricingIntroSection } from './PricingIntroSection'

/**
 * `PricingIntroSection` stories — the three states the render tests mirror
 * (`PricingIntroSection.test.tsx`): light desktop, dark desktop, and a 390px phone.
 */
export default {
  title: 'Landing/PricingIntroSection',
  component: PricingIntroSection,
  parameters: { layout: 'fullscreen' },
}

export const Desktop = {
  name: 'Desktop · light',
  render: () => (
    <MarketingStage>
      <PricingIntroSection />
    </MarketingStage>
  ),
}

export const Dark = {
  name: 'Desktop · dark',
  render: () => (
    <MarketingStage theme="dark">
      <PricingIntroSection />
    </MarketingStage>
  ),
}

export const Phone = {
  name: 'Phone · 390px',
  render: () => (
    <MarketingStage idiom="mobile" width={390}>
      <PricingIntroSection />
    </MarketingStage>
  ),
}
