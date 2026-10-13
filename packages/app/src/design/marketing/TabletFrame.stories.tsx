import { TabletFrame } from './TabletFrame'
import { MarketingStage, placeholderShot } from './marketingStage'

export default {
  title: 'Marketing/TabletFrame',
  component: TabletFrame,
  parameters: { layout: 'fullscreen' },
}

// A 480 x 900 pt render recorded at @2x: not the iPad's own ratio, so the
// frame crops it to the screen from the top.
const SHOT = placeholderShot(960, 1800)
const alt = 'Kro on iPad with the sidebar listing the whole workflow'

export const Light = {
  name: 'Light · 820 x 1180 pt screen, camera dot',
  render: () => (
    <MarketingStage>
      <div style={{ padding: 32, maxWidth: 520 }}>
        <TabletFrame
          src={SHOT}
          alt={alt}
          width={960}
          height={1800}
          scale={0.6}
        />
      </div>
    </MarketingStage>
  ),
}

export const Dark = {
  name: 'Dark',
  render: () => (
    <MarketingStage theme="dark">
      <div style={{ padding: 32, maxWidth: 520 }}>
        <TabletFrame
          src={SHOT}
          alt={alt}
          width={960}
          height={1800}
          scale={0.6}
        />
      </div>
    </MarketingStage>
  ),
}

export const Priority = {
  name: 'Priority · eager',
  render: () => (
    <MarketingStage>
      <div style={{ padding: 32, maxWidth: 520 }}>
        <TabletFrame
          src={SHOT}
          alt={alt}
          width={960}
          height={1800}
          scale={0.6}
          priority
        />
      </div>
    </MarketingStage>
  ),
}

export const NarrowViewport = {
  name: 'Phone width · shrinks into the column',
  render: () => (
    <MarketingStage idiom="mobile" width={320}>
      <div style={{ padding: 16 }}>
        <TabletFrame src={SHOT} alt={alt} width={960} height={1800} />
      </div>
    </MarketingStage>
  ),
}
