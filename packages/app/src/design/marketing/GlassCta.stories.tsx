import { GlassCta } from './GlassCta'
import { MarketingStage } from './marketingStage'

export default {
  title: 'Marketing/GlassCta',
  component: GlassCta,
  parameters: { layout: 'fullscreen' },
}

const PROPS = {
  eyebrow: 'Get started',
  title: 'Make tomorrow calmer',
  lede: 'Free on iPhone, iPad and Mac. The web app works everywhere else.',
  primary: { label: 'Get Kro', href: '#get' },
  secondary: { label: 'Open the web app', href: '/my-day' },
}

export const Light = {
  name: 'Light · two actions',
  render: () => (
    <MarketingStage>
      <GlassCta {...PROPS} />
    </MarketingStage>
  ),
}

export const Dark = {
  name: 'Dark',
  render: () => (
    <MarketingStage theme="dark">
      <GlassCta {...PROPS} />
    </MarketingStage>
  ),
}

export const PrimaryOnly = {
  name: 'One action · with a footnote',
  render: () => (
    <MarketingStage>
      <GlassCta title="Join the TestFlight" primary={PROPS.primary}>
        <small>iOS 18 or later.</small>
      </GlassCta>
    </MarketingStage>
  ),
}

export const Mobile = {
  name: 'Phone width',
  render: () => (
    <MarketingStage idiom="mobile" width={390}>
      <GlassCta {...PROPS} />
    </MarketingStage>
  ),
}
