import { PhoneFrame } from './PhoneFrame'
import { MarketingStage, placeholderShot } from './marketingStage'

export default {
  title: 'Marketing/PhoneFrame',
  component: PhoneFrame,
  parameters: { layout: 'fullscreen' },
}

const SHOT = placeholderShot(390, 844)
const alt = 'My Day showing today’s tasks and a focus timer'

export const Light = {
  name: 'Light · bezel, island and shadow',
  render: () => (
    <MarketingStage>
      <div style={{ padding: 32 }}>
        <PhoneFrame src={SHOT} alt={alt} width={300} height={650} />
      </div>
    </MarketingStage>
  ),
}

export const Dark = {
  name: 'Dark · the bezel stays distinct from the page',
  render: () => (
    <MarketingStage theme="dark">
      <div style={{ padding: 32 }}>
        <PhoneFrame src={SHOT} alt={alt} width={300} height={650} />
      </div>
    </MarketingStage>
  ),
}

export const Priority = {
  name: 'Priority · hero image loads eagerly',
  render: () => (
    <MarketingStage>
      <div style={{ padding: 32 }}>
        <PhoneFrame src={SHOT} alt={alt} width={300} height={650} priority />
      </div>
    </MarketingStage>
  ),
}

export const NarrowViewport = {
  name: 'Phone width · shrinks to fit, keeps its ratio',
  render: () => (
    <MarketingStage idiom="mobile" width={320}>
      <div style={{ padding: 16 }}>
        <PhoneFrame src={SHOT} alt={alt} width={390} height={844} />
      </div>
    </MarketingStage>
  ),
}
