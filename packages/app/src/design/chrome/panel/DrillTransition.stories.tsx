import { useEffect, useState } from 'react'
import { StoryGallery } from '../../storybook/storyGallery'
import { Stage } from '../Stage'
import { TrailingDetailPanel } from './TrailingDetailPanel'

/**
 * DrillTransition — drill-in navigation inside the trailing detail pane.
 *
 * WHAT TO LOOK FOR:
 *
 *  1. Rest: the top reading, Close leading, no slide on first appearance.
 *  2. Push: one level deeper — Back leading, the body slides in from the
 *     trailing edge (`data-kro-drill="push"`).
 *  3. Pop: back out to the top — Close leading again, the body slides in from
 *     the leading edge (`data-kro-drill="pop"`).
 *
 * Each scene mounts at its starting depth and moves once on mount, so the
 * slide replays on every load of the page. Under Reduce Motion the swap is
 * instant.
 */
export default {
  title: 'Chrome/DrillTransition',
  parameters: { layout: 'fullscreen' },
}

const noop = () => {}

interface Reading {
  readonly key: string
  readonly depth: number
  readonly title: string
  readonly rows: readonly string[]
}

const TOP: Reading = {
  key: 'details',
  depth: 0,
  title: 'Details',
  rows: ['Kind', 'Duration', 'Endeavor Activity'],
}

const PUSHED: Reading = {
  key: 'activity',
  depth: 1,
  title: 'Endeavor Activity',
  rows: ['Today', 'This week', 'This month'],
}

/** Shows `from`, then moves to `to` once mounted; `to === from` stays put. */
export function DrillScene({
  from,
  to,
}: {
  readonly from: Reading
  readonly to: Reading
}) {
  const [reading, setReading] = useState(from)
  useEffect(() => {
    setReading(to)
  }, [to])
  return (
    <Stage height={480}>
      <TrailingDetailPanel
        isPresented
        title={reading.title}
        onDismiss={noop}
        onBack={reading.depth > 0 ? noop : null}
        navigationDepth={reading.depth}
        navigationKey={reading.key}
      >
        <div style={{ padding: 16, display: 'grid', gap: 12 }}>
          {reading.rows.map((row) => (
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
      </TrailingDetailPanel>
    </Stage>
  )
}

/** The three scenes, exported for the mirroring render tests (`RC-11`). */
export const DRILL_SCENES = {
  rest: { from: TOP, to: TOP },
  push: { from: TOP, to: PUSHED },
  pop: { from: PUSHED, to: TOP },
} as const

/** Rest, push and pop on one page — the kit's one-Gallery convention. */
export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      <DrillScene {...DRILL_SCENES.rest} />
      <DrillScene {...DRILL_SCENES.push} />
      <DrillScene {...DRILL_SCENES.pop} />
    </StoryGallery>
  ),
}
