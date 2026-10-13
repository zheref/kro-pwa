import { StoreProvider } from '../../../library/StoreProvider'
import { MarketingStage } from '../../../design/marketing/marketingStage'
import { userDidOpenFaq } from '../LandingFeature'
import { makeLandingStore } from '../LandingMocks'
import { LandingPage } from './LandingPage'

/**
 * `LandingPage` stories — the connected page on a REAL store (stubbed
 * Services, recording analytics), so they prove the wiring: the form is the
 * real early-access Page, the FAQ entry is the slice's.
 */
export default {
  title: 'Landing/LandingPage',
  component: LandingPage,
  parameters: { layout: 'fullscreen' },
}

export const Default = {
  name: 'Desktop · light · first visit',
  render: () => (
    <StoreProvider store={makeLandingStore().store}>
      <MarketingStage>
        <LandingPage />
      </MarketingStage>
    </StoreProvider>
  ),
}

export const DarkOtherHub = {
  name: 'Desktop · dark · hub on its own origin',
  render: () => (
    <StoreProvider store={makeLandingStore().store}>
      <MarketingStage theme="dark">
        <LandingPage hubUrl="https://app.kro.example/my-day" />
      </MarketingStage>
    </StoreProvider>
  ),
}

export const PhoneFaqOpen = {
  name: 'Phone · 390px · FAQ entry open',
  render: () => {
    const { store } = makeLandingStore()
    store.dispatch(userDidOpenFaq({ id: 'offline' }))
    return (
      <StoreProvider store={store}>
        <MarketingStage idiom="mobile" width={390}>
          <LandingPage />
        </MarketingStage>
      </StoreProvider>
    )
  },
}
