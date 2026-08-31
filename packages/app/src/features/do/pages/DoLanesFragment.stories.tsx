import type { ReactNode } from 'react'
import { GradientBackdrop } from '../../../design/system/gradient/GradientBackdrop'
import { DoLanesFragment, type DoLanesFragmentProps } from './DoLanesFragment'
import { noopDoCardHandlers } from './doCardHandlers'
import {
  DO_SURFACE_MOCK_LOCALE,
  DO_SURFACE_MOCK_NOW,
  doSurfaceMocks,
  doSurfaceProps,
} from './doSurfaceMocks'

/**
 * The lane stack: canon's order, the hero lane at three widths, bulk mode and
 * the empty day. Built from `doSurfaceMocks` (`RC-31`).
 */
export default {
  title: 'Do/Lanes',
  component: DoLanesFragment,
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
        paddingBlock: 16,
        overflow: 'hidden',
        background: 'var(--kro-color-back)',
      }}
    >
      <GradientBackdrop height="220px" />
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  )
}

const props = (
  state: (typeof doSurfaceMocks)[keyof typeof doSurfaceMocks],
  overrides: Partial<DoLanesFragmentProps> = {},
): DoLanesFragmentProps => {
  const surface = doSurfaceProps(state)
  return {
    lanes: surface.lanes,
    reminders: surface.reminders,
    allDayEvents: surface.allDayEvents,
    timedEventGroups: surface.timedEventGroups,
    suggestions: surface.suggestions,
    showsSuggestions: surface.showsSuggestions,
    hasNoEndeavors: surface.hasNoEndeavors,
    selectedCardKey: surface.selectedCardKey,
    isInMarkCompleteMode: surface.isInMarkCompleteMode,
    now: DO_SURFACE_MOCK_NOW,
    locale: DO_SURFACE_MOCK_LOCALE,
    initialLaneWidth: 1120,
    onExpandSection: () => {},
    onCreateEndeavor: () => {},
    handlers: noopDoCardHandlers,
    suggestionHandlers: { onAction: () => {}, onDismiss: () => {} },
    ...overrides,
  }
}

/** The ordinary day at desktop width — the seven-card hero lane. */
export const DesktopDay = {
  render: () => (
    <Stage width={1120}>
      <DoLanesFragment {...props(doSurfaceMocks.typicalDay)} />
    </Stage>
  ),
}

/** The same day at phone width: three cards, proportionally shrunk. */
export const HandheldDay = {
  render: () => (
    <Stage width={390}>
      <DoLanesFragment
        {...props(doSurfaceMocks.typicalDay, { initialLaneWidth: 358 })}
      />
    </Stage>
  ),
}

/** A prepared card in Due Soon — the blurred content behind the action stack. */
export const CardPrepared = {
  render: () => {
    const day = props(doSurfaceMocks.typicalDay)
    const target = day.lanes.now[0]
    return (
      <Stage width={1120}>
        <DoLanesFragment
          {...day}
          selectedCardKey={target === undefined ? null : `now:${target.id}`}
        />
      </Stage>
    )
  },
}

/** Bulk mark-complete mode: every card wiggling, each with its corner check. */
export const MarkCompleteMode = {
  render: () => (
    <Stage width={1120}>
      <DoLanesFragment
        {...props(doSurfaceMocks.typicalDay, { isInMarkCompleteMode: true })}
      />
    </Stage>
  ),
}

/** The connect nudge above the day. */
export const WithSuggestion = {
  render: () => (
    <Stage width={1120}>
      <DoLanesFragment {...props(doSurfaceMocks.suggestionOffered)} />
    </Stage>
  ),
}

/** Nothing anywhere — the promotion inset, not an empty scroll. */
export const EmptyDay = {
  render: () => (
    <Stage width={1120}>
      <DoLanesFragment {...props(doSurfaceMocks.emptyDay)} />
    </Stage>
  ),
}

/** Both schemes at the phone width. */
export const BothSchemesNarrow = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      <Stage theme="light" width={390}>
        <DoLanesFragment
          {...props(doSurfaceMocks.typicalDay, { initialLaneWidth: 358 })}
        />
      </Stage>
      <Stage theme="dark" width={390}>
        <DoLanesFragment
          {...props(doSurfaceMocks.typicalDay, { initialLaneWidth: 358 })}
        />
      </Stage>
    </div>
  ),
}
