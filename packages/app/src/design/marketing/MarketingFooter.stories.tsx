import { MarketingFooter, type MarketingFooterProps } from './MarketingFooter'
import { MarketingStage } from './marketingStage'

export default {
  title: 'Marketing/MarketingFooter',
  component: MarketingFooter,
  parameters: { layout: 'fullscreen' },
}

const PROPS: MarketingFooterProps = {
  brand: { label: 'Kro', tagline: 'Plan the day. Keep the calm.' },
  columns: [
    {
      title: 'Product',
      links: [
        { label: 'Features', href: '#features' },
        { label: 'Platforms', href: '#platforms' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'Privacy', href: '/privacy' },
        { label: 'zheref.io', href: 'https://zheref.io', external: true },
      ],
    },
  ],
  legal: '© 2026 Kro. All rights reserved.',
}

export const Desktop = {
  name: 'Desktop · brand left, columns right',
  render: () => (
    <MarketingStage>
      <MarketingFooter {...PROPS} />
    </MarketingStage>
  ),
}

export const Dark = {
  name: 'Dark · external link opens in a new tab',
  render: () => (
    <MarketingStage theme="dark">
      <MarketingFooter {...PROPS} />
    </MarketingStage>
  ),
}

export const Mobile = {
  name: 'Phone width · single column',
  render: () => (
    <MarketingStage idiom="mobile" width={390}>
      <MarketingFooter {...PROPS} />
    </MarketingStage>
  ),
}
