import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ActiveToastHost,
  resetActiveToastSequence,
} from '../../../../design/chrome'
import { noopDoCardHandlers } from '../doCardHandlers'
import {
  DoSurfaceFragment,
  PULL_TO_REFRESH_THRESHOLD,
} from '../DoSurfaceFragment'
import { doSurfaceMocks, doSurfaceProps } from '../doSurfaceMocks'

beforeEach(() => {
  resetActiveToastSequence()
})
afterEach(cleanup)

const day = doSurfaceProps(doSurfaceMocks.typicalDay)

/**
 * Every render here goes through a toast host.
 *
 * The one host moved up to the shell (`MainShellPage`, KC-IS-#71 item 15), so a
 * Fragment mounted on its own has no ancestor supplying the context and
 * `useActiveToasts()` throws — deliberately, because a silently swallowed toast
 * is the bug nobody notices. `position="absolute"` keeps the layer inside the
 * test's own container, exactly as the surface's former host did.
 */
const InToastHost = ({ children }: { children: ReactNode }) => (
  <ActiveToastHost position="absolute">{children}</ActiveToastHost>
)

const renderSurface = (ui: ReactElement) =>
  render(ui, { wrapper: InToastHost })

/** One touch drag down the scroller, in the shape React's synthetic events want. */
const pullBy = (scroller: HTMLElement, distance: number) => {
  fireEvent.touchStart(scroller, { touches: [{ clientY: 0 }] })
  fireEvent.touchMove(scroller, { touches: [{ clientY: distance }] })
  fireEvent.touchEnd(scroller, { touches: [] })
}

describe('the surface composes the header, the lanes and the FAB', () => {
  it('renders the day header above the lanes', () => {
    renderSurface(<DoSurfaceFragment {...day} />)
    expect(screen.getByTestId('do-header')).toBeTruthy()
    expect(screen.getByTestId('do-lanes')).toBeTruthy()
  })

  it('offers canon\'s four quick actions behind the FAB', async () => {
    const onEnterMarkCompleteMode = vi.fn()
    renderSurface(
      <DoSurfaceFragment
        {...day}
        onEnterMarkCompleteMode={onEnterMarkCompleteMode}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Quick action' }))
    for (const label of [
      'Mark Complete…',
      'Clear Expired',
      'Quick Add',
      'Start Session',
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy()
    }

    await userEvent.click(screen.getByRole('button', { name: 'Mark Complete…' }))
    expect(onEnterMarkCompleteMode).toHaveBeenCalledTimes(1)
  })

  it('surfaces a failed refresh without throwing the retained day away', () => {
    const failed = doSurfaceProps(doSurfaceMocks.failedRefresh)
    renderSurface(<DoSurfaceFragment {...failed} />)

    // The copy is the domain's — `DoException.message`, never assembled here.
    expect(
      screen.getByText(/Couldn't refresh the Do screen/),
    ).toBeTruthy()
    expect(screen.getByTestId('do-lane-overdue')).toBeTruthy()
  })
})

describe('refresh', () => {
  it('refreshes when a touch surface is pulled past the threshold', () => {
    const onRefresh = vi.fn()
    renderSurface(
      <DoSurfaceFragment
        {...doSurfaceProps(doSurfaceMocks.typicalDay, 'handheld', {
          onRefresh,
        })}
      />,
    )

    pullBy(screen.getByTestId('do-scroller'), PULL_TO_REFRESH_THRESHOLD + 10)
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('does not refresh on a short drag that never armed', () => {
    const onRefresh = vi.fn()
    renderSurface(
      <DoSurfaceFragment
        {...doSurfaceProps(doSurfaceMocks.typicalDay, 'handheld', {
          onRefresh,
        })}
      />,
    )

    pullBy(screen.getByTestId('do-scroller'), PULL_TO_REFRESH_THRESHOLD - 10)
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('offers no pull affordance on a pointer surface — that one has a toolbar', () => {
    renderSurface(<DoSurfaceFragment {...day} />)
    expect(screen.queryByTestId('do-pull-indicator')).toBeNull()
  })
})

describe('the one-shot scrolls', () => {
  it('reports the overdue jump as handled so the flag can clear', () => {
    const onScrollHandled = vi.fn()
    renderSurface(
      <DoSurfaceFragment
        {...day}
        scrollTarget="overdue"
        onScrollHandled={onScrollHandled}
      />,
    )
    expect(onScrollHandled).toHaveBeenCalledTimes(1)
  })

  it('reports the auto-advance jump as handled too', () => {
    const onScrollHandled = vi.fn()
    const first = day.lanes.now[0]
    if (first === undefined) throw new Error('the Due Soon fixture is empty')

    renderSurface(
      <DoSurfaceFragment
        {...day}
        selectedCardKey={`now:${first.id}`}
        scrollTarget="currentCard"
        onScrollHandled={onScrollHandled}
      />,
    )
    expect(onScrollHandled).toHaveBeenCalledTimes(1)
  })

  it('reports nothing while no jump has been asked for', () => {
    const onScrollHandled = vi.fn()
    renderSurface(
      <DoSurfaceFragment
        {...day}
        scrollTarget={null}
        onScrollHandled={onScrollHandled}
      />,
    )
    expect(onScrollHandled).not.toHaveBeenCalled()
  })
})

describe('mark-complete mode reaches every card at once', () => {
  it('wiggles every card and offers the corner check without a preparation tap', () => {
    renderSurface(
      <DoSurfaceFragment
        {...doSurfaceProps(doSurfaceMocks.markCompleteMode)}
      />,
    )

    const cards = document.querySelectorAll<HTMLElement>(
      '[data-slot="endeavor-card"]',
    )
    expect(cards.length).toBeGreaterThan(0)
    for (const card of cards) {
      expect(card.dataset.markCompleteMode).toBe('true')
    }
  })

  it('hides the rings while the header carries the instruction instead', () => {
    renderSurface(
      <DoSurfaceFragment
        {...doSurfaceProps(doSurfaceMocks.markCompleteMode)}
      />,
    )

    expect(screen.getByTestId('do-header-title').textContent).toBe(
      'Check Complete',
    )
    expect(screen.queryByTestId('do-header-rings')).toBeNull()
  })
})

describe('the expanded section list', () => {
  it('opens over the surface when a lane badge is tapped, and closes on Back', async () => {
    const onDeselect = vi.fn()
    renderSurface(
      <DoSurfaceFragment
        {...day}
        handlers={{ ...noopDoCardHandlers, onDeselect }}
      />,
    )

    const lane = screen.getByTestId('do-lane-overdue')
    const badge = lane.querySelector<HTMLButtonElement>(
      'button[aria-label^="Overdue"]',
    )
    if (badge === null) throw new Error('the Overdue badge is not a button')

    await userEvent.click(badge)
    expect(screen.getByTestId('do-tasks-list-overlay')).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.queryByTestId('do-tasks-list-overlay')).toBeNull()
    expect(onDeselect).toHaveBeenCalledTimes(1)
  })
})
