import { useState } from 'react'
import { ThemeToggle, type ThemeValue } from './ThemeToggle'
import { MarketingStage } from './marketingStage'

export default {
  title: 'Marketing/ThemeToggle',
  component: ThemeToggle,
  parameters: { layout: 'fullscreen' },
}

function Interactive({ initial }: { readonly initial: ThemeValue }) {
  const [value, setValue] = useState<ThemeValue>(initial)
  return <ThemeToggle value={value} onToggle={setValue} />
}

export const LightValue = {
  name: 'Light value · sun showing',
  render: () => (
    <MarketingStage>
      <div style={{ padding: 24 }}>
        <ThemeToggle value="light" onToggle={() => undefined} />
      </div>
    </MarketingStage>
  ),
}

export const DarkValue = {
  name: 'Dark value · moon showing, pressed',
  render: () => (
    <MarketingStage theme="dark">
      <div style={{ padding: 24 }}>
        <ThemeToggle value="dark" onToggle={() => undefined} />
      </div>
    </MarketingStage>
  ),
}

export const Controlled = {
  name: 'Controlled · click to flip, the owner decides',
  render: () => (
    <MarketingStage idiom="mobile" width={390}>
      <div style={{ padding: 24 }}>
        <Interactive initial="light" />
      </div>
    </MarketingStage>
  ),
}
