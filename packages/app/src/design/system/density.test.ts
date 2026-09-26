import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CONTROL_DENSITY,
  DENSITY_BOX,
  DENSITY_FIELD,
  DENSITY_HIT,
  DENSITY_ROW,
  DENSITY_TYPE,
  buttonSizeForDensity,
  controlDensity,
  controlMinSizeVar,
  iconButtonSizeForDensity,
  isComfortable,
  CONTROL_RADIUS,
  SELECTED_CONTROL_STYLE,
} from './density'

describe('density', () => {
  it('defaults to compact so web chrome is pointer-first', () => {
    expect(DEFAULT_CONTROL_DENSITY).toBe('compact')
    expect(controlDensity(false)).toBe('compact')
    expect(controlDensity(true)).toBe('comfortable')
  })

  it('maps density onto the two button sizes, never the 44px lg floor', () => {
    expect(buttonSizeForDensity('compact')).toBe('sm')
    expect(buttonSizeForDensity('comfortable')).toBe('md')
    expect(iconButtonSizeForDensity('compact')).toBe('icon-sm')
    expect(iconButtonSizeForDensity('comfortable')).toBe('icon')
  })

  it('names the token floor each density must not fall below', () => {
    expect(controlMinSizeVar('compact')).toBe(
      'var(--kro-size-min-pointer-target)',
    )
    expect(controlMinSizeVar('comfortable')).toBe(
      'var(--kro-size-min-touch-target)',
    )
  })

  it('keeps compact classes strictly smaller than comfortable', () => {
    expect(DENSITY_HIT.compact).toContain('min-h-6')
    expect(DENSITY_HIT.comfortable).toContain('min-h-9')
    expect(DENSITY_ROW.compact).toContain('text-xs')
    expect(DENSITY_ROW.comfortable).toContain('text-sm')
    expect(DENSITY_BOX.compact).toBe('size-6')
    expect(DENSITY_BOX.comfortable).toBe('size-9')
    expect(DENSITY_FIELD.compact).toContain('h-6')
    expect(DENSITY_FIELD.comfortable).toContain('h-9')
    expect(DENSITY_TYPE.compact).toBe('text-xs')
    expect(DENSITY_TYPE.comfortable).toBe('text-sm')
    expect(isComfortable('compact')).toBe(false)
    expect(isComfortable('comfortable')).toBe(true)
  })
})

describe('the selectable-control standards', () => {
  it('rounds compact controls with the menu-row radius', () => {
    expect(CONTROL_RADIUS.compact).toBe('var(--kro-radius-small)')
  })

  it('keeps comfortable (touch) controls as capsules', () => {
    expect(CONTROL_RADIUS.comfortable).toBe('var(--kro-radius-pill)')
  })

  it('fills a selection with the foreground, labelled in the background colour', () => {
    expect(SELECTED_CONTROL_STYLE).toEqual({
      background: 'var(--kro-color-fore)',
      color: 'var(--kro-color-back)',
    })
  })
})
