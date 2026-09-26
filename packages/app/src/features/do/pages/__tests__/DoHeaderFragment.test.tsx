import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
    render(<DoHeaderFragment content={content} rings={[]} showsRings={false} />)

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

  it('keeps both tracks, empty, on a day that expects nothing', async () => {
    const onTapRings = vi.fn()
    render(
      <DoHeaderFragment
        content={headerFor(doSurfaceMocks.emptyDay, true)}
        rings={ringsOf(doSurfaceMocks.emptyDay)}
        showsRings
        onTapRings={onTapRings}
      />,
    )

    expect(
      screen.getByLabelText('Habits, none today, Tasks, none due today'),
    ).toBeTruthy()
    await userEvent.click(screen.getByTestId('do-header-rings-button'))
    expect(onTapRings).toHaveBeenCalledOnce()
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

describe('the LargeScreenTitle slab', () => {
  it('paints the diagonal clip on the header itself, not the content column', () => {
    render(
      <DoHeaderFragment
        content={headerFor(doSurfaceMocks.typicalDay, true)}
        rings={[]}
        showsRings={false}
      />,
    )

    const header = screen.getByTestId('do-header')
    const slab = screen.getByTestId('do-header-title-slab')
    expect(header.contains(slab)).toBe(true)
    expect(slab.className).toContain('kro-gradient-backdrop--large-title')
    expect(slab.className).toContain('kro-gradient-backdrop--hard')
    expect(slab.dataset.gradientBleed).toBe('window')
  })

  it('does not pin a 360px drop — the clip fills the title, remaining-count and rings', () => {
    render(
      <DoHeaderFragment
        content={headerFor(doSurfaceMocks.typicalDay, true)}
        rings={[]}
        showsRings={false}
      />,
    )

    const slab = screen.getByTestId('do-header-title-slab')
    expect(slab.style.getPropertyValue('--kro-gradient-height')).toBe('')
  })

  it('keeps Suggestions out of the title — the slab is a descendant of the header only', () => {
    render(
      <DoHeaderFragment
        content={headerFor(doSurfaceMocks.typicalDay, true)}
        rings={[]}
        showsRings={false}
      />,
    )

    expect(
      screen
        .getByTestId('do-header-title-slab')
        .parentElement?.getAttribute('data-testid'),
    ).toBe('do-header')
  })
})

describe('the rings open Day Progress where the pane can show it', () => {
  const content = headerFor(doSurfaceMocks.ringsEnabled, true)

  it('makes the rings a button that reports the tap', async () => {
    const onTapRings = vi.fn()
    render(
      <DoHeaderFragment
        content={content}
        rings={ringsOf(doSurfaceMocks.ringsEnabled)}
        showsRings
        onTapRings={onTapRings}
      />,
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Show Day Progress' }),
    )
    expect(onTapRings).toHaveBeenCalledTimes(1)
  })

  it('keeps the rings a passive indicator with no handler', () => {
    render(
      <DoHeaderFragment
        content={content}
        rings={ringsOf(doSurfaceMocks.ringsEnabled)}
        showsRings
      />,
    )
    expect(
      screen.queryByRole('button', { name: 'Show Day Progress' }),
    ).toBeNull()
    expect(screen.getByTestId('do-header-rings')).toBeTruthy()
  })

  it('draws no button when the rings are hidden', () => {
    render(
      <DoHeaderFragment
        content={content}
        rings={[]}
        showsRings={false}
        onTapRings={() => {}}
      />,
    )
    expect(screen.queryByTestId('do-header-rings-button')).toBeNull()
  })
})
