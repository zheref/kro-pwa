import { PhoneFrame } from './PhoneFrame'
import { MarketingStage, placeholderShot } from './marketingStage'

export default {
  title: 'Marketing/PhoneFrame',
  component: PhoneFrame,
  parameters: { layout: 'fullscreen' },
}

// A 390 x 844 pt screen recorded at @2x, as the iOS goldens are.
const IOS_SHOT = placeholderShot(780, 1688)
// The Android goldens: 461 x 1000 px for a 412 pt screen.
const ANDROID_SHOT = placeholderShot(461, 1000)
const alt = 'My Day showing today’s tasks and a focus timer'

export const IphoneLight = {
  name: 'iPhone · light · 11 pt bezel, island and side keys',
  render: () => (
    <MarketingStage>
      <div style={{ padding: 32 }}>
        <PhoneFrame src={IOS_SHOT} alt={alt} width={780} height={1688} />
      </div>
    </MarketingStage>
  ),
}

export const IphoneDark = {
  name: 'iPhone · dark · the bezel stays distinct from the page',
  render: () => (
    <MarketingStage theme="dark">
      <div style={{ padding: 32 }}>
        <PhoneFrame src={IOS_SHOT} alt={alt} width={780} height={1688} />
      </div>
    </MarketingStage>
  ),
}

export const Android = {
  name: 'Android · thin bezel and a punch-hole',
  render: () => (
    <MarketingStage>
      <div style={{ padding: 32 }}>
        <PhoneFrame
          src={ANDROID_SHOT}
          alt={alt}
          width={461}
          height={1000}
          platform="android"
        />
      </div>
    </MarketingStage>
  ),
}

export const HalfSize = {
  name: 'Scale 0.5 · the bezel shrinks with the screen',
  render: () => (
    <MarketingStage>
      <div
        style={{ padding: 32, display: 'flex', gap: 24, alignItems: 'start' }}
      >
        <PhoneFrame
          src={IOS_SHOT}
          alt={alt}
          width={780}
          height={1688}
          scale={0.5}
        />
        <PhoneFrame
          src={ANDROID_SHOT}
          alt={alt}
          width={461}
          height={1000}
          platform="android"
          scale={0.5}
        />
      </div>
    </MarketingStage>
  ),
}

export const Priority = {
  name: 'Priority · hero image loads eagerly',
  render: () => (
    <MarketingStage>
      <div style={{ padding: 32 }}>
        <PhoneFrame
          src={IOS_SHOT}
          alt={alt}
          width={780}
          height={1688}
          priority
        />
      </div>
    </MarketingStage>
  ),
}

export const NarrowViewport = {
  name: 'Phone width · shrinks to fit, keeps its ratio',
  render: () => (
    <MarketingStage idiom="mobile" width={320}>
      <div style={{ padding: 16 }}>
        <PhoneFrame src={IOS_SHOT} alt={alt} width={780} height={1688} />
      </div>
    </MarketingStage>
  ),
}
