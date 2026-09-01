/**
 * Every symbol a settings surface holds resolves to a real glyph.
 *
 * The lane's own ~30 rows moved into `design/system/icons/icons.ts`
 * (KC-IS-#71 item 8), so there is no lane map left to prove disjoint. What
 * remains is the assertion that mattered anyway: walk the whole preference
 * schema and the hub's own rows, so an option declared with a glyph nothing
 * draws fails here rather than rendering a question mark for a user.
 */
import { allSettingOptions } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { SF_SYMBOL_TO_LUCIDE } from '../../../../design/system/icons/icons'
import { settingsSections } from '../../SettingsSection'
import { isSettingsSymbolMapped, settingsIcon } from '../settingsIcons'

describe('the resolver is the shared one', () => {
  it('answers a shared symbol with the shared component', () => {
    expect(settingsIcon('calendar')).toBe(SF_SYMBOL_TO_LUCIDE.calendar)
  })

  it('answers a promoted preference symbol from the shared table', () => {
    // `sunrise` was one of the lane's own rows before item 8 folded it up.
    expect(settingsIcon('sunrise')).toBe(SF_SYMBOL_TO_LUCIDE.sunrise)
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
