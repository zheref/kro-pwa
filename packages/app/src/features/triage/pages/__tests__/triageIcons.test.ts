/**
 * The Triage glyph seam.
 *
 * Two properties are worth asserting and they are the two that keep this file
 * from becoming a fork: the key sets above it are **disjoint** from its own (so
 * it can never shadow a more general answer), and every symbol `@kro/core`
 * names for a quadrant **resolves to a real drawing** (so a tile can never
 * reach a user as a blank or the help fallback).
 */
import { eisenhowerQuadrants, quadrantIcon } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { ENDEAVOR_SF_SYMBOL_TO_LUCIDE } from '../../../../design/endeavor/endeavorIcons'
import { SF_SYMBOL_TO_LUCIDE } from '../../../../design/system/icons/icons'
import {
  TRIAGE_SF_SYMBOL_TO_LUCIDE,
  isTriageMappedSymbol,
  triageIcon,
  triageIconFor,
} from '../triageIcons'

describe('the map never shadows a more general one', () => {
  it("shares no key with the design system's map", () => {
    const system = Object.keys(SF_SYMBOL_TO_LUCIDE)
    const overlap = Object.keys(TRIAGE_SF_SYMBOL_TO_LUCIDE).filter((key) =>
      system.includes(key),
    )
    expect(overlap).toEqual([])
  })

  it("shares no key with the endeavor kit's extension", () => {
    const kit = Object.keys(ENDEAVOR_SF_SYMBOL_TO_LUCIDE)
    const overlap = Object.keys(TRIAGE_SF_SYMBOL_TO_LUCIDE).filter((key) =>
      kit.includes(key),
    )
    expect(overlap).toEqual([])
  })

  it("resolves a shared name from the more general file (bolt.fill is the kit's)", () => {
    expect(triageIcon('bolt.fill')).toBe(
      ENDEAVOR_SF_SYMBOL_TO_LUCIDE['bolt.fill'],
    )
    expect(triageIcon('plus')).toBe(SF_SYMBOL_TO_LUCIDE.plus)
  })
})

describe('every symbol the surface draws resolves', () => {
  it('draws all four quadrant glyphs @kro/core names', () => {
    for (const quadrant of eisenhowerQuadrants) {
      const icon = quadrantIcon(quadrant)
      expect(icon.type).toBe('glyph')
      if (icon.type !== 'glyph') continue
      expect(isTriageMappedSymbol(icon.name)).toBe(true)
      expect(triageIconFor(icon.name)).toBeTypeOf('object')
    }
  })

  it('draws every row this file adds', () => {
    for (const name of Object.keys(TRIAGE_SF_SYMBOL_TO_LUCIDE)) {
      expect(isTriageMappedSymbol(name)).toBe(true)
    }
  })

  it('falls back visibly on a symbol nobody maps, never to undefined', () => {
    expect(isTriageMappedSymbol('sparkles.rectangle.stack')).toBe(false)
    // React renders `undefined` as a crash; a visible fallback is the point.
    expect(triageIconFor('sparkles.rectangle.stack')).toBeTypeOf('object')
  })
})
