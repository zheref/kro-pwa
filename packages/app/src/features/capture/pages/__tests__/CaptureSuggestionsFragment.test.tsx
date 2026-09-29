/** The suggestions pane — render tests mirroring its three stories (`RC-11`). */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CAPTURE_SUGGESTIONS } from '../../CaptureSuggestions'
import { CAPTURE_MOCK_NOW, captureSuggestionMocks } from '../../CaptureMocks'
import {
  CaptureSuggestionsFragment,
  suggestionsAddLabel,
} from '../CaptureSuggestionsFragment'
import {
  NothingSelected,
  OptionHeldWithEvents,
  TwoSelected,
} from '../CaptureSuggestionsFragment.stories'

afterEach(cleanup)

const add = () => screen.getByTestId('capture-suggestions-add')

describe('the suggestions pane', () => {
  it('lists every suggestion as a row and never reads "Add 0" (NothingSelected)', () => {
    render(NothingSelected.render())
    expect(document.querySelectorAll('[data-kro-row-pick]')).toHaveLength(
      CAPTURE_SUGGESTIONS.length,
    )
    expect(
      document.querySelectorAll('[data-slot="endeavor-row"]'),
    ).toHaveLength(CAPTURE_SUGGESTIONS.length)
    expect(add().hasAttribute('disabled')).toBe(true)
    expect(add().textContent).toBe('Select to add')
    expect(add().textContent).not.toContain('0')
    expect(add().hasAttribute('aria-keyshortcuts')).toBe(false)
  })

  it('labels the action for one, many and none', () => {
    expect(suggestionsAddLabel(0)).toBe('Select to add')
    expect(suggestionsAddLabel(1)).toBe('Add 1')
    expect(suggestionsAddLabel(3)).toBe('Add 3')
  })

  it('arms "Add 2" with its ⇧⏎ key (TwoSelected)', () => {
    render(TwoSelected.render())
    expect(add().hasAttribute('disabled')).toBe(false)
    expect(add().textContent).toBe('Add 2⇧⏎')
    expect(add().getAttribute('aria-keyshortcuts')).toBe('Shift+Enter')
    expect(
      screen
        .getByRole('checkbox', { name: /Prepare presentation slides/ })
        .getAttribute('aria-checked'),
    ).toBe('true')
  })

  it('reveals ⌥S and lets an event be ticked like any card (OptionHeldWithEvents)', () => {
    render(OptionHeldWithEvents.render())
    const keycap = screen
      .getByTestId('capture-suggestions')
      .querySelector<HTMLElement>('[data-placement="keycap"]')
    expect(keycap?.textContent).toBe('⌥S')
    expect(keycap?.getAttribute('data-revealed')).toBe('true')
    expect(
      screen
        .getByRole('checkbox', { name: 'Select Team sync meeting' })
        .hasAttribute('disabled'),
    ).toBe(false)
    expect(
      document.querySelectorAll('[data-slot="endeavor-row-emoji-box"]'),
    ).toHaveLength(4)
  })

  it('picks on click, ticks on ⌥-click, Space or ⇧Space, and moves with ↑/↓', async () => {
    const onPick = vi.fn()
    const onToggle = vi.fn()
    render(
      <CaptureSuggestionsFragment
        suggestions={[
          captureSuggestionMocks.task,
          captureSuggestionMocks.reminder,
        ]}
        selectedIds={[]}
        addCount={0}
        revealChord={false}
        now={CAPTURE_MOCK_NOW}
        onPick={onPick}
        onToggle={onToggle}
        onAddSelected={() => {}}
      />,
    )
    const first = document.querySelector<HTMLElement>('[data-kro-row-pick]')
    await userEvent.click(first as HTMLElement)
    expect(onPick).toHaveBeenLastCalledWith(captureSuggestionMocks.task.id)

    fireEvent.click(first as HTMLElement, { altKey: true })
    expect(onToggle).toHaveBeenLastCalledWith(captureSuggestionMocks.task.id)

    first?.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement?.getAttribute('data-kro-row-pick')).toBe(
      captureSuggestionMocks.reminder.id,
    )
    const picks = onPick.mock.calls.length
    await userEvent.keyboard(' ')
    expect(onToggle).toHaveBeenLastCalledWith(
      captureSuggestionMocks.reminder.id,
    )
    expect(onPick.mock.calls.length).toBe(picks)
    await userEvent.keyboard('{Shift>} {/Shift}')
    expect(onToggle).toHaveBeenCalledTimes(3)
  })

  it('lays the cards out as a grid and moves by card with ← / →', async () => {
    render(NothingSelected.render())
    const grid = screen.getByRole('group', { name: 'Suggested endeavors' })
    expect(grid.style.gridTemplateColumns).toBe(
      'repeat(auto-fill, minmax(280px, 1fr))',
    )
    const cards = document.querySelectorAll<HTMLElement>('[data-kro-row-pick]')
    cards[1]?.focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(cards[0])
    await userEvent.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(cards[0])
    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    expect(document.activeElement).toBe(cards[2])
  })
})

describe('the suggestions grid spacing', () => {
  it('keeps rows and columns equally apart, with room at the scroller edges', () => {
    render(NothingSelected.render())
    const grid = screen.getByRole('group', { name: 'Suggested endeavors' })
    expect(grid.style.rowGap).toBe('var(--kro-space-small)')
    expect(grid.style.columnGap).toBe('var(--kro-space-small)')
    expect(grid.style.padding).toBe(
      'var(--kro-space-small) var(--kro-space-tiny) var(--kro-space-medium)',
    )
    // The pane itself has no bottom padding — the inset scrolls with the list.
    expect(screen.getByTestId('capture-suggestions').style.padding).toBe(
      'var(--kro-space-medium) var(--kro-space-medium) 0',
    )
    // Scrolls without a visible scrollbar.
    expect(grid.className).toContain('[scrollbar-width:none]')
    expect(grid.className).toContain('[&::-webkit-scrollbar]:hidden')
  })

  it('keeps each card title on one line', () => {
    render(NothingSelected.render())
    const title = document.querySelector<HTMLElement>(
      '[data-slot="endeavor-row"] p',
    )
    expect(title?.style.webkitLineClamp).toBe('1')
  })

  it('titles the pane with a real heading', () => {
    render(NothingSelected.render())
    const heading = screen.getByRole('heading', {
      name: 'Suggestions',
      level: 2,
    })
    expect(heading.className).toContain('text-base')
    expect(heading.style.color).toBe('var(--kro-color-fore)')
  })
})

describe('the pane’s glass rim', () => {
  it('draws the rim on an overlay above a clipped content layer', () => {
    render(NothingSelected.render())
    const pane = screen.getByTestId('capture-suggestions')
    const rim = pane.querySelector<HTMLElement>(
      '[data-slot="capture-suggestions-rim"]',
    )
    const grid = screen.getByRole('group', { name: 'Suggested endeavors' })
    expect(pane.className).toContain('overflow-hidden')
    expect(rim?.className).toContain('z-[2]')
    expect(rim?.className).toContain('pointer-events-none')
    expect(rim?.style.boxShadow).toBe('var(--kro-glass-light-rim)')
    expect(rim?.style.borderRadius).toBe('inherit')
    expect(grid.className).toContain('z-[1]')
    expect(grid.style.backgroundColor).toBe('')
  })
})
