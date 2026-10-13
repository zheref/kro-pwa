import { StoreProvider } from '../../../library/StoreProvider'
import { MarketingStage } from '../../../design/marketing/marketingStage'
import { makeLandingStore } from '../LandingMocks'
import { PricingPage } from './PricingPage'

/**
 * `PricingPage` stories — the connected page on a REAL store (stubbed
 * Services), so they prove the wiring through the landing's own hook.
 */
export default {
  title: 'Landing/PricingPage',
  component: PricingPage,
  parameters: { layout: 'fullscreen' },
}

export const Default = {
  name: 'Desktop · light · first visit',
  render: () => (
    <StoreProvider store={makeLandingStore().store}>
      <MarketingStage>
        <PricingPage />
      </MarketingStage>
    </StoreProvider>
  ),
}

export const DarkOtherHub = {
  name: 'Desktop · dark · hub on its own origin',
  render: () => (
    <StoreProvider store={makeLandingStore().store}>
      <MarketingStage theme="dark">
        <PricingPage hubUrl="https://app.kro.example/my-day" />
      </MarketingStage>
    </StoreProvider>
  ),
}

export const Phone = {
  name: 'Phone · 390px',
  render: () => (
    <StoreProvider store={makeLandingStore().store}>
      <MarketingStage idiom="mobile" width={390}>
        <PricingPage />
      </MarketingStage>
    </StoreProvider>
  ),
}
