import type { ReactNode } from 'react'
import { GradientBackdrop } from '../../../design/system/gradient/GradientBackdrop'
import { DoSurfaceFragment } from './DoSurfaceFragment'
import { doSurfaceMocks, doSurfaceProps } from './doSurfaceMocks'

/**
 * The whole surface — header, lanes, FAB and the Active Toast host — at both
 * widths, in both schemes, in each of the states the slice can reach.
 *
 * Every story is `doSurfaceProps(state, surface)`: the real projection of the
 * Do slice's own state mocks (`RC-31`), so nothing here is a hand-drawn day.
 */
export default {
  title: 'Do/Surface',
  component: DoSurfaceFragment,
  parameters: { layout: 'fullscreen' },
}

function Stage({
  theme = 'light',
  width,
  height = 720,
  children,
}: {
  theme?: 'light' | 'dark'
  width: number
  height?: number
  children: ReactNode
}) {
  return (
    <div
      data-theme={theme}
      style={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        background: 'var(--kro-color-back)',
        border: '1px solid var(--kro-color-hairline)',
      }}
    >
      <GradientBackdrop height="220px" />
      <div style={{ position: 'relative', height: '100%' }}>{children}</div>
    </div>
  )
}

/** Desktop: the sidebar shell's content area, at 1120px of usable width. */
export const Desktop = {
  render: () => (
    <Stage width={1120}>
      <DoSurfaceFragment {...doSurfaceProps(doSurfaceMocks.ringsEnabled)} />
    </Stage>
  ),
}

/** Handheld: the tab-bar shell's content area, at a 390px viewport. */
export const Handheld = {
  render: () => (
    <Stage width={390} height={780}>
      <DoSurfaceFragment
        {...doSurfaceProps(doSurfaceMocks.ringsEnabled, 'handheld')}
      />
    </Stage>
  ),
}

/** Bulk mark-complete mode, where the header instructs and the rings hide. */
export const MarkCompleteMode = {
  render: () => (
    <Stage width={1120}>
      <DoSurfaceFragment
        {...doSurfaceProps(doSurfaceMocks.markCompleteMode)}
      />
    </Stage>
  ),
}

/** A refresh that failed over a day that is still good. */
export const FailedRefresh = {
  render: () => (
    <Stage width={1120}>
      <DoSurfaceFragment {...doSurfaceProps(doSurfaceMocks.failedRefresh)} />
    </Stage>
  ),
}

/** First launch: nothing anywhere. */
export const EmptyDay = {
  render: () => (
    <Stage width={1120}>
      <DoSurfaceFragment {...doSurfaceProps(doSurfaceMocks.emptyDay)} />
    </Stage>
  ),
}

/** Both schemes at the desktop width. */
export const BothSchemes = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      <Stage theme="light" width={720} height={640}>
        <DoSurfaceFragment {...doSurfaceProps(doSurfaceMocks.ringsEnabled)} />
      </Stage>
      <Stage theme="dark" width={720} height={640}>
        <DoSurfaceFragment {...doSurfaceProps(doSurfaceMocks.ringsEnabled)} />
      </Stage>
    </div>
  ),
}

/** Both schemes at the handheld width. */
export const BothSchemesNarrow = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      <Stage theme="light" width={390} height={640}>
        <DoSurfaceFragment
          {...doSurfaceProps(doSurfaceMocks.ringsEnabled, 'handheld')}
        />
      </Stage>
      <Stage theme="dark" width={390} height={640}>
        <DoSurfaceFragment
          {...doSurfaceProps(doSurfaceMocks.ringsEnabled, 'handheld')}
        />
      </Stage>
    </div>
  ),
}
