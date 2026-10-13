import { StatRow } from './StatRow'
import { MarketingStage } from './marketingStage'

export default {
  title: 'Marketing/StatRow',
  component: StatRow,
  parameters: { layout: 'fullscreen' },
}

const ITEMS = [
  { value: '4.9', label: 'Average rating' },
  { value: '12k', label: 'Days planned' },
  { value: '100%', label: 'On-device first' },
]

export const Light = {
  name: 'Light · gradient figures',
  render: () => (
    <MarketingStage>
      <div style={{ padding: 32 }}>
        <StatRow items={ITEMS} />
      </div>
    </MarketingStage>
  ),
}

export const Dark = {
  name: 'Dark',
  render: () => (
    <MarketingStage theme="dark">
      <div style={{ padding: 32 }}>
        <StatRow items={ITEMS} />
      </div>
    </MarketingStage>
  ),
}

export const Mobile = {
  name: 'Phone width · two items',
  render: () => (
    <MarketingStage idiom="mobile" width={390}>
      <div style={{ padding: 20 }}>
        <StatRow items={ITEMS.slice(0, 2)} />
      </div>
    </MarketingStage>
  ),
}
