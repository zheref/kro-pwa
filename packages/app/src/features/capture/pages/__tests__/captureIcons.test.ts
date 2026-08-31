/**
 * The capture surfaces' icon seam.
 *
 * The two properties that make a third map safe rather than a fork: the key
 * sets are disjoint, so no row here can shadow a more general answer; and every
 * glyph the logic tier names resolves to a real drawing rather than the help
 * fallback, so an unmapped symbol fails here instead of showing a user a
 * question mark.
 */
import { describe, expect, it } from 'vitest'
import { ENDEAVOR_SF_SYMBOL_TO_LUCIDE } from '../../../../design/endeavor/endeavorIcons'
import { SF_SYMBOL_TO_LUCIDE } from '../../../../design/system/icons/icons'
import {
  captureDestinationGlyph,
  captureKindGlyph,
  captureKinds,
  captureDestinations,
  inboxRowButtons,
} from '../../CaptureRules'
import {
  CAPTURE_SF_SYMBOL_TO_LUCIDE,
  captureIcon,
  captureIconFor,
  isCaptureMappedSymbol,
} from '../captureIcons'

describe('the three maps stay disjoint', () => {
  it('shadows no row of the design system\'s map', () => {
    const collisions = Object.keys(CAPTURE_SF_SYMBOL_TO_LUCIDE).filter(
      (name) => name in SF_SYMBOL_TO_LUCIDE,
    )
    expect(collisions).toEqual([])
  })

  it('shadows no row of the endeavor kit\'s extension map', () => {
    const collisions = Object.keys(CAPTURE_SF_SYMBOL_TO_LUCIDE).filter(
      (name) => name in ENDEAVOR_SF_SYMBOL_TO_LUCIDE,
    )
    expect(collisions).toEqual([])
  })

  it('lets the more general map win for a symbol it already answers', () => {
    expect(captureIcon('calendar')).toBe(SF_SYMBOL_TO_LUCIDE.calendar)
    expect(captureIcon('tray')).toBe(ENDEAVOR_SF_SYMBOL_TO_LUCIDE.tray)
  })
})

describe('every glyph the logic tier names resolves to a real drawing', () => {
  it('draws all four kind chips', () => {
    for (const kind of captureKinds) {
      expect(isCaptureMappedSymbol(captureKindGlyph(kind))).toBe(true)
    }
  })

  it('draws every hosting destination, including the two the web never offers', () => {
    for (const destination of captureDestinations) {
      expect(isCaptureMappedSymbol(captureDestinationGlyph(destination))).toBe(
        true,
      )
    }
  })

  it('draws both in-row buttons — Triage and Add for Today', () => {
    for (const button of inboxRowButtons) {
      expect(isCaptureMappedSymbol(button.icon)).toBe(true)
    }
  })
})

describe('captureIconFor — the resolver that can fail', () => {
  it('answers a mapped symbol with its own component', () => {
    expect(captureIconFor('rectangle.split.2x2.fill')).toBe(
      CAPTURE_SF_SYMBOL_TO_LUCIDE['rectangle.split.2x2.fill'],
    )
  })

  it('falls back visibly rather than returning undefined, which React would crash on', () => {
    const fallback = captureIconFor('not.a.symbol')
    expect(typeof fallback).toBe('object')
    expect(fallback).not.toBeUndefined()
  })

  it('reports an unmapped symbol as unmapped', () => {
    expect(isCaptureMappedSymbol('not.a.symbol')).toBe(false)
  })
})
