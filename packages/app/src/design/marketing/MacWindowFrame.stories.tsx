import { MacWindowFrame } from './MacWindowFrame'
import { MarketingStage, placeholderShot } from './marketingStage'

export default {
  title: 'Marketing/MacWindowFrame',
  component: MacWindowFrame,
  parameters: { layout: 'fullscreen' },
}

const SHOT = placeholderShot(1200, 760)
const alt = 'Kro on the Mac with the sidebar and the day timeline'

export const Light = {
  name: 'Light · glass title bar with a title',
  render: () => (
    <MarketingStage>
      <div style={{ padding: 32 }}>
        <MacWindowFrame
          src={SHOT}
          alt={alt}
          width={900}
          height={570}
          title="Kro"
        />
      </div>
    </MarketingStage>
  ),
}

export const Dark = {
  name: 'Dark',
  render: () => (
    <MarketingStage theme="dark">
      <div style={{ padding: 32 }}>
        <MacWindowFrame
          src={SHOT}
          alt={alt}
          width={900}
          height={570}
          title="Kro"
        />
      </div>
    </MarketingStage>
  ),
}

export const Untitled = {
  name: 'No title · lights only',
  render: () => (
    <MarketingStage>
      <div style={{ padding: 32 }}>
        <MacWindowFrame src={SHOT} alt={alt} width={900} height={570} />
      </div>
    </MarketingStage>
  ),
}

export const NarrowViewport = {
  name: 'Phone width · scales down',
  render: () => (
    <MarketingStage idiom="mobile" width={360}>
      <div style={{ padding: 16 }}>
        <MacWindowFrame
          src={SHOT}
          alt={alt}
          width={900}
          height={570}
          title="Kro"
        />
      </div>
    </MarketingStage>
  ),
}
