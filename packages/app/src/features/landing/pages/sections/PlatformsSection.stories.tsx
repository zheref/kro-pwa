import { MarketingStage } from '../../../../design/marketing/marketingStage'
import { PlatformsSection } from './PlatformsSection'

/**
 * `PlatformsSection` stories — the three states the render tests mirror
 * (`PlatformsSection.test.tsx`): light desktop, dark desktop, and a 390px phone.
 * Every image is a mock-fixture render from the landing catalog.
 */
export default {
  title: 'Landing/PlatformsSection',
  component: PlatformsSection,
  parameters: { layout: 'fullscreen' },
}

const noop = (): void => undefined

export const Desktop = {
  name: 'Desktop · light',
  render: () => (
    <MarketingStage>
      <PlatformsSection
        hubUrl="/my-day"
        onPickPlatform={noop}
        onVotePlatform={noop}
        onOpenHub={noop}
      />
    </MarketingStage>
  ),
}

export const Dark = {
  name: 'Desktop · dark',
  render: () => (
    <MarketingStage theme="dark">
      <PlatformsSection
        hubUrl="/my-day"
        onPickPlatform={noop}
        onVotePlatform={noop}
        onOpenHub={noop}
      />
    </MarketingStage>
  ),
}

export const Phone = {
  name: 'Phone · 390px',
  render: () => (
    <MarketingStage idiom="mobile" width={390}>
      <PlatformsSection
        hubUrl="/my-day"
        onPickPlatform={noop}
        onVotePlatform={noop}
        onOpenHub={noop}
      />
    </MarketingStage>
  ),
}
