import { WatchFrame } from './WatchFrame'
import { MarketingStage, placeholderShot } from './marketingStage'

export default {
  title: 'Marketing/WatchFrame',
  component: WatchFrame,
  parameters: { layout: 'fullscreen' },
}

const SHOT = placeholderShot(396, 484)
const alt = 'Apple Watch showing the running focus session'

export const Light = {
  name: 'Light · case and crown',
  render: () => (
    <MarketingStage>
      <div style={{ padding: 32 }}>
        <WatchFrame src={SHOT} alt={alt} width={396} height={484} scale={1.4} />
      </div>
    </MarketingStage>
  ),
}

export const Dark = {
  name: 'Dark',
  render: () => (
    <MarketingStage theme="dark">
      <div style={{ padding: 32 }}>
        <WatchFrame src={SHOT} alt={alt} width={396} height={484} scale={1.4} />
      </div>
    </MarketingStage>
  ),
}

export const Priority = {
  name: 'Priority · eager',
  render: () => (
    <MarketingStage>
      <div style={{ padding: 32 }}>
        <WatchFrame
          src={SHOT}
          alt={alt}
          width={396}
          height={484}
          scale={1.4}
          priority
        />
      </div>
    </MarketingStage>
  ),
}
