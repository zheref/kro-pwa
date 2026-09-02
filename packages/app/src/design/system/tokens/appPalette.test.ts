import { describe, expect, it } from 'vitest'
import {
  APP_PALETTES,
  APP_PALETTE_IDS,
  DEFAULT_APP_PALETTE,
  appPaletteNamed,
} from './appPalette'

describe('appPaletteNamed', () => {
  it('returns a declared palette unchanged', () => {
    expect(appPaletteNamed('green')).toBe('green')
  })

  it('falls back to Purple when nothing has been chosen', () => {
    expect(appPaletteNamed(null)).toBe(DEFAULT_APP_PALETTE)
    expect(appPaletteNamed(undefined)).toBe('purple')
  })

  it('falls back to Purple for a raw value the picker does not offer', () => {
    expect(appPaletteNamed('blue')).toBe('purple')
  })
})

describe('the four palettes', () => {
  it('lists Purple, Green, Orange, Red in canon picker order', () => {
    expect(APP_PALETTE_IDS).toEqual(['purple', 'green', 'orange', 'red'])
  })

  it('keeps Purple as the look the app shipped before palettes existed', () => {
    expect(APP_PALETTES.purple.light.start).toBe('#5856d6')
    expect(APP_PALETTES.purple.light.end).toBe('#663399')
  })

  it('names each palette with a plain colour word', () => {
    expect(APP_PALETTE_IDS.map((id) => APP_PALETTES[id].label)).toEqual([
      'Purple',
      'Green',
      'Orange',
      'Red',
    ])
  })
})
