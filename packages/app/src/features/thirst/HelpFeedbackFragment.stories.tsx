import { Stage } from '../../design/endeavor/storyStage'
import { HelpFeedbackFragment } from './HelpFeedbackFragment'

/** Canon `HelpFeedbackView.swift`'s previews, ported: light, dark, and the
 * full six-row set together (canon has no separate "long content" preview —
 * the row count itself is the whole surface). */
export default {
  title: 'Thirst/Help & feedback',
  component: HelpFeedbackFragment,
  parameters: { layout: 'fullscreen' },
}

export const Light = {
  render: () => (
    <div style={{ width: 360 }}>
      <Stage theme="light">
        <HelpFeedbackFragment />
      </Stage>
    </div>
  ),
}

export const Dark = {
  render: () => (
    <div style={{ width: 360 }}>
      <Stage theme="dark">
        <HelpFeedbackFragment />
      </Stage>
    </div>
  ),
}

export const BothSchemes = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      <Stage theme="light">
        <HelpFeedbackFragment />
      </Stage>
      <Stage theme="dark">
        <HelpFeedbackFragment />
      </Stage>
    </div>
  ),
}
