/** PropertyPill — render tests mirroring its gallery's three scenes. */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PROPERTY_PILL_LABEL_MAX_WIDTH, PropertyPill } from './PropertyPill'
import {
  ExpandedComfortable,
  SetAndClearable,
  Unset,
  WithShortcutHint,
} from './PropertyPill.stories'

afterEach(cleanup)

describe('PropertyPill', () => {
  it('draws a set date as two sibling buttons joined by a divider', () => {
    const { container } = render(SetAndClearable.render())
    const main = screen.getByRole('button', { name: 'Date: Today' })
    const clear = screen.getByRole('button', { name: 'Clear date' })
    expect(main.contains(clear)).toBe(false)
    expect(
      container.querySelector('[data-slot="property-pill-divider"]'),
    ).not.toBeNull()
  })

  it('caps a long repeat label so it ellipsizes instead of widening the row', () => {
    const label = 'Every 2 weeks on Monday, Wednesday and Friday'
    const { container } = render(
      <PropertyPill
        label={label}
        isSet
        isExpanded={false}
        density="compact"
        accessibilityLabel={`Repeat: ${label}`}
        onSelect={() => {}}
      />,
    )

    const span = container.querySelector(
      '[data-slot="property-pill-label"]',
    ) as HTMLElement
    expect(span.style.maxWidth).toBe(PROPERTY_PILL_LABEL_MAX_WIDTH)
    expect(span.className).toContain('truncate')
    // The full value survives the cap: tooltip and accessible name.
    expect(span.title).toBe(label)
    expect(
      screen.getByRole('button', { name: `Repeat: ${label}` }),
    ).toBeTruthy()
  })

  it('offers no clear button for an unset time', () => {
    render(Unset.render())
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Time' })).toBeTruthy()
  })

  it('reports an open editor as expanded on the main button', () => {
    render(ExpandedComfortable.render())
    expect(
      screen
        .getByRole('button', { name: 'Time' })
        .getAttribute('aria-expanded'),
    ).toBe('true')
  })

  it('routes a tap on each half to its own callback', async () => {
    const onSelect = vi.fn()
    const onClear = vi.fn()
    render(
      <PropertyPill
        label="3 of 5"
        isSet
        isExpanded={false}
        density="compact"
        accessibilityLabel="Value: 3 of 5"
        onSelect={onSelect}
        onClear={onClear}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Value: 3 of 5' }))
    await userEvent.click(screen.getByRole('button', { name: 'Clear 3 of 5' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('advertises its chord to assistive tech and as a tooltip', () => {
    render(
      <PropertyPill
        label="Value"
        isSet={false}
        isExpanded={false}
        density="compact"
        accessibilityLabel="Value, not set"
        keyShortcuts="Alt+V"
        tooltip="Value (⌥V)"
        onSelect={() => {}}
      />,
    )
    const pill = screen.getByRole('button', { name: 'Value, not set' })
    expect(pill.getAttribute('aria-keyshortcuts')).toBe('Alt+V')
    expect(pill.getAttribute('title')).toBe('Value (⌥V)')
  })

  it('floats its chord as a keycap that takes no layout space', () => {
    const { rerender } = render(WithShortcutHint.render())
    const hint = screen
      .getByRole('button', { name: 'Time' })
      .querySelector<HTMLElement>('[data-slot="button-shortcut"]')
    expect(hint?.textContent).toBe('⌥T')
    expect(hint?.getAttribute('aria-hidden')).toBe('true')
    expect(hint?.getAttribute('data-revealed')).toBe('true')

    rerender(
      <PropertyPill
        label="10:00"
        isSet
        isExpanded={false}
        density="compact"
        accessibilityLabel="Time"
        shortcutHint="⌥T"
        revealShortcutHint={false}
        onSelect={() => {}}
      />,
    )
    const hidden = screen
      .getByRole('button', { name: 'Time' })
      .querySelector<HTMLElement>('[data-slot="button-shortcut"]')
    expect(hidden?.getAttribute('data-revealed')).toBe('false')
    expect(hidden?.textContent).toBe('⌥T')
  })

  it('never lets a hint affect the pill’s layout — regression for the 680px row', () => {
    const { container } = render(WithShortcutHint.render())
    const hint = container.querySelector<HTMLElement>(
      '[data-slot="button-shortcut"]',
    )
    expect(hint?.style.position).toBe('absolute')
    expect(
      hint?.style.pointerEvents === 'none' ||
        hint?.className.includes('pointer-events-none'),
    ).toBe(true)
    expect(hint?.style.width).toBe('')
    expect(hint?.style.minWidth).toBe('')
    expect(hint?.style.visibility).toBe('')
    const pill = container.querySelector<HTMLElement>(
      '[data-slot="property-pill"]',
    )
    // The pill is the keycap's anchor, and it no longer clips it.
    expect(pill?.className).toContain('relative')
    expect(pill?.className).not.toContain('overflow-hidden')
  })

  it('fades a hidden hint rather than reserving its space', () => {
    render(
      <PropertyPill
        label="10:00"
        isSet
        isExpanded={false}
        density="compact"
        accessibilityLabel="Time"
        shortcutHint="⌥T"
        revealShortcutHint={false}
        onSelect={() => {}}
      />,
    )
    const hint = screen
      .getByRole('button', { name: 'Time' })
      .querySelector<HTMLElement>('[data-slot="button-shortcut"]')
    expect(hint?.style.opacity).toBe('0')
    expect(hint?.style.transitionDuration).toBe(
      'var(--kro-duration-quick, 180ms)',
    )
  })
})
