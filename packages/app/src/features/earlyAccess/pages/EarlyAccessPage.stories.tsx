import { StoreProvider } from '../../../library/StoreProvider'
import { MarketingStage } from '../../../design/marketing/marketingStage'
import { makeEarlyAccessStore } from '../EarlyAccessMocks'
import {
  userDidBlurEmail,
  userDidEditEmail,
  userDidPickPlatform,
} from '../EarlyAccessFeature'
import { EarlyAccessPage } from './EarlyAccessPage'

/**
 * `EarlyAccessPage` stories — the connected form on a REAL store with the
 * stubbed sign-up Service. They prove the wiring: typing reaches the slice,
 * a blurred bad address reaches the field error.
 */
export default {
  title: 'Landing/EarlyAccessPage',
  component: EarlyAccessPage,
  parameters: { layout: 'fullscreen' },
}

export const Idle = {
  name: 'Idle',
  render: () => (
    <StoreProvider store={makeEarlyAccessStore().store}>
      <MarketingStage width={560}>
        <EarlyAccessPage />
      </MarketingStage>
    </StoreProvider>
  ),
}

export const TypingForMac = {
  name: 'Typing · Mac picked',
  render: () => {
    const { store } = makeEarlyAccessStore()
    store.dispatch(userDidEditEmail({ value: 'ada@example.com' }))
    store.dispatch(userDidPickPlatform({ platform: 'macos' }))
    return (
      <StoreProvider store={store}>
        <MarketingStage theme="dark" width={560}>
          <EarlyAccessPage />
        </MarketingStage>
      </StoreProvider>
    )
  },
}

export const BadAddressLeft = {
  name: 'Bad address · field left',
  render: () => {
    const { store } = makeEarlyAccessStore()
    store.dispatch(userDidEditEmail({ value: 'ada@' }))
    store.dispatch(userDidBlurEmail())
    return (
      <StoreProvider store={store}>
        <MarketingStage idiom="mobile" width={390}>
          <EarlyAccessPage />
        </MarketingStage>
      </StoreProvider>
    )
  },
}
