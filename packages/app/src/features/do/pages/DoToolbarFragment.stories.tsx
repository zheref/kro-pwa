import type { ReactNode } from 'react'
import { EndeavorKind } from '@kro/core'
import { GradientBackdrop } from '../../../design/system/gradient/GradientBackdrop'
import { initialDoVisibility } from '../DoRules'
import { DoToolbarFragment, type DoToolbarFragmentProps } from './DoToolbarFragment'
import {
  DO_SURFACE_MOCK_LOCALE,
  DO_SURFACE_MOCK_NOW,
  desktopDoLayout,
  desktopShellShape,
  doSurfaceMocks,
  doSurfaceProps,
  handheldDoLayout,
  handheldShellShape,
} from './doSurfaceMocks'

/**
 * Canon's two toolbar tables.
 *
 * Rendered with no shell around them, so the controls fall back to in-content
 * chrome — the path `useToolbarOutletPresent` documents for exactly this. In
 * the app they portal into the shell's `navigation` / `primary` (sidebar) or
 * `leading` / `trailing` (tab bar) outlets.
 */
export default {
  title: 'Do/Toolbar',
  component: DoToolbarFragment,
  parameters: { layout: 'fullscreen' },
}

const day = doSurfaceProps(doSurfaceMocks.typicalDay)
const noop = () => {}

function Stage({
  theme = 'light',
  width = 720,
  children,
}: {
  theme?: 'light' | 'dark'
  width?: number
  children: ReactNode
}) {
  return (
    <div
      data-theme={theme}
      style={{
        position: 'relative',
        width,
        minHeight: 520,
        padding: 12,
        background: 'var(--kro-color-back)',
      }}
    >
      <GradientBackdrop height="140px" hardEdge />
      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        {children}
      </div>
    </div>
  )
}

const toolbar = (overrides: Partial<DoToolbarFragmentProps> = {}) => (
  <DoToolbarFragment
    shape={desktopShellShape}
    layout={desktopDoLayout}
    isInMarkCompleteMode={false}
    isLoading={false}
    overdue={day.lanes.overdue}
    expired={day.lanes.expired}
    visibility={initialDoVisibility}
    now={DO_SURFACE_MOCK_NOW}
    locale={DO_SURFACE_MOCK_LOCALE}
    onToggleMarkCompleteMode={noop}
    onTapNotifications={noop}
    onRefresh={noop}
    onChangeVisibility={noop}
    {...overrides}
  />
)

/** Desktop: bell in the navigation group, refresh + visibility in primary. */
export const Desktop = {
  render: () => <Stage>{toolbar()}</Stage>,
}

/** Compact: the same controls, sized for a fingertip. */
export const Handheld = {
  render: () => (
    <Stage width={390}>
      {toolbar({ shape: handheldShellShape, layout: handheldDoLayout })}
    </Stage>
  ),
}

/** Refreshing: the same footprint, an indicator instead of the glyph. */
export const Refreshing = {
  render: () => <Stage>{toolbar({ isLoading: true })}</Stage>,
}

/** Bulk mode: a single Done control, and no bell. */
export const MarkCompleteMode = {
  render: () => <Stage>{toolbar({ isInMarkCompleteMode: true })}</Stage>,
}

/** A filtered day: the eye is struck through. */
export const Filtered = {
  render: () => (
    <Stage>
      {toolbar({
        visibility: {
          ...initialDoVisibility,
          hiddenKinds: [EndeavorKind.reminder],
        },
      })}
    </Stage>
  ),
}

/** Nothing needs attention: the bell loses its badge. */
export const NothingToAttendTo = {
  render: () => <Stage>{toolbar({ overdue: [], expired: [] })}</Stage>,
}

/** Both schemes at the desktop width. */
export const BothSchemes = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      <Stage theme="light" width={420}>
        {toolbar()}
      </Stage>
      <Stage theme="dark" width={420}>
        {toolbar()}
      </Stage>
    </div>
  ),
}
