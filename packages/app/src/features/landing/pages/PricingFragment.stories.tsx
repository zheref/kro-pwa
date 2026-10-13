import { MarketingStage } from '../../../design/marketing/marketingStage'
import {
  landingStateMocks,
  noopPricingCallbacks,
  pricingValueProps,
} from '../LandingMocks'
import { PricingFragment } from './PricingFragment'

/**
 * `PricingFragment` stories — the whole pricing page as pure props, from
 * `LandingMocks`: desktop light, desktop dark with the hub on its own origin,
 * and a 390px phone.
 */
export default {
  title: 'Landing/PricingFragment',
  component: PricingFragment,
  parameters: { layout: 'fullscreen' },
}

export const Desktop = {
  name: 'Desktop · light',
  render: () => (
    <MarketingStage>
      <PricingFragment
        {...noopPricingCallbacks}
        {...pricingValueProps(landingStateMocks.initial)}
      />
    </MarketingStage>
  ),
}

export const Dark = {
  name: 'Desktop · dark · hub on its own origin',
  render: () => (
    <MarketingStage theme="dark">
      <PricingFragment
        {...noopPricingCallbacks}
        {...pricingValueProps(landingStateMocks.dark)}
      />
    </MarketingStage>
  ),
}

export const Phone = {
  name: 'Phone · 390px',
  render: () => (
    <MarketingStage idiom="mobile" width={390}>
      <PricingFragment
        {...noopPricingCallbacks}
        {...pricingValueProps(landingStateMocks.initial)}
      />
    </MarketingStage>
  ),
}
