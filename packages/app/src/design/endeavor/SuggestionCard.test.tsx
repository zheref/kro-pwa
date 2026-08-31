import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SuggestionCard,
  suggestionActionIcon,
  suggestionIcon,
  suggestionSources,
} from './SuggestionCard'
import { isMappedSymbol } from './endeavorIcons'

afterEach(cleanup)

const model = {
  title: 'Google Calendar',
  subtitle: 'See all your events in one place.',
  actionTitle: 'Connect',
  source: 'googleCalendar',
} as const

describe('SuggestionCard', () => {
  it('shows the hint and its call to action', () => {
    render(<SuggestionCard model={model} onAction={() => undefined} />)

    expect(screen.getByText('Google Calendar')).not.toBeNull()
    expect(screen.getByRole('button', { name: /Connect/ })).not.toBeNull()
  })

  it('raises its action once per click', async () => {
    const onAction = vi.fn()
    render(<SuggestionCard model={model} onAction={onAction} />)

    await userEvent.click(screen.getByRole('button', { name: /Connect/ }))
    expect(onAction).toHaveBeenCalledOnce()
  })

  it('refuses the double-tap while a flow is in flight', async () => {
    const onAction = vi.fn()
    render(<SuggestionCard model={model} isActionDisabled onAction={onAction} />)

    await userEvent.click(screen.getByRole('button', { name: /Connect/ }))
    expect(onAction).not.toHaveBeenCalled()
  })

  it('applies the disabled fade EXACTLY once — two fades drop below the 3:1 floor', () => {
    render(<SuggestionCard model={model} isActionDisabled onAction={() => undefined} />)

    const className = screen.getByRole('button', { name: /Connect/ }).className
    const fades = className
      .split(/\s+/)
      .filter((token) => token === 'disabled:opacity-[var(--kro-opacity-disabled)]')
    expect(fades).toHaveLength(1)
  })

  it('is carousel-width by default and full-width when the surface stacks it', () => {
    const { container, rerender } = render(
      <SuggestionCard model={model} onAction={() => undefined} />,
    )
    const card = () =>
      container.querySelector('[data-slot="suggestion-card"]') as HTMLElement

    expect(card().className).toContain('min-w-70')
    expect(card().className).toContain('max-w-85')

    rerender(<SuggestionCard model={model} fillsWidth onAction={() => undefined} />)
    expect(card().className).toContain('w-full')
  })

  it('keeps the 80px height canon fixes for the carousel row', () => {
    const { container } = render(<SuggestionCard model={model} onAction={() => undefined} />)

    const card = container.querySelector('[data-slot="suggestion-card"]') as HTMLElement
    expect(card.className).toContain('h-20')
  })

  it('lets the button yield before the title does — the layout priority canon calls out', () => {
    // Canon's `layoutPriority(1)` on the text column: the title is the LAST
    // thing compressed and the CTA gives way first. Flexbox has no priority,
    // so it is expressed as which item may shrink — and getting that backwards
    // (`min-w-0 flex-1` on the text, `shrink-0` on the button) is the bug that
    // truncates "Connect Goo…" beside a full-size button.
    const { container } = render(<SuggestionCard model={model} onAction={() => undefined} />)

    const text = container.querySelector(
      '[data-slot="suggestion-card-text"]',
    ) as HTMLElement
    expect(text.className).toContain('shrink-0')
    expect(text.className).toContain('grow')
    // `flex-1` is the `flex: 1 1 0%` shorthand and would restore `flex-shrink: 1`
    // on the very column that must not shrink.
    expect(text.className.split(/\s+/)).not.toContain('flex-1')

    const action = screen.getByRole('button', { name: /Connect/ }).className.split(/\s+/)
    expect(action).toContain('shrink')
    expect(action).toContain('min-w-0')
    expect(action).not.toContain('shrink-0')
  })

  it('truncates the CTA’s own label rather than letting it push the title', () => {
    render(
      <SuggestionCard
        model={{ ...model, actionTitle: 'Connect your Google account' }}
        onAction={() => undefined}
      />,
    )

    const label = screen.getByText('Connect your Google account')
    expect(label.className).toContain('truncate')
  })

  it('gives every source a drawable icon and action icon', () => {
    for (const source of suggestionSources) {
      expect(isMappedSymbol(suggestionIcon(source)), `${source} icon`).toBe(true)
      expect(isMappedSymbol(suggestionActionIcon(source)), `${source} action`).toBe(true)
    }
  })
})
