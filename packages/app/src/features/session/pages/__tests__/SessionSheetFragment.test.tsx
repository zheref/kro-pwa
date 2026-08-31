/**
 * The session sheet's content (`RC-11`) — the render tests that mirror
 * `SessionSheetFragment.stories.tsx`, both built from `sessionSheetMocks`.
 *
 * ## What the fixed-slot group actually proves
 *
 * jsdom does no layout, so `getBoundingClientRect()` is all zeroes and a test
 * that measured it would pass on a broken sheet. What jsdom *can* answer is
 * what the markup asks for, and that is where the contract lives:
 *
 * - every reserved region declares its height as an inline style, and the
 *   declared value is identical in every phase;
 * - all four decks are present in every phase, stacked in one grid cell, so the
 *   deck's height is the tallest deck rather than the current one.
 *
 * Those two facts are what make "surviving elements never move" true, and both
 * are checkable here. What is NOT checkable here is paint — the phase pairs are
 * judged visually in the `PhaseSlotGrid` story and in the PR's screenshots.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SessionPhase, sessionPhases } from '../../SessionVocabulary'
import { SessionSheetFragment } from '../SessionSheetFragment'
import { sessionSheetMocks, sheetPropsFor } from '../SessionSurfaceMocks'
import { sessionStateMocks } from '../../SessionMocks'
import { SESSION_SLOT_HEIGHT } from '../sessionSheetModel'

afterEach(cleanup)

const slotHeight = (container: HTMLElement, slot: string): string =>
  (container.querySelector(`[data-kro-session-slot="${slot}"]`) as HTMLElement)
    .style.height

const deck = (container: HTMLElement, name: string): HTMLElement =>
  container.querySelector(`[data-kro-session-deck="${name}"]`) as HTMLElement

describe('phases', () => {
  it('opens ready with the play button and canon’s two-line hint', () => {
    render(<SessionSheetFragment {...sessionSheetMocks.ready} />)

    expect(screen.getByRole('button', { name: 'Start session' })).toBeTruthy()
    expect(screen.getByText('Tap to start')).toBeTruthy()
    expect(screen.getByText('Swipe down to dismiss')).toBeTruthy()
    expect(screen.getByText('READY')).toBeTruthy()
  })

  it('shows pause and stop while a session runs, and the live remaining time', () => {
    const { container } = render(
      <SessionSheetFragment {...sessionSheetMocks.running} />,
    )

    expect(screen.getByRole('button', { name: 'Pause session' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Stop session' })).toBeTruthy()
    expect(screen.getByText('Session in progress')).toBeTruthy()
    // 25-minute target, ten minutes in.
    expect(
      (
        container.querySelector(
          '[data-kro-session-focused-clock]',
        ) as HTMLElement
      ).textContent,
    ).toBe('15:00')
  })

  it('swaps pause for a resume affordance while paused', () => {
    render(<SessionSheetFragment {...sessionSheetMocks.paused} />)

    expect(screen.getByRole('button', { name: 'Resume session' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Pause session' })).toBeNull()
    expect(screen.getByText('Paused')).toBeTruthy()
  })

  it('offers Complete and Start New at the conclusion, and asks what is next', () => {
    render(<SessionSheetFragment {...sessionSheetMocks.concluded} />)

    expect(screen.getByText('Session Completed!')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Complete Task/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Start New/ })).toBeTruthy()
    expect(screen.getByText('What would you like to do next?')).toBeTruthy()
    expect(screen.getByText('25:00 focused')).toBeTruthy()
  })

  it('hides Break at the conclusion while its flag is off — the shipped build', () => {
    render(<SessionSheetFragment {...sessionSheetMocks.concluded} />)
    expect(screen.queryByRole('button', { name: /Break/ })).toBeNull()
  })

  it('offers Break at the conclusion once the flag allows it', () => {
    render(<SessionSheetFragment {...sessionSheetMocks.concludedWithBreak} />)
    expect(screen.getByRole('button', { name: /Break/ })).toBeTruthy()
  })

  it('replaces the title with the break copy and offers the pastry-green start', () => {
    render(<SessionSheetFragment {...sessionSheetMocks.onBreak} />)

    expect(screen.getByText('Break Time')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: /Start Focus Session/ }),
    ).toBeTruthy()
    expect(screen.getByText(/On a break\?/)).toBeTruthy()
    expect(screen.getByText('Tap to end break and continue working')).toBeTruthy()
  })

  it('reads the dismissal hint from the host, not from the platform', () => {
    render(<SessionSheetFragment {...sessionSheetMocks.pausedInline} />)
    expect(screen.getByText('Close to dismiss')).toBeTruthy()
    expect(screen.queryByText('Swipe down to dismiss')).toBeNull()
  })
})

describe('the fixed-slot contract', () => {
  it.each(sessionPhases)(
    'keeps every reserved region at its canon height in the %s phase',
    (phase) => {
      const props = sheetPropsFor(
        sessionStateMocks.running,
      ) as typeof sessionSheetMocks.running
      const { container } = render(
        <SessionSheetFragment {...props} phase={phase} />,
      )

      expect(slotHeight(container, 'identity')).toBe(
        `${SESSION_SLOT_HEIGHT.identity}px`,
      )
      expect(slotHeight(container, 'dial')).toBe(`${SESSION_SLOT_HEIGHT.dial}px`)
      expect(slotHeight(container, 'status')).toBe(
        `${SESSION_SLOT_HEIGHT.status}px`,
      )
    },
  )

  it.each([
    [SessionPhase.ready, SessionPhase.running],
    [SessionPhase.running, SessionPhase.paused],
    [SessionPhase.paused, SessionPhase.concluded],
    [SessionPhase.concluded, SessionPhase.break],
    [SessionPhase.break, SessionPhase.ready],
  ])(
    'mounts all four decks in one grid cell across the %s → %s transition',
    (from, to) => {
      const base = sheetPropsFor(sessionStateMocks.running)

      for (const phase of [from, to]) {
        const { container, unmount } = render(
          <SessionSheetFragment {...base} phase={phase} />,
        )

        for (const name of ['ready', 'focused', 'concluded', 'break']) {
          const slot = deck(container, name)
          expect(slot).toBeTruthy()
          // Every deck occupies the same cell, so the deck region's height is
          // the tallest deck's — in every phase, identically.
          expect(slot.style.gridArea).toBe('1 / 1')
        }
        unmount()
      }
    },
  )

  it('exposes exactly one deck to the accessibility tree at a time', () => {
    const base = sheetPropsFor(sessionStateMocks.running)

    for (const phase of sessionPhases) {
      const { container, unmount } = render(
        <SessionSheetFragment {...base} phase={phase} />,
      )
      const visible = Array.from(
        container.querySelectorAll('[data-kro-session-deck-visible="true"]'),
      )
      expect(visible).toHaveLength(1)

      for (const slot of container.querySelectorAll('[data-kro-session-deck]')) {
        const isVisible =
          slot.getAttribute('data-kro-session-deck-visible') === 'true'
        // Canon's `allowsHitTesting(false)` + `accessibilityHidden(true)`.
        expect(slot.getAttribute('aria-hidden')).toBe(isVisible ? null : 'true')
      }
      unmount()
    }
  })

  it('never lets a hidden deck widen the column the visible one sits in', () => {
    const { container } = render(
      <SessionSheetFragment {...sessionSheetMocks.concluded} />,
    )
    const region = container.querySelector(
      '[data-kro-session-slot="deck"]',
    ) as HTMLElement

    // A bare `1fr` is `minmax(auto, 1fr)`, so the widest deck's max-content
    // becomes the column's MINIMUM — measured at 465px inside a 360px panel,
    // which pushed every phase's copy off-centre. The `0` minimum is the fix.
    expect(region.style.gridTemplateColumns).toBe('minmax(0, 1fr)')
    for (const slot of container.querySelectorAll('[data-kro-session-deck]')) {
      expect((slot as HTMLElement).style.minWidth).toBe('0')
    }
  })

  it('keeps a concluded session’s buttons out of reach while it is still running', () => {
    render(<SessionSheetFragment {...sessionSheetMocks.running} />)
    // Present in the DOM (so the deck keeps its space) but hidden from the
    // accessibility tree, which is what `getByRole` reads.
    expect(screen.queryByRole('button', { name: /Complete Task/ })).toBeNull()
  })

  it('reserves the suggestion region even with nothing to suggest', () => {
    const { container } = render(
      <SessionSheetFragment {...sessionSheetMocks.running} />,
    )
    const region = container.querySelector(
      '[data-kro-session-suggestions="empty"]',
    ) as HTMLElement

    expect(region.style.height).toBe(`${SESSION_SLOT_HEIGHT.suggestions}px`)
    expect(region.style.opacity).toBe('0')
    expect(region.getAttribute('aria-hidden')).toBe('true')
  })

  it('fills the same region without resizing it once suggestions arrive', () => {
    const { container } = render(
      <SessionSheetFragment {...sessionSheetMocks.readyWithSuggestions} />,
    )
    const region = container.querySelector(
      '[data-kro-session-suggestions="populated"]',
    ) as HTMLElement

    expect(region.style.height).toBe(`${SESSION_SLOT_HEIGHT.suggestions}px`)
    expect(within(region).getAllByRole('button')).toHaveLength(3)
  })
})

describe('identity editing', () => {
  it('turns the title into a text field when the title itself is tapped', async () => {
    const onTapEditTitle = vi.fn()
    render(
      <SessionSheetFragment
        {...sessionSheetMocks.ready}
        onTapEditTitle={onTapEditTitle}
      />,
    )

    await userEvent.click(
      screen.getByRole('button', { name: '📊 Prepare slides' }),
    )
    expect(onTapEditTitle).toHaveBeenCalledTimes(1)
  })

  it('commits the edit on Enter', async () => {
    const onConfirmTitleEdit = vi.fn()
    render(
      <SessionSheetFragment
        {...sessionSheetMocks.editingTitle}
        onConfirmTitleEdit={onConfirmTitleEdit}
      />,
    )

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Session title' }),
      '{Enter}',
    )
    expect(onConfirmTitleEdit).toHaveBeenCalledTimes(1)
  })

  it('reverts the edit on Escape rather than committing a half-typed title', async () => {
    const onCancelTitleEdit = vi.fn()
    const onConfirmTitleEdit = vi.fn()
    render(
      <SessionSheetFragment
        {...sessionSheetMocks.editingTitle}
        onCancelTitleEdit={onCancelTitleEdit}
        onConfirmTitleEdit={onConfirmTitleEdit}
      />,
    )

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Session title' }),
      '{Escape}',
    )
    expect(onCancelTitleEdit).toHaveBeenCalledTimes(1)
    expect(onConfirmTitleEdit).not.toHaveBeenCalled()
  })

  it('opens the glyph picker from the symbol, and refuses on a break', async () => {
    const onTapSymbol = vi.fn()
    const { rerender } = render(
      <SessionSheetFragment
        {...sessionSheetMocks.ready}
        onTapSymbol={onTapSymbol}
      />,
    )

    const symbol = screen.getByRole('button', { name: 'Change session symbol' })
    expect((symbol as HTMLButtonElement).disabled).toBe(false)

    rerender(
      <SessionSheetFragment
        {...sessionSheetMocks.onBreak}
        onTapSymbol={onTapSymbol}
      />,
    )
    expect(
      (
        screen.getByRole('button', {
          name: 'Change session symbol',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)
  })
})

describe('the tomato counter', () => {
  it('hides the row entirely at zero', () => {
    const { container } = render(
      <SessionSheetFragment
        {...sessionSheetMocks.ready}
        tomatoGlyphs={0}
        tomatoOverflowLabel={null}
        completedSessionsCount={0}
      />,
    )
    expect(container.querySelector('[data-kro-session-tomatoes]')).toBeNull()
  })

  it('draws one glyph per recorded session below the cap', () => {
    render(
      <SessionSheetFragment
        {...sessionSheetMocks.ready}
        tomatoGlyphs={3}
        tomatoOverflowLabel={null}
        completedSessionsCount={3}
      />,
    )
    const row = screen.getByLabelText('3 completed sessions')
    expect(row.textContent).toBe('🍅🍅🍅')
  })

  it('caps the row at ten and appends the count beyond it', () => {
    render(<SessionSheetFragment {...sessionSheetMocks.runningTomatoOverflow} />)
    const row = screen.getByLabelText('12 completed sessions')
    expect(row.textContent).toBe(`${'🍅'.repeat(10)}× 12`)
  })
})

describe('the mode toggle', () => {
  it('offers Pomodoro alone while the stopwatch flag is off', () => {
    render(<SessionSheetFragment {...sessionSheetMocks.ready} />)
    expect(screen.getByRole('button', { name: 'Pomodoro' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Stopwatch' })).toBeNull()
  })

  it('offers both once the flag and the preference allow it', () => {
    render(<SessionSheetFragment {...sessionSheetMocks.readyEverythingOn} />)
    expect(screen.getByRole('button', { name: 'Stopwatch' })).toBeTruthy()
  })

  it('stands the toggle down once the session is live', () => {
    const { container } = render(
      <SessionSheetFragment {...sessionSheetMocks.running} />,
    )
    const toggle = container.querySelector(
      '[data-kro-session-mode-toggle]',
    ) as HTMLElement
    expect(toggle.style.pointerEvents).toBe('none')
    expect(toggle.style.opacity).toBe('0.5')
  })
})

describe('the stop menu', () => {
  it('keeps Finish Early and Abort out of the tab order until it is opened', () => {
    const { container } = render(
      <SessionSheetFragment {...sessionSheetMocks.running} />,
    )
    const menu = container.querySelector(
      '[data-kro-session-stop-menu]',
    ) as HTMLElement

    expect(menu.getAttribute('data-kro-session-stop-menu')).toBe('closed')
    expect(menu.getAttribute('aria-hidden')).toBe('true')
    expect(screen.queryByRole('button', { name: 'Finish Early' })).toBeNull()
  })

  it('finishes early from the opened menu', async () => {
    const onTapFinishEarly = vi.fn()
    render(
      <SessionSheetFragment
        {...sessionSheetMocks.running}
        onTapFinishEarly={onTapFinishEarly}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Stop session' }))
    await userEvent.click(screen.getByRole('button', { name: 'Finish Early' }))
    expect(onTapFinishEarly).toHaveBeenCalledTimes(1)
  })

  it('aborts from the opened menu, and closes it afterwards', async () => {
    const onTapAbort = vi.fn()
    const { container } = render(
      <SessionSheetFragment
        {...sessionSheetMocks.running}
        onTapAbort={onTapAbort}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Stop session' }))
    await userEvent.click(screen.getByRole('button', { name: 'Abort' }))

    expect(onTapAbort).toHaveBeenCalledTimes(1)
    expect(
      (
        container.querySelector('[data-kro-session-stop-menu]') as HTMLElement
      ).getAttribute('data-kro-session-stop-menu'),
    ).toBe('closed')
  })

  it('closes on Escape without firing either action', async () => {
    const onTapAbort = vi.fn()
    const { container } = render(
      <SessionSheetFragment
        {...sessionSheetMocks.running}
        onTapAbort={onTapAbort}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Stop session' }))
    await userEvent.keyboard('{Escape}')

    expect(onTapAbort).not.toHaveBeenCalled()
    expect(
      (
        container.querySelector('[data-kro-session-stop-menu]') as HTMLElement
      ).getAttribute('data-kro-session-stop-menu'),
    ).toBe('closed')
  })
})

describe('the close control', () => {
  it('says the session keeps running when it does', () => {
    render(<SessionSheetFragment {...sessionSheetMocks.running} />)
    expect(
      screen.getByRole('button', {
        name: 'Close session sheet (session keeps running)',
      }),
    ).toBeTruthy()
  })

  it('says plain "Close" when nothing is in flight', () => {
    render(<SessionSheetFragment {...sessionSheetMocks.ready} />)
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy()
  })

  it('renders no close at all on the /execute column, which is a page', () => {
    render(<SessionSheetFragment {...sessionSheetMocks.pausedInline} />)
    expect(screen.queryByRole('button', { name: /Close/ })).toBeNull()
  })
})

describe('the preset pills', () => {
  it('marks the pill matching the current target as pressed', () => {
    render(<SessionSheetFragment {...sessionSheetMocks.ready} />)
    expect(
      screen.getByRole('button', { name: '25m' }).getAttribute('aria-pressed'),
    ).toBe('true')
    expect(
      screen.getByRole('button', { name: '45m' }).getAttribute('aria-pressed'),
    ).toBe('false')
  })

  it('adjusts the duration in seconds when one is chosen', async () => {
    const onAdjustDuration = vi.fn()
    render(
      <SessionSheetFragment
        {...sessionSheetMocks.ready}
        onAdjustDuration={onAdjustDuration}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: '45m' }))
    expect(onAdjustDuration).toHaveBeenCalledWith(2_700)
  })

  it('hides the pills in stopwatch mode, without giving their row back', () => {
    const { container } = render(
      <SessionSheetFragment
        {...sessionSheetMocks.readyEverythingOn}
        mode="stopwatch"
      />,
    )
    const presets = container.querySelector(
      '[data-kro-session-presets]',
    ) as HTMLElement

    expect(presets.style.opacity).toBe('0')
    expect(presets.style.height).toBe(`${SESSION_SLOT_HEIGHT.deckLead}px`)
  })
})
