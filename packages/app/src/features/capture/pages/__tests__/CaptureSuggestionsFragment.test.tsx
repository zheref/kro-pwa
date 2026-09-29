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
    expect(suggestionsAddLabel(1)).toBe('Add 1 to Inbox')
    expect(suggestionsAddLabel(3)).toBe('Add 3 to Inbox')
  })

  it('arms "Add 2 to Inbox" with its ⇧⏎ key (TwoSelected)', () => {
    render(TwoSelected.render())
    expect(add().hasAttribute('disabled')).toBe(false)
    expect(add().textContent).toBe('Add 2 to Inbox⇧⏎')
    expect(add().getAttribute('aria-keyshortcuts')).toBe('Shift+Enter')
    expect(
      screen
        .getByRole('checkbox', { name: /Prepare presentation slides/ })
        .getAttribute('aria-checked'),
    ).toBe('true')
  })

  it('reveals ⌥S and never lets an event be ticked (OptionHeldWithEvents)', () => {
    render(OptionHeldWithEvents.render())
    const keycap = screen
      .getByTestId('capture-suggestions')
      .querySelector<HTMLElement>('[data-placement="keycap"]')
    expect(keycap?.textContent).toBe('⌥S')
    expect(keycap?.getAttribute('data-revealed')).toBe('true')
    expect(
      screen
        .getByRole('checkbox', { name: /Team sync meeting needs a time/ })
        .hasAttribute('disabled'),
    ).toBe(true)
  })

  it('picks on click, ticks on ⌥-click, and moves with ↑/↓, Space and ⇧Space', async () => {
    const onPick = vi.fn()
    const onToggle = vi.fn()
    render(
      <CaptureSuggestionsFragment
        suggestions={[
          captureSuggestionMocks.task,
          captureSuggestionMocks.reminder,
        ]}
        selectedIds={[]}
        inboxCount={0}
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
    await userEvent.keyboard(' ')
    expect(onPick).toHaveBeenLastCalledWith(captureSuggestionMocks.reminder.id)
    await userEvent.keyboard('{Shift>} {/Shift}')
    expect(onToggle).toHaveBeenLastCalledWith(
      captureSuggestionMocks.reminder.id,
    )
  })
})
