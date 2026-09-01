import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  ChipFlow,
  KroChip,
  chipTintVar,
  colorTint,
  semanticTint,
} from './KroChip'

afterEach(cleanup)

describe('KroChip', () => {
  it('always prints its label, so colour is never the only signal', () => {
    render(<KroChip title="Blocked" tint={semanticTint('statusBlocked')} />)
    expect(screen.getByText('Blocked')).not.toBeNull()
  })

  it('pairs the label with a glyph when one is given, and hides it from readers', () => {
    const { container } = render(
      <KroChip
        title="Task"
        icon="checkmark.circle.fill"
        tint={semanticTint('kindTask')}
      />,
    )

    const glyph = container.querySelector('svg')
    expect(glyph).not.toBeNull()
    expect(glyph?.getAttribute('aria-hidden')).toBe('true')
  })

  it('inverts the prominent label with the scheme, never fixes it to white', () => {
    // The badge tokens are a deep variant in light and a bright variant in dark,
    // so a fixed white label falls to about 2.2:1 on the dark one. `absolute` is
    // the token whose whole job is "white in light, black in dark".
    const { container } = render(
      <KroChip
        title="Event"
        tint={semanticTint('kindEvent')}
        emphasis="prominent"
      />,
    )

    const chip = container.querySelector(
      '[data-emphasis="prominent"]',
    ) as HTMLElement
    expect(chip.style.color).toContain('--kro-color-absolute')
    expect(chip.style.backgroundColor).toContain('--kro-role-kind-event')
  })

  it('fills a soft chip at 16% and paints the label in the tint itself', () => {
    const { container } = render(
      <KroChip title="Pending" tint={semanticTint('statusPending')} />,
    )

    const chip = container.querySelector(
      '[data-emphasis="soft"]',
    ) as HTMLElement
    expect(chip.style.backgroundColor).toContain('16%')
    expect(chip.style.color).toContain('--kro-role-status-pending')
  })

  it('draws an outline chip as a ring with no fill', () => {
    const { container } = render(
      <KroChip
        title="Unavailable"
        tint={colorTint('badgeNeutral')}
        emphasis="outline"
      />,
    )

    const chip = container.querySelector(
      '[data-emphasis="outline"]',
    ) as HTMLElement
    expect(chip.style.backgroundColor).toBe('')
    expect(chip.style.boxShadow).toContain('inset')
  })

  it('shrinks its glyph and label together at the small size', () => {
    const { container } = render(
      <KroChip
        title="Engaging"
        icon="tag"
        tint={colorTint('accent')}
        size="small"
      />,
    )

    const chip = container.querySelector('[data-emphasis]') as HTMLElement
    expect(chip.className).toContain('text-[11px]')
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('9')
  })
})

describe('chipTintVar', () => {
  it('resolves a semantic role to its role variable', () => {
    expect(chipTintVar(semanticTint('kindHabit'))).toBe(
      'var(--kro-role-kind-habit)',
    )
  })

  it('resolves a base palette role to its colour variable', () => {
    expect(chipTintVar(colorTint('badgeMint'))).toBe(
      'var(--kro-color-badge-mint)',
    )
  })
})

describe('ChipFlow', () => {
  it('wraps rather than clipping — a tag that scrolls off-screen is a discoverability bug', () => {
    const { container } = render(
      <ChipFlow>
        <KroChip title="One" tint={colorTint('accent')} />
        <KroChip title="Two" tint={colorTint('accent')} />
      </ChipFlow>,
    )

    const flow = container.firstElementChild as HTMLElement
    expect(flow.className).toContain('flex-wrap')
    expect(flow.className).not.toContain('overflow-x')
  })

  it('renders every chip it is given', () => {
    render(
      <ChipFlow>
        {['One', 'Two', 'Three'].map((title) => (
          <KroChip key={title} title={title} tint={colorTint('accent')} />
        ))}
      </ChipFlow>,
    )

    expect(screen.getByText('Three')).not.toBeNull()
  })
})
