import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AA_TEXT } from './contrast'
import {
  ACCENT_CONTRAST_FLOOR,
  ACCENT_VAR,
  ON_ACCENT_VAR,
  applyAccentColor,
  decideAccent,
  useAccentColor,
} from './useAccentColor'

afterEach(cleanup)
afterEach(() => {
  document.documentElement.style.removeProperty(ACCENT_VAR)
  document.documentElement.style.removeProperty(ON_ACCENT_VAR)
})

describe('decideAccent', () => {
  it('puts white on a dark tint', () => {
    const decision = decideAccent('#5e6472')
    expect(decision.onAccent).toBe('#ffffff')
    expect(decision.contrast).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('puts black on a light tint — the case that breaks a hardcoded white label', () => {
    const decision = decideAccent('#b0b9d4')
    expect(decision.onAccent).toBe('#000000')
    expect(decision.contrast).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('clears AA for EVERY opaque tint a user could pick, not just the nice ones', () => {
    // The property the strategy rests on: the black and white ratios cross at
    // L=0.1791, where both measure 4.58:1. Nothing below that exists, so an
    // opaque accent is always legible. Swept rather than spot-checked so a
    // change to the maths cannot quietly break the guarantee.
    let worst = Number.POSITIVE_INFINITY
    for (let r = 0; r < 256; r += 17) {
      for (let g = 0; g < 256; g += 17) {
        for (let b = 0; b < 256; b += 17) {
          const hex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
          worst = Math.min(worst, decideAccent(hex).contrast)
        }
      }
    }
    expect(worst).toBeGreaterThanOrEqual(ACCENT_CONTRAST_FLOOR)
    expect(worst).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('refuses a translucent tint, whose contrast would depend on the backdrop', () => {
    expect(() => decideAccent('rgb(102 51 153 / 0.5)')).toThrow(/translucent/)
  })

  it('refuses a value that is not a colour', () => {
    expect(() => decideAccent('rebeccapurple')).toThrow(/not a colour/)
  })
})

describe('applyAccentColor', () => {
  it('writes both properties — an accent without its label colour is the bug', () => {
    const element = document.createElement('div')
    applyAccentColor('#663399', element)

    expect(element.style.getPropertyValue(ACCENT_VAR)).toBe('#663399')
    expect(element.style.getPropertyValue(ON_ACCENT_VAR)).toBe('#ffffff')
  })

  it('restores exactly what was there before, including nothing at all', () => {
    const element = document.createElement('div')
    const { revert } = applyAccentColor('#663399', element)
    revert()

    expect(element.style.getPropertyValue(ACCENT_VAR)).toBe('')
    expect(element.style.getPropertyValue(ON_ACCENT_VAR)).toBe('')
  })

  it('restores a previous inline accent rather than clearing it', () => {
    const element = document.createElement('div')
    element.style.setProperty(ACCENT_VAR, '#111111')
    const { revert } = applyAccentColor('#663399', element)
    revert()

    expect(element.style.getPropertyValue(ACCENT_VAR)).toBe('#111111')
  })
})

describe('useAccentColor', () => {
  it('applies the tint to the document root for as long as it is mounted', () => {
    const { unmount } = renderHook(() => useAccentColor('#663399'))

    expect(document.documentElement.style.getPropertyValue(ACCENT_VAR)).toBe(
      '#663399',
    )
    unmount()
    expect(document.documentElement.style.getPropertyValue(ACCENT_VAR)).toBe('')
  })

  it('scopes the tint when handed a target — a settings preview never re-tints the app', () => {
    const scope = document.createElement('div')
    document.body.append(scope)

    renderHook(() => useAccentColor('#0b6c6f', { target: scope }))

    expect(scope.style.getPropertyValue(ACCENT_VAR)).toBe('#0b6c6f')
    expect(document.documentElement.style.getPropertyValue(ACCENT_VAR)).toBe('')
    scope.remove()
  })

  it('leaves the default alone when the user has chosen no tint', () => {
    const { result } = renderHook(() => useAccentColor(null))

    expect(result.current).toBeNull()
    expect(document.documentElement.style.getPropertyValue(ACCENT_VAR)).toBe('')
  })

  it('computes the decision without writing when disabled — a preview before commit', () => {
    const { result } = renderHook(() =>
      useAccentColor('#b0b9d4', { enabled: false }),
    )

    expect(result.current?.onAccent).toBe('#000000')
    expect(document.documentElement.style.getPropertyValue(ACCENT_VAR)).toBe('')
  })

  it('swaps cleanly when the accent changes', () => {
    const { rerender } = renderHook(({ accent }) => useAccentColor(accent), {
      initialProps: { accent: '#663399' as string | null },
    })

    rerender({ accent: '#b0b9d4' })

    expect(document.documentElement.style.getPropertyValue(ACCENT_VAR)).toBe(
      '#b0b9d4',
    )
    expect(document.documentElement.style.getPropertyValue(ON_ACCENT_VAR)).toBe(
      '#000000',
    )
  })
})
