import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DoHeaderFragment } from '../DoHeaderFragment'
import {
  DO_SURFACE_MOCK_LOCALE,
  DO_SURFACE_MOCK_NOW,
  desktopDoLayout,
  doSurfaceMocks,
  handheldDoLayout,
  remainingCountOf,
  ringsOf,
} from '../doSurfaceMocks'
import { doHeaderContent } from '../doPresentation'

afterEach(cleanup)

const headerFor = (
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

describe('the regular-width header', () => {
  it('shows the sun glyph, My Day, the red short date and the weekday', () => {
    render(
      <DoHeaderFragment
        content={headerFor(
          doSurfaceMocks.typicalDay,
          desktopDoLayout.usesExpandedDayTitle,
        )}
        rings={[]}
        showsRings={false}
      />,
    )

    expect(screen.getByTestId('do-header-title').textContent).toBe('My Day')
    expect(screen.getByTestId('do-header-date').textContent).toBe('Mar 17')
    expect(screen.getByTestId('do-header-weekday').textContent).toBe('Tuesday')
    expect(screen.getByTestId('do-header-sun')).toBeTruthy()
  })

  it('prints the "N left today" line the day actually has', () => {
    const content = headerFor(doSurfaceMocks.typicalDay, true)
    render(
      <DoHeaderFragment content={content} rings={[]} showsRings={false} />,
    )

    expect(screen.getByTestId('do-header-subtitle').textContent).toBe(
      `${remainingCountOf(doSurfaceMocks.typicalDay)} left today`,
    )
  })
})

describe('the compact header', () => {
  it('falls back to the bare short date, with no glyph and no weekday', () => {
    render(
      <DoHeaderFragment
        content={headerFor(
          doSurfaceMocks.typicalDay,
          handheldDoLayout.usesExpandedDayTitle,
        )}
        rings={[]}
        showsRings={false}
      />,
    )

    expect(screen.getByTestId('do-header-title').textContent).toBe('Mar 17')
    expect(screen.queryByTestId('do-header-date')).toBeNull()
    expect(screen.queryByTestId('do-header-weekday')).toBeNull()
    expect(screen.queryByTestId('do-header-sun')).toBeNull()
  })
})

describe('the rings', () => {
  it('draws both arcs when the day expects habits and tasks', () => {
    const rings = ringsOf(doSurfaceMocks.ringsEnabled)
    render(
      <DoHeaderFragment
        content={headerFor(doSurfaceMocks.ringsEnabled, true)}
        rings={rings}
        showsRings
      />,
    )

    expect(rings.length).toBeGreaterThan(0)
    expect(screen.getByTestId('do-header-rings')).toBeTruthy()
  })

  it('draws nothing while the kill switch is off, even with arcs to show', () => {
    render(
      <DoHeaderFragment
        content={headerFor(doSurfaceMocks.ringsEnabled, true)}
        rings={ringsOf(doSurfaceMocks.ringsEnabled)}
        showsRings={false}
      />,
    )

    expect(screen.queryByTestId('do-header-rings')).toBeNull()
  })

  it('draws nothing for a day that expects nothing, rather than an empty track', () => {
    render(
      <DoHeaderFragment
        content={headerFor(doSurfaceMocks.emptyDay, true)}
        rings={ringsOf(doSurfaceMocks.emptyDay)}
        showsRings
      />,
    )

    expect(screen.queryByTestId('do-header-rings')).toBeNull()
  })
})

describe('bulk mark-complete mode', () => {
  it('retitles to the instruction and suppresses the date furniture', () => {
    render(
      <DoHeaderFragment
        content={headerFor(doSurfaceMocks.markCompleteMode, true)}
        rings={ringsOf(doSurfaceMocks.markCompleteMode)}
        showsRings={false}
      />,
    )

    expect(screen.getByTestId('do-header-title').textContent).toBe(
      'Check Complete',
    )
    expect(screen.getByTestId('do-header-subtitle').textContent).toBe(
      'Tap any card to mark the task completed',
    )
    expect(screen.queryByTestId('do-header-rings')).toBeNull()
  })
})
