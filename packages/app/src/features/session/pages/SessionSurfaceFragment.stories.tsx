import type { ReactNode } from 'react'
import { SessionSheetFragment } from './SessionSheetFragment'
import { SessionSurfaceFragment } from './SessionSurfaceFragment'
import { sessionSheetMocks } from './SessionSurfaceMocks'
import { SessionSurfacePresentation } from './sessionSheetModel'

/**
 * The three hosts the session surface takes, with the same content inside each.
 *
 * That is the point of the split: the content is one Fragment, and *where* it
 * appears is another. Canon draws the same line — `SessionSetupView` takes a
 * `presentation` and changes only its background chrome, *"session content and
 * behavior remain shared across the mobile sheet and desktop detail"*.
 *
 * The two portalled hosts are excluded from the Vitest story snapshots: a
 * Radix portal renders into `document.body`, so a snapshot of the story's own
 * container would be empty and would prove nothing. They are asserted through
 * `screen` in `__tests__/SessionSurfaceFragment.test.tsx` instead, which is
 * where a portal's contents are actually reachable.
 */
export default {
  title: 'Session/Session surface',
  component: SessionSurfaceFragment,
  parameters: { layout: 'fullscreen' },
}

function Stage({
  label,
  children,
}: {
  readonly label: string
  readonly children: ReactNode
}) {
  return (
    <div
      style={{
        minHeight: 320,
        padding: 24,
        background: 'linear-gradient(150deg, #1d1730 0%, #2b2148 100%)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <p
        style={{
          margin: '0 0 12px',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: 'rgb(255 255 255 / 0.6)',
        }}
      >
        {label}
      </p>
      {children}
    </div>
  )
}

const noop = () => {}

export const InlineReady = {
  name: 'Inline — the /execute column, ready',
  render: () => (
    <Stage label="inline · min 360 / max 640 · ready">
      <SessionSurfaceFragment
        presentation={SessionSurfacePresentation.inline}
        isOpen
        onRequestClose={noop}
        phase={sessionSheetMocks.ready.phase}
      >
        <SessionSheetFragment
          {...sessionSheetMocks.ready}
          presentation={SessionSurfacePresentation.inline}
          onTapClose={undefined}
        />
      </SessionSurfaceFragment>
    </Stage>
  ),
}

export const InlineRunning = {
  name: 'Inline — running, green wash',
  render: () => (
    <Stage label="inline · the phase tint fades downward">
      <SessionSurfaceFragment
        presentation={SessionSurfacePresentation.inline}
        isOpen
        onRequestClose={noop}
        phase={sessionSheetMocks.running.phase}
      >
        <SessionSheetFragment
          {...sessionSheetMocks.running}
          presentation={SessionSurfacePresentation.inline}
          onTapClose={undefined}
        />
      </SessionSurfaceFragment>
    </Stage>
  ),
}

export const InlineBreak = {
  name: 'Inline — break, beige wash',
  render: () => (
    <Stage label="inline · break">
      <SessionSurfaceFragment
        presentation={SessionSurfacePresentation.inline}
        isOpen
        onRequestClose={noop}
        phase={sessionSheetMocks.onBreak.phase}
      >
        <SessionSheetFragment
          {...sessionSheetMocks.breakInline}
          onTapClose={undefined}
        />
      </SessionSurfaceFragment>
    </Stage>
  ),
}

/** Portalled — see the file header for why it is not snapshotted. */
export const BottomSheet = {
  name: 'Bottom sheet (portalled — not snapshotted)',
  render: () => (
    <Stage label="sheet · the handheld host">
      <SessionSurfaceFragment
        presentation={SessionSurfacePresentation.sheet}
        isOpen
        onRequestClose={noop}
        phase={sessionSheetMocks.running.phase}
      >
        <SessionSheetFragment {...sessionSheetMocks.running} />
      </SessionSurfaceFragment>
    </Stage>
  ),
}

/** Portalled — see the file header for why it is not snapshotted. */
export const DesktopModal = {
  name: 'Desktop modal (portalled — not snapshotted)',
  render: () => (
    <Stage label="modal · min 360 / max 640">
      <SessionSurfaceFragment
        presentation={SessionSurfacePresentation.modal}
        isOpen
        onRequestClose={noop}
        phase={sessionSheetMocks.concluded.phase}
      >
        <SessionSheetFragment
          {...sessionSheetMocks.concludedWithBreak}
          presentation={SessionSurfacePresentation.modal}
        />
      </SessionSurfaceFragment>
    </Stage>
  ),
}
