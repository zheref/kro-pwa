/**
 * The capture surfaces' icon seam.
 *
 * The lane's own rows folded into the shared table (KC-IS-#71 item 13), so
 * there is no third map left to prove disjoint. The property that mattered
 * remains: every glyph the logic tier names resolves to a real drawing rather
 * than the help fallback, so an unmapped symbol fails here instead of showing a
 * user a question mark.
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
  captureIcon,
  captureIconFor,
  isCaptureMappedSymbol,
} from '../captureIcons'

describe('the resolver is the shared one', () => {
  it('answers from the shared tables, system first', () => {
    expect(captureIcon('calendar')).toBe(SF_SYMBOL_TO_LUCIDE.calendar)
    expect(captureIcon('tray')).toBe(ENDEAVOR_SF_SYMBOL_TO_LUCIDE.tray)
  })

  it('answers the rows this lane used to own from the shared table', () => {
    expect(captureIcon('tray.full')).toBe(SF_SYMBOL_TO_LUCIDE['tray.full'])
    expect(captureIcon('cloud.fill')).toBe(SF_SYMBOL_TO_LUCIDE['cloud.fill'])
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
      SF_SYMBOL_TO_LUCIDE['rectangle.split.2x2.fill'],
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
