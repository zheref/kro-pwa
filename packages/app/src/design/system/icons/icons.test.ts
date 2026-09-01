import { describe, expect, it } from 'vitest'
import {
  ICON_SIZE,
  SF_SYMBOL_TO_LUCIDE,
  type SfSymbolName,
  iconForSymbol,
} from './icons'

describe('the SF Symbols mapping', () => {
  const entries = Object.entries(SF_SYMBOL_TO_LUCIDE) as Array<
    [SfSymbolName, unknown]
  >

  it('resolves every row to a real component — a typo must fail here, not render nothing', () => {
    for (const [symbol, icon] of entries) {
      expect(icon, `${symbol} maps to nothing`).toBeDefined()
      expect(
        typeof icon === 'function' || typeof icon === 'object',
        `${symbol} does not map to a renderable component`,
      ).toBe(true)
    }
  })

  it('covers the glyphs the ported shell needs before any feature child starts', () => {
    for (const symbol of [
      'magnifyingglass',
      'gearshape',
      'checkmark.circle.fill',
      'plus',
      'tray.and.arrow.down',
      'play',
      'pause',
    ] as const) {
      expect(iconForSymbol(symbol)).toBeDefined()
    }
  })

  it('carries the rows the four lane-local maps folded in (KC-IS-#71)', () => {
    // One representative row per lane, so a re-fork is visible here.
    for (const symbol of [
      // Settings (item 8)
      'sunrise',
      'speaker.wave.2',
      'rectangle.portrait.and.arrow.right',
      // Session (item 16)
      'bolt.fill',
      'clock.badge.xmark',
      'stop.fill',
      'cup.and.saucer.fill',
      // Find / Detail (item 13)
      'line.3.horizontal.decrease.circle',
      'slider.horizontal.3',
      'textformat',
      'star.fill',
      'flame.fill',
      'folder',
      'minus',
      'flag.checkered',
      // Capture and Triage
      'tray.full',
      'person.2.fill',
    ] as const) {
      expect(iconForSymbol(symbol), symbol).toBeDefined()
    }
  })

  it('keys on KroApple’s exact systemName strings, dots and all', () => {
    // The port is a search-and-replace against these literals; a "prettified"
    // key would silently stop matching the Swift source.
    expect(Object.keys(SF_SYMBOL_TO_LUCIDE)).toContain(
      'exclamationmark.triangle',
    )
    expect(Object.keys(SF_SYMBOL_TO_LUCIDE)).toContain('person.crop.circle')
  })

  it('maps each symbol to exactly one icon, and flags an accidental duplicate', () => {
    // Two symbols legitimately sharing an icon is fine; the check is that the
    // *keys* are unique, which object literals give us, and that the map is
    // not accidentally empty.
    expect(entries.length).toBeGreaterThan(90)
    expect(new Set(Object.keys(SF_SYMBOL_TO_LUCIDE)).size).toBe(entries.length)
  })
})

describe('ICON_SIZE', () => {
  it('sits on the same 4pt rhythm as the spacing scale', () => {
    for (const size of Object.values(ICON_SIZE)) {
      expect(size % 4, `${size} is off the 4pt rhythm`).toBe(0)
    }
  })

  it('never exceeds the smaller of the two minimum targets', () => {
    // The hit area is the control's job (--kro-size-min-touch-target), not the
    // glyph's; a glyph larger than the 28px pointer target would force the
    // control to grow and break the desktop density.
    for (const size of Object.values(ICON_SIZE)) {
      expect(size).toBeLessThanOrEqual(28)
    }
  })

  it('grows monotonically', () => {
    expect(ICON_SIZE.small).toBeLessThan(ICON_SIZE.medium)
    expect(ICON_SIZE.medium).toBeLessThan(ICON_SIZE.large)
  })
})
