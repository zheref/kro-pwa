import type { ReactNode } from 'react'
import { GradientBackdrop } from '../../../design/system/gradient/GradientBackdrop'
import { DoHeaderFragment } from './DoHeaderFragment'
import { doHeaderContent } from './doPresentation'
import {
  DO_SURFACE_MOCK_LOCALE,
  DO_SURFACE_MOCK_NOW,
  desktopDoLayout,
  doSurfaceMocks,
  handheldDoLayout,
  remainingCountOf,
  ringsOf,
} from './doSurfaceMocks'

/**
 * The My Day header, at both widths and in both schemes.
 *
 * Every story is built from `doSurfaceMocks` — the real projection of the Do
 * slice's own state mocks (`RC-31`) — so a story cannot show a header the
 * reducer could not produce. The gradient behind it is the shell's slab, staged
 * here so the white-on-gradient ink is judged against the surface it actually
 * lands on.
 */
export default {
  title: 'Do/Header',
  component: DoHeaderFragment,
  parameters: { layout: 'fullscreen' },
}

function Stage({
  theme = 'light',
  width,
  children,
}: {
  theme?: 'light' | 'dark'
  width: number
  children: ReactNode
}) {
  return (
    <div
      data-theme={theme}
      style={{
        position: 'relative',
        width,
        overflow: 'hidden',
        background: 'var(--kro-color-back)',
      }}
    >
      <GradientBackdrop height="180px" hardEdge />
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  )
}

const header = (
  state: (typeof doSurfaceMocks)[keyof typeof doSurfaceMocks],
  expanded: boolean,
) =>
  doHeaderContent({
    now: DO_SURFACE_MOCK_NOW,
    locale: DO_SURFACE_MOCK_LOCALE,
    usesExpandedDayTitle: expanded,
    isInMarkCompleteMode: state.isInMarkCompleteMode,
    remainingCount: remainingCountOf(state),
  })

/** Regular width: ☀︎ My Day · Mar 17 · Tuesday, with both rings. */
export const RegularWidth = {
  render: () => (
    <Stage width={860}>
      <DoHeaderFragment
        content={header(
          doSurfaceMocks.ringsEnabled,
          desktopDoLayout.usesExpandedDayTitle,
        )}
        rings={ringsOf(doSurfaceMocks.ringsEnabled)}
        showsRings
      />
    </Stage>
  ),
}

/** Compact width: the bare short date, and no red treatment. */
export const CompactWidth = {
  render: () => (
    <Stage width={390}>
      <DoHeaderFragment
        content={header(
          doSurfaceMocks.ringsEnabled,
          handheldDoLayout.usesExpandedDayTitle,
        )}
        rings={ringsOf(doSurfaceMocks.ringsEnabled)}
        showsRings
      />
    </Stage>
  ),
}

/** Bulk mode: the instruction replaces the date, and the rings step aside. */
export const MarkCompleteMode = {
  render: () => (
    <Stage width={860}>
      <DoHeaderFragment
        content={header(doSurfaceMocks.markCompleteMode, true)}
        rings={ringsOf(doSurfaceMocks.markCompleteMode)}
        showsRings={false}
      />
    </Stage>
  ),
}

/** A day that expects nothing: no rings at all, rather than an empty track. */
export const NoRings = {
  render: () => (
    <Stage width={860}>
      <DoHeaderFragment
        content={header(doSurfaceMocks.emptyDay, true)}
        rings={ringsOf(doSurfaceMocks.emptyDay)}
        showsRings
      />
    </Stage>
  ),
}

/** Both schemes, side by side, at the regular width. */
export const BothSchemes = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      <Stage theme="light" width={520}>
        <DoHeaderFragment
          content={header(doSurfaceMocks.ringsEnabled, true)}
          rings={ringsOf(doSurfaceMocks.ringsEnabled)}
          showsRings
        />
      </Stage>
      <Stage theme="dark" width={520}>
        <DoHeaderFragment
          content={header(doSurfaceMocks.ringsEnabled, true)}
          rings={ringsOf(doSurfaceMocks.ringsEnabled)}
          showsRings
        />
      </Stage>
    </div>
  ),
}
