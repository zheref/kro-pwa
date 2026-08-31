import { describe, expect, it } from 'vitest'
import {
  CardVariant,
  Density,
  cardVariantFromRawValue,
  cardVariants,
  densities,
  densityFromRawValue,
  makePresentationStyle,
} from '../PresentationStyle'

describe('card variants', () => {
  it('carries canon’s six variants, in declaration order', () => {
    expect(cardVariants).toEqual([
      'carouselHero',
      'carouselSecondary',
      'standardRow',
      'timelineBlock',
      'allDayStrip',
      'miniRow',
    ])
  })

  it('narrows a raw value back into the union', () => {
    expect(cardVariantFromRawValue('timelineBlock')).toBe(
      CardVariant.timelineBlock,
    )
  })

  it('refuses a variant the design system never shipped', () => {
    expect(cardVariantFromRawValue('gridTile')).toBeNull()
  })
})

describe('densities', () => {
  it('carries canon’s three densities, in declaration order', () => {
    expect(densities).toEqual(['compact', 'regular', 'featured'])
  })

  it('narrows a raw value back into the union', () => {
    expect(densityFromRawValue('featured')).toBe(Density.featured)
  })

  it('refuses an unknown density', () => {
    expect(densityFromRawValue('cosy')).toBeNull()
  })
})

describe('makePresentationStyle', () => {
  it('defaults an unstated density to regular, as canon’s initializer does', () => {
    expect(
      makePresentationStyle({ cardVariant: CardVariant.standardRow }),
    ).toEqual({
      cardVariant: 'standardRow',
      density: 'regular',
      itemLimit: null,
    })
  })

  it('defaults an unstated item limit to null — "no cap", not "cap at zero"', () => {
    expect(
      makePresentationStyle({ cardVariant: CardVariant.miniRow }).itemLimit,
    ).toBeNull()
  })

  it('carries the Tasks tab’s seven-rows-per-group cap through verbatim', () => {
    expect(
      makePresentationStyle({
        cardVariant: CardVariant.standardRow,
        density: Density.regular,
        itemLimit: 7,
      }),
    ).toEqual({ cardVariant: 'standardRow', density: 'regular', itemLimit: 7 })
  })

  it('keeps an explicit zero limit rather than treating it as unset', () => {
    expect(
      makePresentationStyle({
        cardVariant: CardVariant.standardRow,
        itemLimit: 0,
      }).itemLimit,
    ).toBe(0)
  })
})
