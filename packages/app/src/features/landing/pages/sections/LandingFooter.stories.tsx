import { MarketingStage } from '../../../../design/marketing/marketingStage'
import { LandingFooter } from './LandingFooter'

/**
 * `LandingFooter` stories — the three states the render tests mirror
 * (`LandingFooter.test.tsx`): light desktop, dark desktop, and a 390px phone.
 * Every image is a mock-fixture render from the landing catalog.
 */
export default {
  title: 'Landing/LandingFooter',
  component: LandingFooter,
  parameters: { layout: 'fullscreen' },
}

const noop = (): void => undefined

export const Desktop = {
  name: 'Desktop · light',
  render: () => (
    <MarketingStage>
      <LandingFooter onOutbound={noop} />
    </MarketingStage>
  ),
}

export const Dark = {
  name: 'Desktop · dark',
  render: () => (
    <MarketingStage theme="dark">
      <LandingFooter onOutbound={noop} />
    </MarketingStage>
  ),
}

export const Phone = {
  name: 'Phone · 390px',
  render: () => (
    <MarketingStage idiom="mobile" width={390}>
      <LandingFooter onOutbound={noop} />
    </MarketingStage>
  ),
}
