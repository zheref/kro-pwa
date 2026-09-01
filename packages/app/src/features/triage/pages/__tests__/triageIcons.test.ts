/**
 * The Triage glyph seam.
 *
 * The lane's own rows folded into the shared table (KC-IS-#71 item 13), so
 * there is no third map left to prove disjoint. The property that mattered
 * remains: every symbol `@kro/core` names for a quadrant **resolves to a real
 * drawing**, so a tile can never reach a user as a blank or a fallback.
 */
import { eisenhowerQuadrants, quadrantIcon } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { SF_SYMBOL_TO_LUCIDE } from '../../../../design/system/icons/icons'
import { isTriageMappedSymbol, triageIcon, triageIconFor } from '../triageIcons'

describe('the resolver is the shared one', () => {
  it('answers from the shared table, including the promoted rows', () => {
    expect(triageIcon('bolt.fill')).toBe(SF_SYMBOL_TO_LUCIDE['bolt.fill'])
    expect(triageIcon('plus')).toBe(SF_SYMBOL_TO_LUCIDE.plus)
    // `star.slash` and `person.2.fill` were this lane's own rows.
    expect(triageIcon('star.slash')).toBe(SF_SYMBOL_TO_LUCIDE['star.slash'])
    expect(triageIcon('person.2.fill')).toBe(
      SF_SYMBOL_TO_LUCIDE['person.2.fill'],
    )
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

  it('draws every row this lane used to add', () => {
    for (const name of [
      'chevron.backward',
      'star.fill',
      'bolt.slash',
      'star.slash',
      'minus',
      'person.2.fill',
      'square.and.arrow.up',
    ]) {
      expect(isTriageMappedSymbol(name), name).toBe(true)
    }
  })

  it('falls back visibly on a symbol nobody maps, never to undefined', () => {
    expect(isTriageMappedSymbol('sparkles.rectangle.stack')).toBe(false)
    // React renders `undefined` as a crash; a visible fallback is the point.
    expect(triageIconFor('sparkles.rectangle.stack')).toBeTypeOf('object')
  })
})
