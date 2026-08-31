import type { ReactNode } from 'react'
import { DoNotificationsFragment } from './DoNotificationsFragment'
import {
  DO_SURFACE_MOCK_LOCALE,
  DO_SURFACE_MOCK_NOW,
  doSurfaceMocks,
  doSurfaceProps,
} from './doSurfaceMocks'

/**
 * The attention panel, at canon's 380 × 440 minimum.
 *
 * The three states the panel can be in, each built from the real Overdue and
 * Expired lanes of `doSurfaceMocks` (`RC-31`).
 */
export default {
  title: 'Do/Notifications',
  component: DoNotificationsFragment,
  parameters: { layout: 'centered' },
}

const day = doSurfaceProps(doSurfaceMocks.typicalDay)
const noop = () => {}

function Stage({
  theme = 'light',
  children,
}: {
  theme?: 'light' | 'dark'
  children: ReactNode
}) {
  return (
    <div
      data-theme={theme}
      style={{
        padding: 24,
        background: 'var(--kro-color-back)',
      }}
    >
      <div
        className="kro-glass"
        style={{
          borderRadius: 'var(--kro-radius-surface)',
          overflow: 'hidden',
          width: 'fit-content',
        }}
      >
        {children}
      </div>
    </div>
  )
}

/** Both sections populated — the ordinary case behind a badged bell. */
export const Mixed = {
  render: () => (
    <Stage>
      <DoNotificationsFragment
        overdue={day.lanes.overdue}
        expired={day.lanes.expired}
        now={DO_SURFACE_MOCK_NOW}
        locale={DO_SURFACE_MOCK_LOCALE}
        onDismiss={noop}
      />
    </Stage>
  ),
}

/** Overdue only: the Expired section is absent, not empty. */
export const OverdueOnly = {
  render: () => (
    <Stage>
      <DoNotificationsFragment
        overdue={day.lanes.overdue}
        expired={[]}
        now={DO_SURFACE_MOCK_NOW}
        locale={DO_SURFACE_MOCK_LOCALE}
        onDismiss={noop}
      />
    </Stage>
  ),
}

/** Caught up — what an open panel becomes when its last item completes. */
export const CaughtUp = {
  render: () => (
    <Stage>
      <DoNotificationsFragment
        overdue={[]}
        expired={[]}
        now={DO_SURFACE_MOCK_NOW}
        locale={DO_SURFACE_MOCK_LOCALE}
        onDismiss={noop}
      />
    </Stage>
  ),
}

/** Both schemes. */
export const BothSchemes = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      <Stage theme="light">
        <DoNotificationsFragment
          overdue={day.lanes.overdue}
          expired={day.lanes.expired}
          now={DO_SURFACE_MOCK_NOW}
          locale={DO_SURFACE_MOCK_LOCALE}
          onDismiss={noop}
        />
      </Stage>
      <Stage theme="dark">
        <DoNotificationsFragment
          overdue={day.lanes.overdue}
          expired={day.lanes.expired}
          now={DO_SURFACE_MOCK_NOW}
          locale={DO_SURFACE_MOCK_LOCALE}
          onDismiss={noop}
        />
      </Stage>
    </div>
  ),
}
