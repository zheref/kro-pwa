import { CalendarDays, Flame, Timer } from 'lucide-react'
import { FeatureCard } from './FeatureCard'
import { MarketingStage } from './marketingStage'

export default {
  title: 'Marketing/FeatureCard',
  component: FeatureCard,
  parameters: { layout: 'fullscreen' },
}

const GRID = {
  display: 'grid',
  gap: 16,
  padding: 24,
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
} as const

export const Trio = {
  name: 'Three cards · each with its own accent',
  render: () => (
    <MarketingStage>
      <div style={GRID}>
        <FeatureCard
          icon={CalendarDays}
          title="One timeline"
          body="Tasks, events and habits in a single day."
        />
        <FeatureCard
          icon={Timer}
          accentRole="focusGreen"
          title="Focus sessions"
          body="A timer that knows when to rest."
        />
        <FeatureCard
          icon={Flame}
          accentRole="kroRed"
          title="Streaks"
          body="Forgiving, never punishing."
        />
      </div>
    </MarketingStage>
  ),
}

export const Dark = {
  name: 'Dark',
  render: () => (
    <MarketingStage theme="dark">
      <div style={GRID}>
        <FeatureCard
          icon={CalendarDays}
          title="One timeline"
          body="Tasks, events and habits in a single day."
        />
        <FeatureCard
          icon={Timer}
          accentRole="focusGreen"
          title="Focus sessions"
          body="A timer that knows when to rest."
        />
      </div>
    </MarketingStage>
  ),
}

export const Linked = {
  name: 'Linked · the whole card is the target',
  render: () => (
    <MarketingStage>
      <div style={GRID}>
        <FeatureCard
          icon={Timer}
          title="Focus sessions"
          body="A timer that knows when to rest."
          href="#focus"
        />
      </div>
    </MarketingStage>
  ),
}

export const Mobile = {
  name: 'Phone width · stacks',
  render: () => (
    <MarketingStage idiom="mobile" width={390}>
      <div style={{ ...GRID, padding: 16 }}>
        <FeatureCard
          icon={Flame}
          accentRole="kroRed"
          title="Streaks"
          body="Forgiving, never punishing."
        />
      </div>
    </MarketingStage>
  ),
}
