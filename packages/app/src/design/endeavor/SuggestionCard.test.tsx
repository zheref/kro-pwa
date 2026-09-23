import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SUGGESTION_CARD_MAX_WIDTH_PX,
  SUGGESTION_CARD_MIN_WIDTH_PX,
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
    render(
      <SuggestionCard model={model} isActionDisabled onAction={onAction} />,
    )

    await userEvent.click(screen.getByRole('button', { name: /Connect/ }))
    expect(onAction).not.toHaveBeenCalled()
  })

  it('applies the disabled fade EXACTLY once — two fades drop below the 3:1 floor', () => {
    render(
      <SuggestionCard
        model={model}
        isActionDisabled
        onAction={() => undefined}
      />,
    )

    const className = screen.getByRole('button', { name: /Connect/ }).className
    const fades = className
      .split(/\s+/)
      .filter(
        (token) => token === 'disabled:opacity-[var(--kro-opacity-disabled)]',
      )
    expect(fades).toHaveLength(1)
  })

  it('is carousel-width by default and full-width when the surface stacks it', () => {
    const { container, rerender } = render(
      <SuggestionCard model={model} onAction={() => undefined} />,
    )
    const card = () =>
      container.querySelector('[data-slot="suggestion-card"]') as HTMLElement

    expect(card().style.minWidth).toBe(`${SUGGESTION_CARD_MIN_WIDTH_PX}px`)
    expect(card().style.maxWidth).toBe(`${SUGGESTION_CARD_MAX_WIDTH_PX}px`)
    expect(card().className).not.toContain('w-full')

    rerender(
      <SuggestionCard model={model} fillsWidth onAction={() => undefined} />,
    )
    expect(card().className).toContain('w-full')
    expect(card().style.minWidth).toBe('')
  })

  it('is canon`s 80pt carousel card, not a taller stacked banner', () => {
    const { container } = render(
      <SuggestionCard model={model} onAction={() => undefined} />,
    )

    const card = container.querySelector(
      '[data-slot="suggestion-card"]',
    ) as HTMLElement
    expect(card.className).toContain('min-h-20')
    expect(card.className).toContain('p-kro-medium')
    expect(card.className).toContain('gap-kro-small')
  })

  it('lets the button yield before the title does — the layout priority canon calls out', () => {
    // Canon's `layoutPriority(1)` on the text column: the title is the LAST
    // thing compressed and the CTA gives way first. Flexbox has no priority,
    // so it is expressed as which item may shrink — and getting that backwards
    // (`min-w-0 flex-1` on the text, `shrink-0` on the button) is the bug that
    // truncates "Connect Goo…" beside a full-size button.
    const { container } = render(
      <SuggestionCard model={model} onAction={() => undefined} />,
    )

    const text = container.querySelector(
      '[data-slot="suggestion-card-text"]',
    ) as HTMLElement
    expect(text.className).toContain('shrink-0')
    expect(text.className).toContain('grow')
    // `flex-1` is the `flex: 1 1 0%` shorthand and would restore `flex-shrink: 1`
    // on the very column that must not shrink.
    expect(text.className.split(/\s+/)).not.toContain('flex-1')

    const action = screen
      .getByRole('button', { name: /Connect/ })
      .className.split(/\s+/)
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
      expect(isMappedSymbol(suggestionIcon(source)), `${source} icon`).toBe(
        true,
      )
      expect(
        isMappedSymbol(suggestionActionIcon(source)),
        `${source} action`,
      ).toBe(true)
    }
  })

  it('is about a third wider than canon`s 280–340 carousel', () => {
    expect(SUGGESTION_CARD_MIN_WIDTH_PX).toBe(Math.round((280 * 4) / 3))
    expect(SUGGESTION_CARD_MAX_WIDTH_PX).toBe(Math.round((340 * 4) / 3))
  })

  it('defaults the CTA to the compact button', () => {
    render(<SuggestionCard model={model} onAction={() => undefined} />)

    const action = screen.getByRole('button', { name: /Connect/ })
    expect(action.getAttribute('data-slot')).toBe('button')
    expect(action.getAttribute('data-size')).toBe('sm')
    expect(action.className).toContain('h-7')
    expect(action.className).toContain('w-full')
    expect(action.className).not.toContain('kro-glass')
    expect(action.style.backgroundColor).toBe('var(--kro-color-fore)')
    expect(action.style.color).toBe('var(--kro-color-absolute)')
    expect(action.querySelector('svg')).toBeNull()
    expect(
      screen.getByTestId('google-calendar-mark').getAttribute('class'),
    ).toContain('mr-kro-small')
    expect(
      screen.getByTestId('google-calendar-mark').getAttribute('viewBox'),
    ).toBe('0 0 800 859.0954')
    const card = document.querySelector(
      '[data-slot="suggestion-card"]',
    ) as HTMLElement
    expect(card.dataset.density).toBe('compact')
    expect(card.style.boxShadow).toBe('inset 0 0 0 1px var(--kro-glass-rim)')
    expect(card.style.boxShadow).not.toContain('shadow')
  })

  it('puts Dismiss under Connect as a word, not a second shaped control', () => {
    const onDismiss = vi.fn()
    render(
      <SuggestionCard
        model={model}
        onAction={() => undefined}
        onDismiss={onDismiss}
      />,
    )

    const dismiss = screen.getByRole('button', { name: 'Dismiss' })
    const connect = screen.getByRole('button', { name: /Connect/ })
    expect(dismiss.className).not.toContain('kro-glass')
    expect(dismiss.className).toContain('h-7')
    expect(dismiss.className).toContain('w-full')
    expect(dismiss.className).toContain('justify-center')
    expect(connect.className).toContain('w-full')
    expect(connect.parentElement).toBe(dismiss.parentElement)
    const card = document.querySelector('[data-slot="suggestion-card"]')
    expect(card?.contains(dismiss)).toBe(true)
  })

  it('uses the 44px floor when the surface asks for comfortable density', () => {
    render(
      <SuggestionCard
        model={model}
        density="comfortable"
        onAction={() => undefined}
      />,
    )

    expect(
      screen.getByRole('button', { name: /Connect/ }).getAttribute('data-size'),
    ).toBe('lg')
  })
})
