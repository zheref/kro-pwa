import { describe, expect, it } from 'vitest'
import {
  composite,
  contrastRatio,
  parseColor,
  ratioBetween,
  relativeLuminance,
  withAlpha,
} from './contrast'

describe('parseColor', () => {
  it('reads six-digit hex, the notation tokens.css is written in', () => {
    expect(parseColor('#1a5bc7')).toEqual({
      r: 26 / 255,
      g: 91 / 255,
      b: 199 / 255,
      a: 1,
    })
  })

  it('expands the three-digit shorthand', () => {
    expect(parseColor('#fff')).toEqual(parseColor('#ffffff'))
  })

  it('reads the eight-digit form as carrying alpha', () => {
    expect(parseColor('#00000080').a).toBeCloseTo(0.502, 3)
  })

  it('reads the modern rgb() slash-alpha form used by the glass tokens', () => {
    const parsed = parseColor('rgb(255 255 255 / 0.55)')
    expect(parsed.r).toBe(1)
    expect(parsed.a).toBeCloseTo(0.55, 5)
  })

  it('reads the legacy comma form', () => {
    expect(parseColor('rgba(0, 0, 0, 0.14)').a).toBeCloseTo(0.14, 5)
  })

  it('refuses a value it cannot measure rather than reporting a ratio for it', () => {
    // The Swift original asserts `getRed(...)` succeeded for exactly this
    // reason: a failed conversion left 0/0/0 and passed as "black".
    expect(() =>
      parseColor('color-mix(in srgb, red 50%, transparent)'),
    ).toThrow(/not a colour/)
    expect(() => parseColor('#12345')).toThrow(/not a colour/)
  })
})

describe('relativeLuminance', () => {
  it('puts white at 1 and black at 0', () => {
    expect(relativeLuminance(parseColor('#ffffff'))).toBeCloseTo(1, 6)
    expect(relativeLuminance(parseColor('#000000'))).toBeCloseTo(0, 6)
  })

  it('applies the sRGB transfer function rather than treating channels as linear', () => {
    // Mid grey is perceptually half, but linearly ~0.216.
    expect(relativeLuminance(parseColor('#808080'))).toBeCloseTo(0.2159, 3)
  })
})

describe('contrastRatio', () => {
  it('reports 21:1 for the extremes', () => {
    expect(ratioBetween('#000000', '#ffffff')).toBeCloseTo(21, 5)
  })

  it('is symmetric — the order of the arguments never changes the answer', () => {
    expect(ratioBetween('#1a5bc7', '#ffffff')).toBeCloseTo(
      ratioBetween('#ffffff', '#1a5bc7'),
      10,
    )
  })

  it('flattens a translucent foreground before measuring', () => {
    // 70% white over the warning banner is the pairing KroApple asserts for a
    // banner's supporting line.
    const painted = ratioBetween('rgb(255 255 255 / 0.7)', '#7e3f00')
    const naive = ratioBetween('#ffffff', '#7e3f00')
    expect(painted).toBeLessThan(naive)
    expect(painted).toBeGreaterThanOrEqual(4.5)
  })

  it('agrees with the published reference value for #777 on white (4.48:1)', () => {
    expect(ratioBetween('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
  })
})

describe('composite', () => {
  it('returns the backdrop when the foreground is fully transparent', () => {
    const backdrop = parseColor('#fafafa')
    expect(composite(withAlpha(parseColor('#000000'), 0), backdrop)).toEqual({
      ...backdrop,
      a: 1,
    })
  })

  it('returns the foreground when it is fully opaque', () => {
    const front = parseColor('#b7162f')
    expect(composite(front, parseColor('#ffffff'))).toEqual({ ...front, a: 1 })
  })

  it('lands halfway at 50% — the property the banner assertions rely on', () => {
    const mixed = composite(
      withAlpha(parseColor('#ffffff'), 0.5),
      parseColor('#000000'),
    )
    expect(mixed.r).toBeCloseTo(0.5, 6)
    expect(contrastRatio(mixed, parseColor('#000000'))).toBeGreaterThan(1)
  })
})
