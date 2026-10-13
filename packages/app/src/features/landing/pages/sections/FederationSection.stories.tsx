import { MarketingStage } from '../../../../design/marketing/marketingStage'
import { FederationSection } from './FederationSection'

/**
 * `FederationSection` stories — the three states the render tests mirror
 * (`FederationSection.test.tsx`): light desktop, dark desktop, and a 390px phone.
 * Every image is a mock-fixture render from the landing catalog.
 */
export default {
  title: 'Landing/FederationSection',
  component: FederationSection,
  parameters: { layout: 'fullscreen' },
}

export const Desktop = {
  name: 'Desktop · light',
  render: () => (
    <MarketingStage>
      <FederationSection />
    </MarketingStage>
  ),
}

export const Dark = {
  name: 'Desktop · dark',
  render: () => (
    <MarketingStage theme="dark">
      <FederationSection />
    </MarketingStage>
  ),
}

export const Phone = {
  name: 'Phone · 390px',
  render: () => (
    <MarketingStage idiom="mobile" width={390}>
      <FederationSection />
    </MarketingStage>
  ),
}
