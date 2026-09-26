import { StoryGallery } from '../../storybook/storyGallery'
import { Stage } from '../Stage'
import { TrailingDetailPanel } from './TrailingDetailPanel'

/**
 * TrailingDetailPanel — canon's `TrailingDetailPanel` in its `.overlay` layout.
 *
 * WHAT TO LOOK FOR:
 *
 *  1. It FLOATS. The text behind it keeps its full width and reads through the
 *     glass; the panel takes no width from the page.
 *  2. The geometry: 96px from the top, 16px from the trailing and bottom edges,
 *     28px corners, and a width between 320 and 520 that tracks 36% of the
 *     window.
 *  3. The header: dismiss on the leading side, then the title, then the
 *     subtitle when the panel is reading one thing.
 *  4. Hidden, it is gone — off the trailing edge and transparent, and neither
 *     the mouse nor a screen reader can reach it.
 */
export default {
  title: 'Chrome/TrailingDetailPanel',
  component: TrailingDetailPanel,
  parameters: { layout: 'fullscreen' },
}

const noop = () => {}

function Body() {
  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      {['Kind', 'Duration', 'Tags', 'Performances'].map((row) => (
        <div
          key={row}
          style={{
            padding: 12,
            borderRadius: 14,
            background: 'rgb(255 255 255 / 0.4)',
          }}
        >
          {row}
        </div>
      ))}
    </div>
  )
}

/** Plan on an endeavor: "Details", subtitled with its name. */
const PresentedWithSubtitle = {
  render: () => (
    <Stage height={640}>
      <TrailingDetailPanel
        isPresented
        title="Details"
        subtitle="Write the quarterly review"
        onDismiss={noop}
      >
        <Body />
      </TrailingDetailPanel>
    </Stage>
  ),
}

/** An endeavor-free mode: the title alone. */
const PresentedWholeDay = {
  render: () => (
    <Stage height={640} theme="dark">
      <TrailingDetailPanel isPresented title="Day Progress" onDismiss={noop}>
        <Body />
      </TrailingDetailPanel>
    </Stage>
  ),
}

/** A long, non-ASCII subtitle — it truncates rather than wrapping the header. */
const PresentedLongSubtitle = {
  render: () => (
    <Stage height={640}>
      <TrailingDetailPanel
        isPresented
        title="Endeavor Activity"
        subtitle="四半期のレビューを書く — and every appendix the board asked for 🌸"
        onDismiss={noop}
      >
        <Body />
      </TrailingDetailPanel>
    </Stage>
  ),
}

/** Hidden: parked past the trailing edge, transparent, inert. */
const Hidden = {
  render: () => (
    <Stage height={640}>
      <TrailingDetailPanel isPresented={false} title="" onDismiss={noop}>
        <Body />
      </TrailingDetailPanel>
    </Stage>
  ),
}

/** The four scenes, one page — the kit's one-Gallery convention. */
export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {PresentedWithSubtitle.render()}
      {PresentedWholeDay.render()}
      {PresentedLongSubtitle.render()}
      {Hidden.render()}
    </StoryGallery>
  ),
}
