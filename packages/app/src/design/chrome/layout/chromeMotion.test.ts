import { describe, expect, it } from 'vitest'
import { springDisplacement } from '../../system/motion/motion'
import {
  CHROME_SPRINGS,
  SAMPLE_COUNT,
  SETTLE_RESIDUAL,
  TOAST_LIFT,
  settleMs,
  springEasing,
  springTransition,
} from './chromeMotion'

/**
 * The chrome springs are generated, so what is worth testing is that they are
 * still the springs KroApple wrote — and that the generator has not quietly
 * started producing a curve that is not a spring at all.
 */

describe('the springs are KroApple`s, at the call sites they came from', () => {
  it('animates the toast on ActiveToastModifier`s 0.4 / 0.8', () => {
    expect(CHROME_SPRINGS.toast).toEqual({
      response: 0.4,
      dampingFraction: 0.8,
    })
  })

  it('opens the FAB menu slower than it snaps shut — canon`s two springs', () => {
    // LiquidGlassFABMenu: 0.32/0.78 to toggle, 0.28/0.82 after a choice.
    expect(CHROME_SPRINGS.menuExpand).toEqual({
      response: 0.32,
      dampingFraction: 0.78,
    })
    expect(CHROME_SPRINGS.menuCollapse).toEqual({
      response: 0.28,
      dampingFraction: 0.82,
    })
    expect(settleMs(CHROME_SPRINGS.menuCollapse)).toBeLessThan(
      settleMs(CHROME_SPRINGS.menuExpand),
    )
  })

  it('sweeps the rings on ActivityRings` 0.5 / 0.8', () => {
    expect(CHROME_SPRINGS.rings).toEqual({
      response: 0.5,
      dampingFraction: 0.8,
    })
  })

  it('moves the lift on a plain ease, not a spring — it must not overshoot into the pill', () => {
    expect(TOAST_LIFT.ms).toBe(220)
    expect(TOAST_LIFT.easing).not.toContain('linear(')
  })
})

describe('settleMs is the point the spring is done, not the perceptual duration', () => {
  it('runs past the perceptual duration, because a spring is still settling there', () => {
    // The failure this guards: pairing the spring curve with the 400ms
    // `response` cuts the overshoot off mid-flight.
    for (const spring of Object.values(CHROME_SPRINGS)) {
      expect(settleMs(spring)).toBeGreaterThan(spring.response * 1000)
    }
  })

  it('leaves the spring under the same 0.2% residual the token springs use', () => {
    for (const spring of Object.values(CHROME_SPRINGS)) {
      const t = settleMs(spring) / 1000
      const envelope = Math.exp(
        -spring.dampingFraction * ((2 * Math.PI) / spring.response) * t,
      )
      expect(envelope).toBeLessThanOrEqual(SETTLE_RESIDUAL + 1e-9)
    }
  })
})

describe('springEasing emits a curve that still describes the spring', () => {
  it('regenerates every stop from springDisplacement — a hand-edit fails here', () => {
    const spring = CHROME_SPRINGS.toast
    const settleSeconds = settleMs(spring) / 1000
    const expected = Array.from({ length: SAMPLE_COUNT }, (_, index) => {
      if (index === SAMPLE_COUNT - 1) return '1'
      const t = (index / (SAMPLE_COUNT - 1)) * settleSeconds
      const value = springDisplacement(t, {
        duration: spring.response,
        bounce: 1 - spring.dampingFraction,
      })
      return Number(value.toFixed(4)).toString()
    })

    expect(springEasing(spring)).toBe(`linear(${expected.join(', ')})`)
  })

  it('starts at rest and finishes at rest', () => {
    const stops = springEasing(CHROME_SPRINGS.rings)
      .replace('linear(', '')
      .replace(')', '')
      .split(', ')
      .map(Number)

    expect(stops[0]).toBe(0)
    expect(stops[stops.length - 1]).toBe(1)
  })

  it('overshoots — an underdamped spring that never passes 1 is not a spring', () => {
    const stops = springEasing(CHROME_SPRINGS.toast)
      .replace('linear(', '')
      .replace(')', '')
      .split(', ')
      .map(Number)

    expect(Math.max(...stops)).toBeGreaterThan(1)
  })
})

describe('springTransition hands a component a matched duration and curve', () => {
  it('pairs the named spring`s settle time with its own easing', () => {
    const transition = springTransition('menuExpand', ['opacity', 'transform'])

    expect(transition.transitionProperty).toBe('opacity, transform')
    expect(transition.transitionDuration).toBe(
      `${settleMs(CHROME_SPRINGS.menuExpand)}ms`,
    )
    expect(transition.transitionTimingFunction).toBe(
      springEasing(CHROME_SPRINGS.menuExpand),
    )
  })
})
