import { MarketingSection } from './MarketingSection'
import { SectionHeader } from './SectionHeader'
import { MarketingStage } from './marketingStage'

export default {
  title: 'Marketing/MarketingSection',
  component: MarketingSection,
  parameters: { layout: 'fullscreen' },
}

const Body = ({ id }: { readonly id: string }) => (
  <SectionHeader
    eyebrow="Plan"
    title="Your whole day, one calm surface"
    lede="Tasks, events and habits share one timeline."
    headingId={`${id}-title`}
  />
)

export const Canvas = {
  name: 'Canvas · the page surface, default measure',
  render: () => (
    <MarketingStage>
      <MarketingSection id="canvas" labelledBy="canvas-title">
        <Body id="canvas" />
      </MarketingSection>
    </MarketingStage>
  ),
}

export const SubtleNarrowDark = {
  name: 'Subtle, narrow · one step recessed, in dark',
  render: () => (
    <MarketingStage theme="dark">
      <MarketingSection
        id="subtle"
        tone="subtle"
        width="narrow"
        labelledBy="subtle-title"
      >
        <Body id="subtle" />
      </MarketingSection>
    </MarketingStage>
  ),
}

export const GradientWide = {
  name: 'Gradient, wide · white ink on the indigo field',
  render: () => (
    <MarketingStage>
      <MarketingSection
        id="gradient"
        tone="gradient"
        width="wide"
        labelledBy="gradient-title"
      >
        <Body id="gradient" />
      </MarketingSection>
    </MarketingStage>
  ),
}

export const GlassMobile = {
  name: 'Glass panel · phone width',
  render: () => (
    <MarketingStage idiom="mobile" width={390}>
      <MarketingSection id="glass" tone="glass" as="div">
        <Body id="glass" />
      </MarketingSection>
    </MarketingStage>
  ),
}
