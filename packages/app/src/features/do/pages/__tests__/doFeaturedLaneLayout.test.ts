import { describe, expect, it } from 'vitest'
import {
  FEATURED_LANE_METRICS,
  featuredCapacityForWidth,
  featuredCardWidths,
  featuredHeroIndex,
  featuredRequiredWidth,
  featuredVisibleCount,
} from '../doFeaturedLaneLayout'

/**
 * Canon's own numbers, recomputed here so a drift in either direction fails:
 *   3 cards → 32 + 200 + 2·120 + 2·24 =  520
 *   5 cards → 32 + 200 + 4·120 + 4·24 =  808
 *   7 cards → 32 + 200 + 6·120 + 6·24 = 1096
 *   9 cards → 32 + 200 + 8·120 + 8·24 = 1384
 */
describe('the width one arrangement needs', () => {
  it("matches canon's formula at the three-card floor", () => {
    expect(featuredRequiredWidth(3)).toBe(520)
  })

  it('matches it at the nine-card ceiling', () => {
    expect(featuredRequiredWidth(9)).toBe(1384)
  })

  it('grows by one side card plus one gap per step', () => {
    expect(featuredRequiredWidth(5) - featuredRequiredWidth(3)).toBe(
      2 *
        (FEATURED_LANE_METRICS.minimumSideWidth +
          FEATURED_LANE_METRICS.spacing),
    )
  })
})

describe('how many cards a width shows', () => {
  it('takes the largest fitting odd count — a 1200px desktop shows seven', () => {
    expect(featuredVisibleCount({ availableWidth: 1200, cardCount: 9 })).toBe(7)
  })

  it('never drops below three, shrinking the cards instead (390px phone)', () => {
    expect(featuredVisibleCount({ availableWidth: 358, cardCount: 9 })).toBe(3)
  })

  it('keeps a one- or two-card day whole — the degenerate lanes stay even', () => {
    expect(featuredVisibleCount({ availableWidth: 1200, cardCount: 1 })).toBe(1)
    expect(featuredVisibleCount({ availableWidth: 1200, cardCount: 2 })).toBe(2)
  })

  it('shows nothing for an empty lane', () => {
    expect(featuredVisibleCount({ availableWidth: 1200, cardCount: 0 })).toBe(0)
  })

  it('rounds an even pool down to the odd count below it', () => {
    expect(featuredVisibleCount({ availableWidth: 2000, cardCount: 8 })).toBe(7)
  })
})

describe('the capacity reported to the slice is free of the card count', () => {
  it('answers 9 at the width nine cards need', () => {
    expect(featuredCapacityForWidth(1384)).toBe(9)
  })

  it('answers 7 one pixel below the nine-card width', () => {
    expect(featuredCapacityForWidth(1383)).toBe(7)
  })

  it('floors at 3 on a phone-width lane', () => {
    expect(featuredCapacityForWidth(358)).toBe(3)
  })
})

describe('card widths are fixed when they fit and scale only when they cannot', () => {
  it("keeps canon's 120 / 200 on a wide desktop, leaving spare width", () => {
    expect(
      featuredCardWidths({ availableWidth: 1120, visibleCount: 7 }),
    ).toEqual({ side: 120, hero: 200 })
  })

  it('shrinks proportionally on a 390px phone rather than clipping', () => {
    const widths = featuredCardWidths({ availableWidth: 358, visibleCount: 3 })
    expect(widths.side).toBeLessThan(120)
    expect(widths.hero).toBeLessThan(200)
    // The ratio between side and hero survives the shrink — the hero stays the
    // hero at every width.
    expect(widths.hero / widths.side).toBeCloseTo(200 / 120, 5)
  })

  it('answers zero for an empty lane rather than dividing by nothing', () => {
    expect(
      featuredCardWidths({ availableWidth: 1120, visibleCount: 0 }),
    ).toEqual({ side: 0, hero: 0 })
  })

  it('never returns a width below one pixel, however narrow the lane', () => {
    const widths = featuredCardWidths({ availableWidth: 1, visibleCount: 9 })
    expect(widths.side).toBeGreaterThanOrEqual(1)
    expect(widths.hero).toBeGreaterThanOrEqual(1)
  })
})

describe('which card is the hero', () => {
  it('centres it in a three-card lane', () => {
    expect(featuredHeroIndex(3)).toBe(1)
  })

  it('centres it in the nine-card lane', () => {
    expect(featuredHeroIndex(9)).toBe(4)
  })

  it('puts it second in the two-card lane, matching the arrangement', () => {
    expect(featuredHeroIndex(2)).toBe(1)
    expect(featuredHeroIndex(1)).toBe(0)
  })
})
