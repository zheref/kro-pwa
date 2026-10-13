import { SectionHeader } from './SectionHeader'
import { MarketingStage } from './marketingStage'

export default {
  title: 'Marketing/SectionHeader',
  component: SectionHeader,
  parameters: { layout: 'fullscreen' },
}

const COPY = {
  eyebrow: 'Habits',
  title: 'Small things, done daily',
  lede: 'Streaks that forgive a missed day and still reward showing up.',
}

export const Start = {
  name: 'Start-aligned · eyebrow, title, lede',
  render: () => (
    <MarketingStage>
      <div style={{ padding: 32 }}>
        <SectionHeader {...COPY} />
      </div>
    </MarketingStage>
  ),
}

export const Centered = {
  name: 'Centered · hero-style opening',
  render: () => (
    <MarketingStage>
      <div style={{ padding: 32 }}>
        <SectionHeader {...COPY} align="center" />
      </div>
    </MarketingStage>
  ),
}

export const SubsectionDark = {
  name: 'Level 3, no lede · a sub-section in dark',
  render: () => (
    <MarketingStage theme="dark">
      <div style={{ padding: 32 }}>
        <SectionHeader title="Works offline" level={3} />
      </div>
    </MarketingStage>
  ),
}

export const Mobile = {
  name: 'Phone width · the title wraps, never overflows',
  render: () => (
    <MarketingStage idiom="mobile" width={390}>
      <div style={{ padding: 20 }}>
        <SectionHeader
          {...COPY}
          title="A very long headline that has to wrap on a phone"
        />
      </div>
    </MarketingStage>
  ),
}
