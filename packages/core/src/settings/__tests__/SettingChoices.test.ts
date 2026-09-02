import { describe, expect, it } from 'vitest'
import {
  AccentChoice,
  AppearanceMode,
  AppearancePalette,
  LandingChoice,
  accentChoiceLabel,
  accentChoices,
  appearanceModeLabel,
  appearanceModes,
  appearancePaletteLabel,
  appearancePalettes,
  landingChoiceLabel,
  landingChoices,
} from '../SettingChoices'

describe('AppearanceMode', () => {
  it('persists the case name, so a value written by KroApple still resolves', () => {
    expect(AppearanceMode.system).toBe('system')
    expect(AppearanceMode.light).toBe('light')
    expect(AppearanceMode.dark).toBe('dark')
  })

  it('offers the picker System, Light, Dark in canon declaration order', () => {
    expect(appearanceModes).toEqual(['system', 'light', 'dark'])
  })

  it('titles each choice as the Settings screen shows it', () => {
    expect(appearanceModes.map(appearanceModeLabel)).toEqual([
      'System',
      'Light',
      'Dark',
    ])
  })
})

describe('AppearancePalette', () => {
  it('persists the case name, so a value written by KroApple still resolves', () => {
    expect(AppearancePalette.purple).toBe('purple')
    expect(AppearancePalette.green).toBe('green')
    expect(AppearancePalette.orange).toBe('orange')
    expect(AppearancePalette.red).toBe('red')
  })

  it('offers the picker Purple, Green, Orange, Red in canon declaration order', () => {
    expect(appearancePalettes).toEqual(['purple', 'green', 'orange', 'red'])
  })

  it('titles each choice as a plain colour name', () => {
    expect(appearancePalettes.map(appearancePaletteLabel)).toEqual([
      'Purple',
      'Green',
      'Orange',
      'Red',
    ])
  })
})

describe('AccentChoice', () => {
  it('persists the case name for all six accents', () => {
    expect(accentChoices).toEqual([
      'blue',
      'purple',
      'green',
      'orange',
      'pink',
      'graphite',
    ])
  })

  it('opens on Blue — the accent a fresh install shows', () => {
    expect(accentChoices[0]).toBe(AccentChoice.blue)
  })

  it('titles every accent for the picker', () => {
    expect(accentChoices.map(accentChoiceLabel)).toEqual([
      'Blue',
      'Purple',
      'Green',
      'Orange',
      'Pink',
      'Graphite',
    ])
    expect(accentChoiceLabel(AccentChoice.graphite)).toBe('Graphite')
  })
})

describe('LandingChoice', () => {
  it('stores the Do section as "doNow", because "do" is a reserved word in canon', () => {
    expect(LandingChoice.doNow).toBe('doNow')
    expect(landingChoiceLabel(LandingChoice.doNow)).toBe('Do')
  })

  it('lists Plan, Do, Earn in the order the launch picker shows them', () => {
    expect(landingChoices).toEqual(['plan', 'doNow', 'earn'])
  })

  it('titles every landing section for the picker', () => {
    expect(landingChoices.map(landingChoiceLabel)).toEqual([
      'Plan',
      'Do',
      'Earn',
    ])
  })
})
