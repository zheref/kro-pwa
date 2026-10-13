import { MarketingStage } from '../../../../design/marketing/marketingStage'
import { PrivacySection } from './PrivacySection'

/**
 * `PrivacySection` stories — the three states the render tests mirror
 * (`PrivacySection.test.tsx`): light desktop, dark desktop, and a 390px phone.
 * Every image is a mock-fixture render from the landing catalog.
 */
export default {
  title: 'Landing/PrivacySection',
  component: PrivacySection,
  parameters: { layout: 'fullscreen' },
}

export const Desktop = {
  name: 'Desktop · light',
  render: () => (
    <MarketingStage>
      <PrivacySection />
    </MarketingStage>
  ),
}

export const Dark = {
  name: 'Desktop · dark',
  render: () => (
    <MarketingStage theme="dark">
      <PrivacySection />
    </MarketingStage>
  ),
}

export const Phone = {
  name: 'Phone · 390px',
  render: () => (
    <MarketingStage idiom="mobile" width={390}>
      <PrivacySection />
    </MarketingStage>
  ),
}
