import { MarketingNav, type MarketingNavProps } from './MarketingNav'
import { ThemeToggle } from './ThemeToggle'
import { MarketingStage } from './marketingStage'

export default {
  title: 'Marketing/MarketingNav',
  component: MarketingNav,
  parameters: { layout: 'fullscreen' },
}

const PROPS: MarketingNavProps = {
  brand: { label: 'Kro', href: '#top' },
  links: [
    { label: 'Features', href: '#features', id: 'features' },
    { label: 'Platforms', href: '#platforms', id: 'platforms' },
    { label: 'Privacy', href: '#privacy', id: 'privacy' },
  ],
  cta: { label: 'Get Kro', href: '#get' },
}

export const Desktop = {
  name: 'Desktop · links, active underline, CTA pill',
  render: () => (
    <MarketingStage contained={160}>
      <MarketingNav {...PROPS} activeId="features" />
    </MarketingStage>
  ),
}

export const DesktopDark = {
  name: 'Desktop dark · with a theme toggle',
  render: () => (
    <MarketingStage theme="dark" contained={160}>
      <MarketingNav
        {...PROPS}
        activeId="platforms"
        trailing={<ThemeToggle value="dark" onToggle={() => undefined} />}
      />
    </MarketingStage>
  ),
}

export const MobileClosed = {
  name: 'Phone · brand and menu button',
  render: () => (
    <MarketingStage idiom="mobile" width={390} contained={160}>
      <MarketingNav {...PROPS} />
    </MarketingStage>
  ),
}

export const MobileMenuOpen = {
  name: 'Phone · menu sheet open, items staggered in',
  render: () => (
    <MarketingStage idiom="mobile" width={390} contained={420}>
      <MarketingNav {...PROPS} defaultMenuOpen />
    </MarketingStage>
  ),
}

export const DesktopLit = {
  name: 'Desktop · lit bar, the whole bottom edge glows',
  render: () => (
    <MarketingStage contained={160}>
      <MarketingNav {...PROPS} activeId="features" className="kro-glass--lit" />
    </MarketingStage>
  ),
}
