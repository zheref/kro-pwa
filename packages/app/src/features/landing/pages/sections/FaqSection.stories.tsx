import { MarketingStage } from '../../../../design/marketing/marketingStage'
import { FaqSection } from './FaqSection'

/** `FaqSection` stories — all closed, one open, and the phone. */
export default {
  title: 'Landing/FaqSection',
  component: FaqSection,
  parameters: { layout: 'fullscreen' },
}

const noop = (): void => undefined

export const Closed = {
  name: 'Desktop · light · all closed',
  render: () => (
    <MarketingStage>
      <FaqSection openId={null} onOpen={noop} onClose={noop} />
    </MarketingStage>
  ),
}

export const OpenDark = {
  name: 'Desktop · dark · one open',
  render: () => (
    <MarketingStage theme="dark">
      <FaqSection openId="free" onOpen={noop} onClose={noop} />
    </MarketingStage>
  ),
}

export const OpenPhone = {
  name: 'Phone · 390px · one open',
  render: () => (
    <MarketingStage idiom="mobile" width={390}>
      <FaqSection openId="endeavor" onOpen={noop} onClose={noop} />
    </MarketingStage>
  ),
}
