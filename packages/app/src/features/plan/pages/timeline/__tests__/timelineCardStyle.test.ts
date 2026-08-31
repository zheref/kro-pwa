/**
 * The card's presentation rules, asserted as values.
 *
 * Everything here is pure, so each case is the function's own contract against
 * a number canon fixed — no store, no DOM, no timers (`RC-56`'s shape for a
 * pure module).
 */
import { EndeavorKind, makeEndeavor } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  CARD_ACCENT_PALETTE,
  CardTier,
  RIPPLE_SETTLED_OPACITY,
  cardAccentColor,
  cardFillBackground,
  cardFillOpacity,
  cardTierFor,
  cardTierForMinutes,
  normalizedHexColor,
  paletteAccentFor,
  rippleDiameterCss,
} from '../timelineCardStyle'

const event = (overrides: { associatedColor?: string | null; duration?: number }) =>
  makeEndeavor({
    id: 'card',
    title: 'Design review',
    kind: EndeavorKind.calendarEvent,
    start: new Date(2026, 5, 18, 10),
    duration: overrides.duration ?? 3600,
    associatedColor: overrides.associatedColor ?? null,
  })

describe('cardFillOpacity', () => {
  it('rests lighter in light mode than in dark — a tint reads stronger on white', () => {
    expect(cardFillOpacity('light', false)).toBe(0.15)
    expect(cardFillOpacity('dark', false)).toBe(0.25)
  })

  it('deepens by canon 0.14 under a finger, in either scheme', () => {
    expect(cardFillOpacity('light', true)).toBeCloseTo(0.29, 10)
    expect(cardFillOpacity('dark', true)).toBeCloseTo(0.39, 10)
  })

  it('never reaches full opacity, so the block keeps its calendar identity', () => {
    for (const scheme of ['light', 'dark'] as const) {
      expect(cardFillOpacity(scheme, true)).toBeLessThan(0.5)
    }
  })
})

describe('cardFillBackground', () => {
  it('carries both schemes in one value — a component has no selector to branch on', () => {
    const background = cardFillBackground('#336699', false)
    expect(background).toContain('light-dark(')
    expect(background).toContain('15%')
    expect(background).toContain('25%')
  })

  it('deepens both halves together when the block is pressed', () => {
    const background = cardFillBackground('#336699', true)
    expect(background).toContain('29%')
    expect(background).toContain('39%')
  })

  it('mixes toward transparent, never toward a background colour', () => {
    expect(cardFillBackground('#336699', false)).toContain(', transparent)')
  })
})

describe('rippleDiameterCss', () => {
  it('is at least twice the card height, so a tall narrow block is covered', () => {
    expect(rippleDiameterCss(240)).toBe('max(200%, 480px)')
  })

  it('is at least twice the width, so a short wide block is covered', () => {
    // The `200%` half is the width guarantee; a 30px card still asks for it.
    expect(rippleDiameterCss(30)).toContain('200%')
  })

  it('never asks for a negative diameter when a placement rounds below zero', () => {
    expect(rippleDiameterCss(-10)).toBe('max(200%, 0px)')
  })
})

describe('the accent palette', () => {
  it('cycles canon nine tints, wrapping like its modulo does', () => {
    expect(CARD_ACCENT_PALETTE).toHaveLength(9)
    expect(paletteAccentFor(0)).toBe(paletteAccentFor(9))
    expect(paletteAccentFor(1)).toBe('badgeTeal')
  })

  it('handles a negative index rather than reading past the array', () => {
    expect(paletteAccentFor(-1)).toBe(CARD_ACCENT_PALETTE[8])
  })

  it('prefers the calendar colour over the palette — the event keeps its identity', () => {
    expect(cardAccentColor(event({ associatedColor: '#ff8800' }), 0)).toBe(
      '#FF8800',
    )
  })

  it('falls back to the palette for a Kro-native event with no calendar', () => {
    expect(cardAccentColor(event({}), 0)).toContain('--kro-color-badge-blue')
  })
})

describe('normalizedHexColor', () => {
  it('accepts a hash-prefixed, mixed-case hex the way a Google payload sends it', () => {
    expect(normalizedHexColor('#a1b2c3')).toBe('#A1B2C3')
  })

  it('accepts a bare six-digit hex and trims surrounding whitespace', () => {
    expect(normalizedHexColor('  a1b2c3 ')).toBe('#A1B2C3')
  })

  it('rejects a three-digit shorthand rather than painting a card black', () => {
    expect(normalizedHexColor('#abc')).toBeNull()
    expect(normalizedHexColor('rebeccapurple')).toBeNull()
    expect(normalizedHexColor(null)).toBeNull()
  })
})

describe('cardTierForMinutes', () => {
  it('keeps a half-hour block to the title alone — there is no room for more', () => {
    expect(cardTierForMinutes(30)).toBe(CardTier.compact)
    expect(cardTierForMinutes(59)).toBe(CardTier.compact)
  })

  it('adds the time range at an hour and a two-line title at ninety minutes', () => {
    expect(cardTierForMinutes(60)).toBe(CardTier.timeRange)
    expect(cardTierForMinutes(90)).toBe(CardTier.twoLineTitle)
  })

  it('leads with the emoji line only past two and a half hours', () => {
    expect(cardTierForMinutes(149)).toBe(CardTier.calendarName)
    expect(cardTierForMinutes(150)).toBe(CardTier.emojiLine)
  })

  it('treats an event with no duration as the most compact tier', () => {
    expect(cardTierFor(event({ duration: 0 }))).toBe(CardTier.compact)
  })
})

describe('RIPPLE_SETTLED_OPACITY', () => {
  it('is canon 1 - 0.45, so the wave thins rather than landing as a disc', () => {
    expect(RIPPLE_SETTLED_OPACITY).toBeCloseTo(0.55, 10)
  })
})
