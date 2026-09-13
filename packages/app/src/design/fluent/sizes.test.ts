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

  it('maps small and medium onto compact; large is the touch preview', () => {
    expect(densityForFluentSize('small')).toBe('compact')
    expect(densityForFluentSize('medium')).toBe('compact')
    expect(densityForFluentSize('large')).toBe('comfortable')
  })

  it('maps those sizes onto Button sm / md', () => {
    expect(buttonSizeForFluentSize('small')).toBe('sm')
    expect(buttonSizeForFluentSize('medium')).toBe('sm')
    expect(buttonSizeForFluentSize('large')).toBe('md')
    expect(fluentSizeForDensity('compact')).toBe('small')
    expect(fluentSizeForDensity('comfortable')).toBe('large')
  })
})
