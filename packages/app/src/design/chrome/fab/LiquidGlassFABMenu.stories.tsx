import { GLOW_SHAPES } from '../glow/RotatingGlow'
import { BothSchemes, Stage } from '../Stage'
import { FAB_INSETS } from '../layout/chromeLayout'
import { type FABMenuEntry, LiquidGlassFABMenu } from './LiquidGlassFABMenu'

/**
 * LiquidGlassFABMenu — KroApple's quick-input menu.
 *
 * WHAT TO LOOK FOR. Closed, only the disc shows. Open, four labelled capsules
 * unfurl UPWARD, trailing-aligned, 12px apart, and the disc's glyph becomes a
 * close mark. The rows stagger bottom-first, so the column reads as pushed up
 * from behind the button. Choosing a row snaps the menu shut faster than it
 * opened — canon uses a tighter spring for the close (0.28/0.82) than for the
 * toggle (0.32/0.78).
 *
 * And on the glowing story: the halo stays round the DISC as the menu opens. A
 * glow applied to the menu instead would grow with it into a full-height halo,
 * which is exactly the mistake canon's own comment warns about.
 */
export default {
  title: 'Design system/Chrome/LiquidGlassFABMenu',
  component: LiquidGlassFABMenu,
  parameters: { layout: 'fullscreen' },
}

const CAPTURE_ITEMS: FABMenuEntry[] = [
  { id: 'event', label: 'Event', glyph: 'calendar', onSelect: () => {} },
  {
    id: 'task',
    label: 'Task',
    glyph: 'checkmark.circle.fill',
    onSelect: () => {},
  },
  { id: 'reminder', label: 'Reminder', glyph: 'bell', onSelect: () => {} },
  { id: 'habit', label: 'Habit', glyph: 'repeat', onSelect: () => {} },
]

function Anchored({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        right: FAB_INSETS.modern.trailing,
        bottom: FAB_INSETS.modern.bottom,
      }}
    >
      {children}
    </div>
  )
}

export const Collapsed = {
  name: 'Collapsed — only the disc',
  render: () => (
    <BothSchemes height={320}>
      {() => (
        <Anchored>
          <LiquidGlassFABMenu
            items={CAPTURE_ITEMS}
            mainGlyph="plus"
            mainAccessibilityLabel="Quick input"
            isExpanded={false}
          />
        </Anchored>
      )}
    </BothSchemes>
  ),
}

export const Expanded = {
  name: 'Expanded — four labelled actions',
  render: () => (
    <BothSchemes height={420}>
      {() => (
        <Anchored>
          <LiquidGlassFABMenu
            items={CAPTURE_ITEMS}
            mainGlyph="plus"
            mainAccessibilityLabel="Quick input"
            isExpanded
          />
        </Anchored>
      )}
    </BothSchemes>
  ),
}

export const Interactive = {
  name: 'Interactive — tap to open, choose to close',
  render: () => (
    <Stage height={420} label="Uncontrolled">
      <Anchored>
        <LiquidGlassFABMenu
          items={CAPTURE_ITEMS}
          mainGlyph="plus"
          mainAccessibilityLabel="Quick input"
        />
      </Anchored>
    </Stage>
  ),
}

export const ExpandedWithGlow = {
  name: 'Expanded, glowing — the halo stays on the disc',
  render: () => (
    <Stage theme="dark" height={420} label="Glow scoped to the button">
      <Anchored>
        <LiquidGlassFABMenu
          items={CAPTURE_ITEMS}
          mainGlyph="plus"
          mainAccessibilityLabel="Quick input"
          isExpanded
          glow={{ shape: GLOW_SHAPES.circle }}
        />
      </Anchored>
    </Stage>
  ),
}

export const SingleAction = {
  name: 'One action — the menu still unfurls',
  render: () => (
    <Stage height={320} label="Single entry">
      <Anchored>
        <LiquidGlassFABMenu
          items={[CAPTURE_ITEMS[0] as FABMenuEntry]}
          mainGlyph="plus"
          mainAccessibilityLabel="Quick input"
          isExpanded
        />
      </Anchored>
    </Stage>
  ),
}
