import { MarketingStage } from '../../../../design/marketing/marketingStage'
import { PricingCtaSection } from './PricingCtaSection'

const noop = (): void => undefined

/**
 * `PricingCtaSection` stories — the three states the render tests mirror
 * (`PricingCtaSection.test.tsx`): light desktop, dark desktop with the hub on its own origin, and a 390px phone.
 */
export default {
  title: 'Landing/PricingCtaSection',
  component: PricingCtaSection,
  parameters: { layout: 'fullscreen' },
}

export const Desktop = {
  name: 'Desktop · light',
  render: () => (
    <MarketingStage>
      <PricingCtaSection
        hubUrl="/my-day"
        onOpenHub={noop}
        onGetEarlyAccess={noop}
      />
    </MarketingStage>
  ),
}

export const Dark = {
  name: 'Desktop · dark',
  render: () => (
    <MarketingStage theme="dark">
      <PricingCtaSection
        hubUrl="https://app.kro.example/my-day"
        onOpenHub={noop}
        onGetEarlyAccess={noop}
      />
    </MarketingStage>
  ),
}

export const Phone = {
  name: 'Phone · 390px',
  render: () => (
    <MarketingStage idiom="mobile" width={390}>
      <PricingCtaSection
        hubUrl="/my-day"
        onOpenHub={noop}
        onGetEarlyAccess={noop}
      />
    </MarketingStage>
  ),
}
