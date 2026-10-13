import { MarketingStage } from '../../../../design/marketing/marketingStage'
import { PricingTiersSection } from './PricingTiersSection'

const noop = (): void => undefined

/**
 * `PricingTiersSection` stories — the three states the render tests mirror
 * (`PricingTiersSection.test.tsx`): light desktop, dark desktop with the hub on its own origin, and a 390px phone.
 */
export default {
  title: 'Landing/PricingTiersSection',
  component: PricingTiersSection,
  parameters: { layout: 'fullscreen' },
}

export const Desktop = {
  name: 'Desktop · light',
  render: () => (
    <MarketingStage>
      <PricingTiersSection
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
      <PricingTiersSection
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
      <PricingTiersSection
        hubUrl="/my-day"
        onOpenHub={noop}
        onGetEarlyAccess={noop}
      />
    </MarketingStage>
  ),
}
