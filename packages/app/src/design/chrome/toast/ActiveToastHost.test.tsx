import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOAST_DURATION_SECONDS } from '../layout/chromeLayout'
import { ActiveToastHost, useActiveToasts } from './ActiveToastHost'
import { type ActiveToastInput, resetActiveToastSequence } from './activeToast'

beforeEach(() => {
  resetActiveToastSequence()
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

/**
 * A stand-in for the Fragment that will raise toasts once the shell exists.
 * Deliberately a Component with no store: that IS the `RC-14` contract this
 * host is built to keep.
 */
function Raiser({ toast, label = 'Complete' }: { toast: ActiveToastInput; label?: string }) {
  const { enqueue } = useActiveToasts()
  return (
    <button type="button" onClick={() => enqueue(toast)}>
      {label}
    </button>
  )
}

/** Fake timers make `userEvent` hang, so intent is dispatched directly. */
function press(name: string) {
  act(() => {
    screen.getByRole('button', { name }).click()
  })
}

/** Advance the clock inside `act`, so React flushes what the timer scheduled. */
function advance(seconds: number) {
  act(() => {
    vi.advanceTimersByTime(seconds * 1000)
  })
}

describe('enqueue puts a toast up', () => {
  it('shows the message a feature raised', () => {
    render(
      <ActiveToastHost position="absolute">
        <Raiser toast={{ message: '"Buy groceries" marked complete' }} />
      </ActiveToastHost>,
    )

    press('Complete')

    expect(screen.getByText('"Buy groceries" marked complete')).toBeDefined()
  })

  it('shows nothing until something is raised', () => {
    render(
      <ActiveToastHost position="absolute">
        <Raiser toast={{ message: 'x' }} />
      </ActiveToastHost>,
    )

    expect(document.querySelector('[data-kro-toast]')).toBeNull()
  })

  it('throws a legible error when used with no host, rather than swallowing the toast', () => {
    // A silently-dropped toast surfaces as "the Undo affordance never appeared",
    // which is exactly the kind of thing nobody catches in review.
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Raiser toast={{ message: 'x' }} />)).toThrow(/ActiveToastHost/)
    quiet.mockRestore()
  })
})

describe('auto-dismiss timing', () => {
  it('holds the toast for its full duration', () => {
    render(
      <ActiveToastHost position="absolute">
        <Raiser toast={{ message: 'Added for today', duration: 8 }} />
      </ActiveToastHost>,
    )

    press('Complete')
    advance(7.9)

    expect(screen.getByText('Added for today')).toBeDefined()
  })

  it('takes it down once the duration elapses', () => {
    render(
      <ActiveToastHost position="absolute">
        <Raiser toast={{ message: 'Added for today', duration: 8 }} />
      </ActiveToastHost>,
    )

    press('Complete')
    advance(8.1)

    expect(screen.queryByText('Added for today')).toBeNull()
  })

  it('uses canon`s 10-second default when the caller names no duration', () => {
    render(
      <ActiveToastHost position="absolute">
        <Raiser toast={{ message: 'Saved' }} />
      </ActiveToastHost>,
    )

    press('Complete')
    advance(TOAST_DURATION_SECONDS.default - 0.1)
    expect(screen.getByText('Saved')).toBeDefined()

    advance(0.2)
    expect(screen.queryByText('Saved')).toBeNull()
  })

  it('never dismisses faster than the 3-second reading floor, however short the ask', () => {
    render(
      <ActiveToastHost position="absolute">
        <Raiser toast={{ message: 'Saved', duration: 0.2 }} />
      </ActiveToastHost>,
    )

    press('Complete')
    advance(1)

    expect(screen.getByText('Saved')).toBeDefined()
  })
})

describe('a second toast replaces the first — the queue is one deep', () => {
  /**
   * The labels and the messages are deliberately different words. A raiser
   * button reading "Skip" and a toast reading "Skip" would make every query
   * below ambiguous, and the ambiguity would read as a product bug.
   */
  function twoRaisers() {
    return render(
      <ActiveToastHost position="absolute">
        <Raiser toast={{ message: '"Groceries" completed', duration: 8 }} label="Complete" />
        <Raiser toast={{ message: '"Workout" skipped', duration: 8 }} label="Skip" />
      </ActiveToastHost>,
    )
  }

  it('shows only the newer toast', () => {
    twoRaisers()

    press('Complete')
    advance(2)
    press('Skip')

    expect(screen.queryByText('"Groceries" completed')).toBeNull()
    expect(screen.getByText('"Workout" skipped')).toBeDefined()
    expect(document.querySelectorAll('[data-kro-toast]')).toHaveLength(1)
  })

  it('restarts the countdown rather than inheriting the first toast`s remainder', () => {
    twoRaisers()

    press('Complete')
    advance(7)
    press('Skip')
    // The first toast's timer would have fired 1s from here.
    advance(2)

    expect(screen.getByText('"Workout" skipped')).toBeDefined()
  })
})

describe('dismiss', () => {
  function Controls() {
    const { enqueue, dismiss, current } = useActiveToasts()
    return (
      <>
        <button type="button" onClick={() => enqueue({ message: 'Deleted', duration: 8 })}>
          Delete
        </button>
        <button type="button" onClick={() => dismiss()}>
          Dismiss
        </button>
        <button type="button" onClick={() => dismiss('kro-toast-999')}>
          Dismiss stale
        </button>
        {/* Prefixed so the readout never collides with the toast's own text. */}
        <span data-testid="current">{`showing: ${current?.message ?? 'none'}`}</span>
      </>
    )
  }

  it('takes the toast down immediately when a handler asks it to', () => {
    render(
      <ActiveToastHost position="absolute">
        <Controls />
      </ActiveToastHost>,
    )

    press('Delete')
    press('Dismiss')

    expect(screen.queryByText('Deleted')).toBeNull()
  })

  it('ignores a stale dismiss, so an old Undo cannot take down a newer toast', () => {
    render(
      <ActiveToastHost position="absolute">
        <Controls />
      </ActiveToastHost>,
    )

    press('Delete')
    press('Dismiss stale')

    expect(screen.getByText('Deleted')).toBeDefined()
  })

  it('reports what is on screen, for a caller that needs to know', () => {
    render(
      <ActiveToastHost position="absolute">
        <Controls />
      </ActiveToastHost>,
    )

    expect(screen.getByTestId('current').textContent).toBe('showing: none')
    press('Delete')
    expect(screen.getByTestId('current').textContent).toBe('showing: Deleted')
  })
})

describe('the host wires the placement rules through', () => {
  it('lifts the toast above the pill when the shell says a session is running', () => {
    render(
      <ActiveToastHost position="absolute" isSessionPillVisible>
        <Raiser toast={{ message: 'Saved' }} />
      </ActiveToastHost>,
    )

    press('Complete')

    expect(
      document.querySelector('[data-kro-toast-layer]')?.getAttribute('data-kro-toast-lifted'),
    ).toBe('true')
  })
})
