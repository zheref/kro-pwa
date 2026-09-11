import { describe, expect, it } from 'vitest'
import {
  FLUENT_CONTROL_SIZES,
  buttonSizeForFluentSize,
  densityForFluentSize,
  fluentSizeForDensity,
} from './sizes'

describe('Fluent size mapping', () => {
  it('lists the three Fluent control sizes', () => {
    expect(FLUENT_CONTROL_SIZES).toEqual(['small', 'medium', 'large'])
  })

  it('maps small onto compact and the rest onto comfortable', () => {
    expect(densityForFluentSize('small')).toBe('compact')
    expect(densityForFluentSize('medium')).toBe('comfortable')
    expect(densityForFluentSize('large')).toBe('comfortable')
  })

  it('maps those sizes onto Button sm / md / lg', () => {
    expect(buttonSizeForFluentSize('small')).toBe('sm')
    expect(buttonSizeForFluentSize('medium')).toBe('md')
    expect(buttonSizeForFluentSize('large')).toBe('lg')
    expect(fluentSizeForDensity('compact')).toBe('small')
    expect(fluentSizeForDensity('comfortable')).toBe('medium')
  })
})
