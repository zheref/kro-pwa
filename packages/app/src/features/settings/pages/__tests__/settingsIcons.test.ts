/**
 * The Settings lane's glyph rows.
 *
 * The first assertion is the one that matters: the lane's rows must be disjoint
 * from the two shared maps, so "which glyph is that symbol" keeps exactly one
 * answer. The second walks the whole preference schema and the hub's own rows,
 * so an option declared with a glyph nothing draws fails here rather than
 * rendering a question mark for a user.
 */
import { allSettingOptions } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  ENDEAVOR_SF_SYMBOL_TO_LUCIDE,
  isMappedSymbol,
} from '../../../../design/endeavor/endeavorIcons'
import { SF_SYMBOL_TO_LUCIDE } from '../../../../design/system/icons/icons'
import { settingsSections } from '../../SettingsSection'
import {
  SETTINGS_SF_SYMBOL_TO_LUCIDE,
  isSettingsSymbolMapped,
  settingsIcon,
} from '../settingsIcons'

describe('the lane rows do not shadow the shared maps', () => {
  it('adds no key the design system already answers for', () => {
    const shared = new Set(Object.keys(SF_SYMBOL_TO_LUCIDE))
    const overlap = Object.keys(SETTINGS_SF_SYMBOL_TO_LUCIDE).filter((key) =>
      shared.has(key),
    )

    expect(overlap).toEqual([])
  })

  it('adds no key the Endeavor kit already answers for', () => {
    const kit = new Set(Object.keys(ENDEAVOR_SF_SYMBOL_TO_LUCIDE))
    const overlap = Object.keys(SETTINGS_SF_SYMBOL_TO_LUCIDE).filter((key) =>
      kit.has(key),
    )

    expect(overlap).toEqual([])
  })

  it('defers to the shared answer for a symbol both know how to draw', () => {
    expect(isMappedSymbol('calendar')).toBe(true)
    expect(settingsIcon('calendar')).toBe(SF_SYMBOL_TO_LUCIDE.calendar)
  })
})

describe('every symbol a settings surface holds resolves to a real glyph', () => {
  it('draws every option declared glyph', () => {
    const unmapped = allSettingOptions
      .map((option) => option.glyph)
      .filter((glyph): glyph is string => glyph !== null)
      .filter((glyph) => !isSettingsSymbolMapped(glyph))

    expect(unmapped).toEqual([])
  })

  it('draws every hub row glyph', () => {
    const unmapped = settingsSections
      .map((section) => section.glyph)
      .filter((glyph) => !isSettingsSymbolMapped(glyph))

    expect(unmapped).toEqual([])
  })

  it('draws the four sync-footer glyphs', () => {
    for (const glyph of [
      'checkmark.icloud',
      'icloud.slash',
      'arrow.triangle.2.circlepath',
      'person.crop.circle.badge.questionmark',
    ]) {
      expect(isSettingsSymbolMapped(glyph)).toBe(true)
    }
  })
})

describe('an unmapped symbol fails visibly, never silently', () => {
  it('returns a component rather than undefined', () => {
    expect(typeof settingsIcon('not.a.real.symbol')).not.toBe('undefined')
  })

  it('reports the symbol as unmapped', () => {
    expect(isSettingsSymbolMapped('not.a.real.symbol')).toBe(false)
  })

  it('reports a mapped lane symbol as mapped', () => {
    expect(isSettingsSymbolMapped('cup.and.saucer')).toBe(true)
  })
})
