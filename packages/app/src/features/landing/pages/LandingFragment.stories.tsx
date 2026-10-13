import { MarketingStage } from '../../../design/marketing/marketingStage'
import {
  EarlyAccessMocks,
  earlyAccessFragmentProps,
} from '../../earlyAccess/EarlyAccessMocks'
import { EarlyAccessFragment } from '../../earlyAccess/pages/EarlyAccessFragment'
import {
  landingStateMocks,
  landingValueProps,
  noopLandingCallbacks,
} from '../LandingMocks'
import { LandingFragment } from './LandingFragment'

/**
 * `LandingFragment` stories — the whole page as pure props, from
 * `LandingMocks`: mid-page light, dark, and a phone with the FAQ open.
 */
export default {
  title: 'Landing/LandingFragment',
  component: LandingFragment,
  parameters: { layout: 'fullscreen' },
}

const form = (state: typeof EarlyAccessMocks.idle) => (
  <EarlyAccessFragment {...earlyAccessFragmentProps(state)} />
)

export const MidPage = {
  name: 'Desktop · light · mid-page',
  render: () => (
    <MarketingStage>
      <LandingFragment
        {...noopLandingCallbacks}
        {...landingValueProps(landingStateMocks.midPage)}
        earlyAccess={form(EarlyAccessMocks.idle)}
      />
    </MarketingStage>
  ),
}

export const Dark = {
  name: 'Desktop · dark',
  render: () => (
    <MarketingStage theme="dark">
      <LandingFragment
        {...noopLandingCallbacks}
        {...landingValueProps(landingStateMocks.dark)}
        earlyAccess={form(EarlyAccessMocks.typing)}
      />
    </MarketingStage>
  ),
}

export const Phone = {
  name: 'Phone · 390px · menu state',
  render: () => (
    <MarketingStage idiom="mobile" width={390}>
      <LandingFragment
        {...noopLandingCallbacks}
        {...landingValueProps(landingStateMocks.navOpen)}
        earlyAccess={form(EarlyAccessMocks.idle)}
      />
    </MarketingStage>
  ),
}
