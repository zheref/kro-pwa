import type { ReactNode } from 'react'
import { GradientBackdrop } from '../../../design/system/gradient/GradientBackdrop'
import { DoTasksListFragment } from './DoTasksListFragment'
import { noopDoCardHandlers } from './doCardHandlers'
import {
  DO_SURFACE_MOCK_LOCALE,
  DO_SURFACE_MOCK_NOW,
  doSurfaceMocks,
  doSurfaceProps,
} from './doSurfaceMocks'

/**
 * One Do section, expanded into a vertical list — the same `EndeavorCard`,
 * laid out horizontally, which is why canon retired its private list row.
 */
export default {
  title: 'Do/Expanded section',
  component: DoTasksListFragment,
  parameters: { layout: 'fullscreen' },
}

const day = doSurfaceProps(doSurfaceMocks.typicalDay)
const overdue = { title: 'Overdue', tag: 'overdue' } as const

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
        height: 640,
        overflow: 'hidden',
        background: 'var(--kro-color-back)',
        border: '1px solid var(--kro-color-hairline)',
      }}
    >
      <GradientBackdrop height="160px" />
      <div style={{ position: 'relative', height: '100%' }}>{children}</div>
    </div>
  )
}

/** The Overdue section, expanded at desktop width. */
export const Desktop = {
  render: () => (
    <Stage width={860}>
      <DoTasksListFragment
        destination={overdue}
        tasks={day.lanes.overdue}
        selectedCardKey={null}
        isInMarkCompleteMode={false}
        now={DO_SURFACE_MOCK_NOW}
        locale={DO_SURFACE_MOCK_LOCALE}
        onBack={() => {}}
        handlers={noopDoCardHandlers}
      />
    </Stage>
  ),
}

/** The same section at phone width, where the rows fill the screen. */
export const Handheld = {
  render: () => (
    <Stage width={390}>
      <DoTasksListFragment
        destination={overdue}
        tasks={day.lanes.overdue}
        selectedCardKey={null}
        isInMarkCompleteMode={false}
        now={DO_SURFACE_MOCK_NOW}
        locale={DO_SURFACE_MOCK_LOCALE}
        onBack={() => {}}
        handlers={noopDoCardHandlers}
      />
    </Stage>
  ),
}

/** A prepared row: the glass action strip over the card. */
export const RowPrepared = {
  render: () => {
    const first = day.lanes.overdue[0]
    return (
      <Stage width={860}>
        <DoTasksListFragment
          destination={overdue}
          tasks={day.lanes.overdue}
          selectedCardKey={first === undefined ? null : `overdue:${first.id}`}
          isInMarkCompleteMode={false}
          now={DO_SURFACE_MOCK_NOW}
          locale={DO_SURFACE_MOCK_LOCALE}
          onBack={() => {}}
          handlers={noopDoCardHandlers}
        />
      </Stage>
    )
  },
}

/** Bulk mode inside the list — the same wiggle and the same corner glyph. */
export const MarkCompleteMode = {
  render: () => (
    <Stage width={860}>
      <DoTasksListFragment
        destination={overdue}
        tasks={day.lanes.overdue}
        selectedCardKey={null}
        isInMarkCompleteMode
        now={DO_SURFACE_MOCK_NOW}
        locale={DO_SURFACE_MOCK_LOCALE}
        onBack={() => {}}
        handlers={noopDoCardHandlers}
      />
    </Stage>
  ),
}

/** The section emptied while it was open. */
export const AllClear = {
  render: () => (
    <Stage width={860}>
      <DoTasksListFragment
        destination={{ title: 'Next', tag: 'next' }}
        tasks={[]}
        selectedCardKey={null}
        isInMarkCompleteMode={false}
        now={DO_SURFACE_MOCK_NOW}
        locale={DO_SURFACE_MOCK_LOCALE}
        onBack={() => {}}
        handlers={noopDoCardHandlers}
      />
    </Stage>
  ),
}
