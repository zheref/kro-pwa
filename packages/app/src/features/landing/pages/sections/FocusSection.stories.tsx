import { MarketingStage } from '../../../../design/marketing/marketingStage'
import { FocusSection } from './FocusSection'

/**
 * `FocusSection` stories — the three states the render tests mirror
 * (`FocusSection.test.tsx`): light desktop, dark desktop, and a 390px phone.
 * Every image is a mock-fixture render from the landing catalog.
 */
export default {
  title: 'Landing/FocusSection',
  component: FocusSection,
  parameters: { layout: 'fullscreen' },
}

export const Desktop = {
  name: 'Desktop · light',
  render: () => (
    <MarketingStage>
      <FocusSection />
    </MarketingStage>
  ),
}

export const Dark = {
  name: 'Desktop · dark',
  render: () => (
    <MarketingStage theme="dark">
      <FocusSection />
    </MarketingStage>
  ),
}

export const Phone = {
  name: 'Phone · 390px',
  render: () => (
    <MarketingStage idiom="mobile" width={390}>
      <FocusSection />
    </MarketingStage>
  ),
}
