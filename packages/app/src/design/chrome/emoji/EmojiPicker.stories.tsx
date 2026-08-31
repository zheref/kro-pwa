import { useState } from 'react'
import { BothSchemes, Stage } from '../Stage'
import { DEFAULT_EMOJI_CATEGORIES } from './emojiCategories'
import { EmojiPicker } from './EmojiPicker'
import { EmojiPickerPopover } from './EmojiPickerPopover'

/**
 * EmojiPicker — canon's categorised grid.
 *
 * WHAT TO LOOK FOR. Seven columns; section headings PINNED, so a heading stays
 * put while its grid scrolls under it; the selected glyph carries an accent
 * wash at 22%; every cell is a full 44px target with a visible focus ring when
 * tabbed to.
 *
 * WHAT IS DELIBERATELY ABSENT. No search field and no recents row — canon has
 * neither, and the pinned headings are its navigation. Adding either here would
 * give the web a behaviour the iOS app does not have, which is the opposite of
 * parity.
 *
 * THE FIRST THREE STORIES USE BOUNDED PALETTES on purpose: the default palette
 * is 420 cells, and a snapshot of 420 cells is a file nobody reads. The full
 * palette is the popover story, which is where it belongs anyway.
 */
export default {
  title: 'Design system/Chrome/EmojiPicker',
  component: EmojiPicker,
  parameters: { layout: 'fullscreen' },
}

const FOOD = DEFAULT_EMOJI_CATEGORIES[3]
const ACTIVITIES = DEFAULT_EMOJI_CATEGORIES[1]

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="kro-glass"
      style={{
        position: 'absolute',
        top: 24,
        left: 24,
        width: 360,
        height: 320,
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  )
}

export const SingleCategory = {
  name: 'One category — the grid, both schemes',
  render: () => (
    <BothSchemes height={380}>
      {() => (
        <Panel>
          <EmojiPicker categories={FOOD ? [FOOD] : []} />
        </Panel>
      )}
    </BothSchemes>
  ),
}

export const PinnedHeadings = {
  name: 'Two categories — scroll to see the headings pin',
  render: () => (
    <Stage height={380} label="Scroll the panel">
      <Panel>
        <EmojiPicker
          categories={[ACTIVITIES, FOOD].filter(Boolean) as typeof DEFAULT_EMOJI_CATEGORIES}
        />
      </Panel>
    </Stage>
  ),
}

export const Selected = {
  name: 'A selection — the accent wash marks where you are',
  render: () => (
    <BothSchemes height={380}>
      {() => (
        <Panel>
          <EmojiPicker categories={FOOD ? [FOOD] : []} selection="🍕" />
        </Panel>
      )}
    </BothSchemes>
  ),
}

export const InPopover = {
  name: 'In a popover — the full seven-category palette',
  render: () => <PopoverDemo />,
}

/**
 * The full palette, in the container `#15` actually asks for. Interactive
 * because a popover that cannot be opened proves nothing about the popover.
 */
function PopoverDemo() {
  const [symbol, setSymbol] = useState('📊')

  return (
    <Stage height={480} label="Click the symbol">
      <div style={{ position: 'absolute', top: 120, left: 40 }}>
        <EmojiPickerPopover selection={symbol} onPick={setSymbol}>
          <button
            type="button"
            aria-label="Choose a symbol"
            className="kro-glass kro-glass--control kro-glass--interactive"
            style={{
              width: 62,
              height: 62,
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              fontSize: 28,
            }}
          >
            {symbol}
          </button>
        </EmojiPickerPopover>
      </div>
    </Stage>
  )
}
