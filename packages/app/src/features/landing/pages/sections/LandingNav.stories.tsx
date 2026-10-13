import { MarketingStage } from '../../../../design/marketing/marketingStage'
import { LandingNav } from './LandingNav'

/**
 * `LandingNav` stories — the three states the render tests mirror
 * (`LandingNav.test.tsx`): light desktop, dark desktop, and a 390px phone.
 * Every image is a mock-fixture render from the landing catalog.
 */
export default {
  title: 'Landing/LandingNav',
  component: LandingNav,
  parameters: { layout: 'fullscreen' },
}

const noop = (): void => undefined

export const Desktop = {
  name: 'Desktop · light',
  render: () => (
    <MarketingStage contained={160}>
      <LandingNav
        activeId="the-loop"
        theme="light"
        hubUrl="/my-day"
        onToggleTheme={noop}
        onOpenHub={noop}
        onNavigate={noop}
        onOpenMenu={noop}
      />
    </MarketingStage>
  ),
}

export const Dark = {
  name: 'Desktop · dark',
  render: () => (
    <MarketingStage theme="dark" contained={160}>
      <LandingNav
        activeId="the-loop"
        theme="dark"
        hubUrl="/my-day"
        onToggleTheme={noop}
        onOpenHub={noop}
        onNavigate={noop}
        onOpenMenu={noop}
      />
    </MarketingStage>
  ),
}

export const Phone = {
  name: 'Phone · 390px',
  render: () => (
    <MarketingStage idiom="mobile" width={390} contained={160}>
      <LandingNav
        activeId="the-loop"
        theme="light"
        hubUrl="/my-day"
        onToggleTheme={noop}
        onOpenHub={noop}
        onNavigate={noop}
        onOpenMenu={noop}
      />
    </MarketingStage>
  ),
}
