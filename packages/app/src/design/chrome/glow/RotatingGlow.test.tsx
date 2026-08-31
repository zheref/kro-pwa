import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_GLOW_HUES,
  GLOW_SHAPES,
  RotatingGlow,
  conicSweep,
  shouldGlowAnimate,
} from './RotatingGlow'

afterEach(cleanup)

/**
 * The glow has three contracts worth asserting, and they are exactly the three
 * the issue's acceptance criterion 2 names: it is a TWO-HUE sweep, it STOPS
 * under reduced motion, and it NEVER blocks a click on the button it decorates.
 *
 * What is deliberately not asserted: how it looks. Blur, falloff and the
 * mask's cut-out are a browser's answers, and the stories are where those get
 * judged.
 */

describe('the sweep is two hues, and closes on itself', () => {
  it('defaults to canon`s ringEmerald -> glowLime pair', () => {
    // The reason the pair matters is in the component's header: one hue rotates
    // invisibly, so a single-colour glow reads as a pulse, not as travel.
    expect(DEFAULT_GLOW_HUES).toEqual(['ringEmerald', 'glowLime'])
  })

  it('repeats the first stop so the ramp has no seam at 0 degrees', () => {
    expect(conicSweep(['ringEmerald', 'glowLime'])).toBe(
      'conic-gradient(from 0deg, var(--kro-color-ring-emerald), var(--kro-color-glow-lime), var(--kro-color-ring-emerald))',
    )
  })

  it('leaves an already-closed ramp alone rather than repeating the stop twice', () => {
    const sweep = conicSweep(['ringEmerald', 'glowLime', 'ringEmerald'])
    expect(sweep.match(/ring-emerald/g)).toHaveLength(2)
  })

  it('still makes a gradient out of a single role — one stop is not a gradient', () => {
    expect(conicSweep(['ringEmerald'])).toBe(
      'conic-gradient(from 0deg, var(--kro-color-ring-emerald), var(--kro-color-ring-emerald))',
    )
  })

  it('paints tokens, never literals, so the dark palette carries through', () => {
    const sweep = conicSweep(['ringEmerald', 'glowLime'])
    expect(sweep).not.toMatch(/#[0-9a-f]{3,8}/i)
  })
})

describe('shouldGlowAnimate — the decision, isolated from the DOM', () => {
  it('turns for an active glow with a real revolution time', () => {
    expect(
      shouldGlowAnimate({ isActive: true, reduceMotion: false, secondsPerRevolution: 4 }),
    ).toBe(true)
  })

  it('settles still when the user has asked for reduced motion', () => {
    // A slow endless rotation is exactly what Reduce Motion exists to stop.
    expect(
      shouldGlowAnimate({ isActive: true, reduceMotion: true, secondsPerRevolution: 4 }),
    ).toBe(false)
  })

  it('does not turn when the glow is switched off outright', () => {
    expect(
      shouldGlowAnimate({ isActive: false, reduceMotion: false, secondsPerRevolution: 4 }),
    ).toBe(false)
  })

  it('holds at 0 degrees when the caller asks for no revolution', () => {
    expect(
      shouldGlowAnimate({ isActive: true, reduceMotion: false, secondsPerRevolution: 0 }),
    ).toBe(false)
  })
})

describe('the glow never intercepts a pointer — acceptance criterion 2', () => {
  it('marks every band pointer-transparent, so a click reaches the button beneath', () => {
    render(
      <RotatingGlow shape={GLOW_SHAPES.circle}>
        <button type="button">Quick add</button>
      </RotatingGlow>,
    )

    const bands = document.querySelectorAll('[data-kro-glow-band]')
    expect(bands.length).toBeGreaterThan(0)
    for (const band of bands) {
      expect((band as HTMLElement).style.pointerEvents).toBe('none')
    }
  })

  it('sits behind the content rather than over it', () => {
    render(
      <RotatingGlow>
        <button type="button">Quick add</button>
      </RotatingGlow>,
    )

    const band = document.querySelector('[data-kro-glow-band]') as HTMLElement
    expect(band.style.zIndex).toBe('-1')
  })

  it('lets the decorated button still be clicked — the user taps the FAB', async () => {
    const onClick = vi.fn()
    render(
      <RotatingGlow>
        <button type="button" onClick={onClick}>
          Quick add
        </button>
      </RotatingGlow>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Quick add' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('hides the bands from assistive technology — they carry no meaning', () => {
    render(
      <RotatingGlow>
        <button type="button">Quick add</button>
      </RotatingGlow>,
    )

    for (const band of document.querySelectorAll('[data-kro-glow-band]')) {
      expect(band.getAttribute('aria-hidden')).toBe('true')
    }
  })
})

describe('isActive removes the glow rather than freezing it', () => {
  it('draws no band at all when switched off — canon`s isActive: false', () => {
    render(
      <RotatingGlow isActive={false}>
        <button type="button">Quick add</button>
      </RotatingGlow>,
    )

    expect(document.querySelectorAll('[data-kro-glow-band]')).toHaveLength(0)
    expect(document.querySelector('[data-kro-glow]')?.getAttribute('data-kro-glow')).toBe(
      'off',
    )
  })

  it('keeps the decorated content mounted either way', () => {
    render(
      <RotatingGlow isActive={false}>
        <button type="button">Quick add</button>
      </RotatingGlow>,
    )

    expect(screen.getByRole('button', { name: 'Quick add' })).toBeDefined()
  })
})
