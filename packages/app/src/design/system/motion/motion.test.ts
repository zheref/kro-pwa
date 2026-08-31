import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseBlocks, parseDeclarations, stripComments } from '../tokens/tokenSource'
import {
  EASING_VARS,
  MOTION_MS,
  MOTION_VARS,
  SPRINGS,
  durationVar,
  easingVar,
  prefersReducedMotion,
  springDisplacement,
} from './motion'

const MOTION_CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'motion.css'),
  'utf8',
)

const blocks = parseBlocks(stripComments(MOTION_CSS))
const rootBlocks = blocks.filter((block) => block.selector === ':root')
const declaredRoot = parseDeclarations(rootBlocks[0]?.body ?? '')

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the durations match KroTokens.Motion', () => {
  it('is quick 180ms and standard 240ms', () => {
    expect(declaredRoot[MOTION_VARS.quick]).toBe('180ms')
    expect(declaredRoot[MOTION_VARS.standard]).toBe('240ms')
  })

  it('keeps the TypeScript copy equal to the stylesheet, in both directions', () => {
    for (const [token, variable] of Object.entries(MOTION_VARS)) {
      expect(declaredRoot[variable], `${variable} is not declared`).toBe(
        `${MOTION_MS[token as keyof typeof MOTION_MS]}ms`,
      )
    }
    const declaredDurations = Object.keys(declaredRoot)
      .filter((name) => name.startsWith('--kro-duration-'))
      .sort()
    expect(declaredDurations).toEqual(Object.values(MOTION_VARS).sort())
  })

  it('declares every easing the TypeScript map names, and no others', () => {
    const declaredEasings = Object.keys(declaredRoot)
      .filter((name) => name.startsWith('--kro-ease-'))
      .sort()
    expect(declaredEasings).toEqual(Object.values(EASING_VARS).sort())
  })
})

describe('the spring curves still describe KroApple’s springs', () => {
  /** Regenerates the `linear()` stops from the closed form, as the port did. */
  function sampledCurve(spec: { duration: number; bounce: number }): {
    settle: number
    stops: number[]
  } {
    const omega = (2 * Math.PI) / spec.duration
    const zeta = 1 - spec.bounce
    const settle = Math.ceil((-Math.log(0.002) / (zeta * omega)) * 1000) / 1000
    const stops: number[] = []
    for (let i = 0; i <= 24; i += 1) {
      stops.push(
        Math.round(springDisplacement((settle * i) / 24, spec) * 10000) / 10000,
      )
    }
    stops[0] = 0
    stops[24] = 1
    return { settle, stops }
  }

  function parsedCurve(variable: string): number[] {
    const value = declaredRoot[variable]
    if (value === undefined) throw new Error(`${variable} is not declared`)
    const inner = /^linear\(([\s\S]*)\)$/.exec(value)?.[1]
    if (inner === undefined) throw new Error(`${variable} is not a linear() curve`)
    return inner.split(',').map((part) => Number.parseFloat(part))
  }

  for (const token of ['quickSpring', 'standardSpring'] as const) {
    it(`${token} matches spring(duration: ${SPRINGS[token].duration}, bounce: ${SPRINGS[token].bounce})`, () => {
      const expected = sampledCurve(SPRINGS[token])
      expect(parsedCurve(EASING_VARS[token])).toEqual(expected.stops)
      // The paired duration is the SETTLE time, not the perceptual duration —
      // using the perceptual one would cut the overshoot off mid-flight.
      expect(MOTION_MS[token]).toBe(Math.round(expected.settle * 1000))
      expect(MOTION_MS[token]).toBeGreaterThan(SPRINGS[token].duration * 1000)
    })
  }

  it('overshoots past the rest position — the bounce is the point', () => {
    expect(Math.max(...parsedCurve(EASING_VARS.quickSpring))).toBeGreaterThan(1)
    expect(Math.max(...parsedCurve(EASING_VARS.standardSpring))).toBeGreaterThan(1)
  })

  it('starts at rest and finishes at rest', () => {
    for (const token of ['quickSpring', 'standardSpring'] as const) {
      const stops = parsedCurve(EASING_VARS[token])
      expect(stops[0]).toBe(0)
      expect(stops[stops.length - 1]).toBe(1)
    }
  })
})

describe('the reduced-motion layer', () => {
  const reduced = blocks.filter(
    (block) => block.within === '@media (prefers-reduced-motion: reduce)',
  )

  it('exists at all', () => {
    expect(reduced.length).toBeGreaterThan(0)
  })

  it('collapses the duration TOKENS, so an inline style is stilled too', () => {
    const rootOverride = reduced.find((block) => block.selector === ':root')
    expect(rootOverride, ':root is not overridden under reduced motion').toBeDefined()

    const declarations = parseDeclarations(rootOverride?.body ?? '')
    for (const variable of Object.values(MOTION_VARS)) {
      expect(declarations[variable], `${variable} still animates`).toBe('0.01ms')
    }
  })

  it('stills running animations globally, including the rotating glow', () => {
    const blanket = reduced.find((block) => block.selector.startsWith('*'))
    expect(blanket).toBeDefined()

    const declarations = parseDeclarations(blanket?.body ?? '')
    expect(declarations['animation-duration']).toBe('0.01ms !important')
    expect(declarations['animation-iteration-count']).toBe('1 !important')
    expect(declarations['transition-duration']).toBe('0.01ms !important')
  })

  it('never uses a zero-length duration, which would never fire transitionend', () => {
    const values = reduced.flatMap((block) => Object.values(parseDeclarations(block.body)))
    expect(values.some((value) => /(^|\s)0m?s/.test(value))).toBe(false)
  })
})

describe('prefersReducedMotion', () => {
  it('reports the media query', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    expect(prefersReducedMotion()).toBe(true)
  })

  it('reports false when the user has not asked for it', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
    expect(prefersReducedMotion()).toBe(false)
  })

  it('does not throw where matchMedia is absent — SSR must render', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(prefersReducedMotion()).toBe(false)
  })
})

describe('the var() helpers', () => {
  it('wrap a motion token', () => {
    expect(durationVar('standard')).toBe('var(--kro-duration-standard)')
    expect(easingVar('standardSpring')).toBe('var(--kro-ease-standard-spring)')
  })
})
