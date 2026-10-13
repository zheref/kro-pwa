import { MarketingStage } from '../../../../design/marketing/marketingStage'
import { FinalCtaSection } from './FinalCtaSection'

/**
 * `FinalCtaSection` stories — the three states the render tests mirror
 * (`FinalCtaSection.test.tsx`): light desktop, dark desktop, and a 390px phone.
 * Every image is a mock-fixture render from the landing catalog.
 */
export default {
  title: 'Landing/FinalCtaSection',
  component: FinalCtaSection,
  parameters: { layout: 'fullscreen' },
}

const noop = (): void => undefined

export const Desktop = {
  name: 'Desktop · light',
  render: () => (
    <MarketingStage>
      <FinalCtaSection
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
      <FinalCtaSection
        hubUrl="/my-day"
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
      <FinalCtaSection
        hubUrl="/my-day"
        onOpenHub={noop}
        onGetEarlyAccess={noop}
      />
    </MarketingStage>
  ),
}
