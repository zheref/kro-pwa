import { MarketingStage } from '../../../../design/marketing/marketingStage'
import { HeroSection } from './HeroSection'

/**
 * `HeroSection` stories — the three states the render tests mirror
 * (`HeroSection.test.tsx`): light desktop, dark desktop, and a 390px phone.
 * Every image is a mock-fixture render from the landing catalog.
 */
export default {
  title: 'Landing/HeroSection',
  component: HeroSection,
  parameters: { layout: 'fullscreen' },
}

const noop = (): void => undefined

export const Desktop = {
  name: 'Desktop · light',
  render: () => (
    <MarketingStage>
      <HeroSection hubUrl="/my-day" onOpenHub={noop} onGetEarlyAccess={noop} />
    </MarketingStage>
  ),
}

export const Dark = {
  name: 'Desktop · dark',
  render: () => (
    <MarketingStage theme="dark">
      <HeroSection hubUrl="/my-day" onOpenHub={noop} onGetEarlyAccess={noop} />
    </MarketingStage>
  ),
}

export const Phone = {
  name: 'Phone · 390px',
  render: () => (
    <MarketingStage idiom="mobile" width={390}>
      <HeroSection hubUrl="/my-day" onOpenHub={noop} onGetEarlyAccess={noop} />
    </MarketingStage>
  ),
}
