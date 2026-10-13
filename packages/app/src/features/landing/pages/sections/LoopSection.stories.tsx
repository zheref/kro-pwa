import { MarketingStage } from '../../../../design/marketing/marketingStage'
import { LoopSection } from './LoopSection'

/**
 * `LoopSection` stories — the three states the render tests mirror
 * (`LoopSection.test.tsx`): light desktop, dark desktop, and a 390px phone.
 * Every image is a mock-fixture render from the landing catalog.
 */
export default {
  title: 'Landing/LoopSection',
  component: LoopSection,
  parameters: { layout: 'fullscreen' },
}

export const Desktop = {
  name: 'Desktop · light',
  render: () => (
    <MarketingStage>
      <LoopSection />
    </MarketingStage>
  ),
}

export const Dark = {
  name: 'Desktop · dark',
  render: () => (
    <MarketingStage theme="dark">
      <LoopSection />
    </MarketingStage>
  ),
}

export const Phone = {
  name: 'Phone · 390px',
  render: () => (
    <MarketingStage idiom="mobile" width={390}>
      <LoopSection />
    </MarketingStage>
  ),
}
