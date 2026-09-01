import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CHROME_LAYOUT } from '../layout/chromeLayout'
import { FAB_GLYPH_SIZE, LiquidGlassFAB } from './LiquidGlassFAB'

afterEach(cleanup)

describe('LiquidGlassFAB', () => {
  it('draws the disc at canon`s 62pt', () => {
    render(<LiquidGlassFAB glyph="plus" accessibilityLabel="Quick add" />)

    const fab = screen.getByRole('button', { name: 'Quick add' })
    expect(fab.style.width).toBe(`${CHROME_LAYOUT.fabDiameter}px`)
    expect(fab.style.height).toBe(`${CHROME_LAYOUT.fabDiameter}px`)
  })

  it('is named by its action, because a bare glyph names nothing', () => {
    render(
      <LiquidGlassFAB glyph="magnifyingglass" accessibilityLabel="Search" />,
    )

    // The glyph itself is hidden — a screen reader that announced both would
    // read the icon's own name alongside the action's.
    expect(screen.getByRole('button', { name: 'Search' })).toBeDefined()
  })

  it('takes a per-context glyph, which is how one FAB serves Plan, Do and Earn', () => {
    const { rerender } = render(
      <LiquidGlassFAB glyph="plus" accessibilityLabel="Quick add" />,
    )
    const first = screen.getByRole('button').innerHTML

    rerender(<LiquidGlassFAB glyph="bell" accessibilityLabel="Remind me" />)

    expect(screen.getByRole('button').innerHTML).not.toBe(first)
  })

  it('asks glass.css for the material instead of reimplementing it', () => {
    render(<LiquidGlassFAB glyph="plus" accessibilityLabel="Quick add" />)

    const className = screen.getByRole('button').className
    expect(className).toContain('kro-glass')
    // `control`, not `surface`: a 20px blur behind a 24px glyph reads smeared.
    expect(className).toContain('kro-glass--control')
  })

  it('is a disc, not a rounded square — the icon size`s corners are overridden', () => {
    // Inline rather than a utility on purpose: `twMerge` cannot merge
    // `rounded-kro-field` away, because `kro-field` is a project theme value it
    // has no config for. An inline radius wins outright.
    render(<LiquidGlassFAB glyph="plus" accessibilityLabel="Quick add" />)

    expect(screen.getByRole('button').style.borderRadius).toBe('50%')
  })

  it('drops the glass variant`s horizontal padding, which is for a labelled pill', () => {
    render(<LiquidGlassFAB glyph="plus" accessibilityLabel="Quick add" />)

    expect(screen.getByRole('button').style.padding).toBe('0px')
  })

  it('is not a submit button, so a FAB inside a form does not submit it', () => {
    render(<LiquidGlassFAB glyph="plus" accessibilityLabel="Quick add" />)

    expect(screen.getByRole('button')).toHaveProperty('type', 'button')
  })

  it('fires its action when tapped', async () => {
    const onClick = vi.fn()
    render(
      <LiquidGlassFAB
        glyph="plus"
        accessibilityLabel="Quick add"
        onClick={onClick}
      />,
    )

    await userEvent.click(screen.getByRole('button'))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not fire while disabled, and fades exactly once', async () => {
    const onClick = vi.fn()
    render(
      <LiquidGlassFAB
        glyph="plus"
        accessibilityLabel="Quick add"
        disabled
        onClick={onClick}
      />,
    )

    const fab = screen.getByRole('button')
    await userEvent.click(fab)

    expect(onClick).not.toHaveBeenCalled()
    // Two fades multiply to ~0.38 and drop the control under the 3:1 floor.
    const fades = fab.className
      .split(/\s+/)
      .filter(
        (token) => token === 'disabled:opacity-[var(--kro-opacity-disabled)]',
      )
    expect(fades).toHaveLength(1)
  })

  it('draws the glyph at canon`s 24pt rather than the button base`s 20', () => {
    render(<LiquidGlassFAB glyph="plus" accessibilityLabel="Quick add" />)

    expect(FAB_GLYPH_SIZE).toBe(24)
    // `size-6` is the 24px utility, and its presence is also what makes
    // Button's `svg:not([class*='size-'])` default stand down.
    expect(
      screen.getByRole('button').querySelector('svg')?.getAttribute('class'),
    ).toContain('size-6')
  })

  it('lets a surface override the diameter without losing the shape', () => {
    render(
      <LiquidGlassFAB glyph="plus" accessibilityLabel="Quick add" size={48} />,
    )

    const fab = screen.getByRole('button')
    expect(fab.style.width).toBe('48px')
    expect(fab.style.height).toBe('48px')
  })
})
