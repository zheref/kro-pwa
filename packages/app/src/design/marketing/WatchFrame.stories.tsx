import { WatchFrame } from './WatchFrame'
import { MarketingStage, placeholderShot } from './marketingStage'

export default {
  title: 'Marketing/WatchFrame',
  component: WatchFrame,
  parameters: { layout: 'fullscreen' },
}

const SHOT = placeholderShot(184, 224)
const alt = 'Apple Watch showing the running focus session'

export const Light = {
  name: 'Light · case and crown',
  render: () => (
    <MarketingStage>
      <div style={{ padding: 32 }}>
        <WatchFrame src={SHOT} alt={alt} width={184} height={224} />
      </div>
    </MarketingStage>
  ),
}

export const Dark = {
  name: 'Dark',
  render: () => (
    <MarketingStage theme="dark">
      <div style={{ padding: 32 }}>
        <WatchFrame src={SHOT} alt={alt} width={184} height={224} />
      </div>
    </MarketingStage>
  ),
}

export const Priority = {
  name: 'Priority · eager',
  render: () => (
    <MarketingStage>
      <div style={{ padding: 32 }}>
        <WatchFrame src={SHOT} alt={alt} width={184} height={224} priority />
      </div>
    </MarketingStage>
  ),
}
