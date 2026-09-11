import { describe, expect, it } from 'vitest'
import {
  FLUENT_BUTTON_APPEARANCES,
  type FluentButtonAppearance,
} from './appearance'

describe('FluentButtonAppearance', () => {
  it('lists the five Fluent button appearances', () => {
    expect(FLUENT_BUTTON_APPEARANCES).toEqual([
      'primary',
      'secondary',
      'outline',
      'subtle',
      'transparent',
    ])
  })

  it('starts with primary as the one filled action', () => {
    expect(FLUENT_BUTTON_APPEARANCES[0]).toBe('primary')
  })

  it('is a closed set a story can iterate without inventing a sixth', () => {
    const appearances: readonly FluentButtonAppearance[] =
      FLUENT_BUTTON_APPEARANCES
    expect(appearances).toHaveLength(5)
    expect(new Set(appearances).size).toBe(5)
  })
})
