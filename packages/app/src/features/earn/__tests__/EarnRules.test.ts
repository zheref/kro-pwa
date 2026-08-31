import { PerformResolution, makePerform } from '@kro/core'
import { rewardMocks } from '@kro/core/mocks'
import { describe, expect, it } from 'vitest'
import {
  availableSuggestions,
  claimProgress,
  currentPoints,
  isCatalogEmpty,
  partitionRewards,
  pointsToGo,
  spentPoints,
  totalEarnedPoints,
} from '../EarnRules'

const perform = (rewardPoints: number) =>
  makePerform({
    date: new Date(2026, 2, 17, 9, 0, 0),
    duration: 1500,
    resolution: PerformResolution.finished,
    rewardPoints,
  })

describe('totalEarnedPoints', () => {
  it('is zero with no recorded performances', () => {
    expect(totalEarnedPoints([])).toBe(0)
  })

  it('sums every performance — never a per-endeavor estimate (canon divergence)', () => {
    expect(totalEarnedPoints([perform(30), perform(20)])).toBe(50)
  })

  it('counts a zero-point performance as zero, not as absent', () => {
    expect(totalEarnedPoints([perform(0), perform(40)])).toBe(40)
  })
})

describe('spentPoints', () => {
  it('is zero with no claims', () => {
    expect(spentPoints([rewardMocks.bobaTea], [])).toBe(0)
  })

  it('sums only claimed rewards still in the catalog', () => {
    expect(
      spentPoints(
        [rewardMocks.bobaTea, rewardMocks.movieNight],
        [rewardMocks.bobaTea.id],
      ),
    ).toBe(rewardMocks.bobaTea.pointsRequired)
  })

  it('drops a claimed id once its reward is deleted from the catalog (refund-on-delete)', () => {
    expect(
      spentPoints([rewardMocks.movieNight], [rewardMocks.bobaTea.id]),
    ).toBe(0)
  })
})

describe('currentPoints', () => {
  it('is zero with nothing earned and nothing spent', () => {
    expect(currentPoints([], [], [])).toBe(0)
  })

  it('is earned minus spent', () => {
    expect(
      currentPoints([perform(200)], [rewardMocks.bobaTea], [rewardMocks.bobaTea.id]),
    ).toBe(200 - rewardMocks.bobaTea.pointsRequired)
  })

  it('never goes negative when spent exceeds earned', () => {
    expect(
      currentPoints([perform(10)], [rewardMocks.weekendTrip], [rewardMocks.weekendTrip.id]),
    ).toBe(0)
  })
})

describe('pointsToGo', () => {
  it('is the full cost when nothing has been earned', () => {
    expect(pointsToGo(rewardMocks.bobaTea, 0)).toBe(rewardMocks.bobaTea.pointsRequired)
  })

  it('is zero once affordable', () => {
    expect(pointsToGo(rewardMocks.bobaTea, rewardMocks.bobaTea.pointsRequired)).toBe(0)
  })

  it('never goes negative once overfunded', () => {
    expect(pointsToGo(rewardMocks.bobaTea, rewardMocks.bobaTea.pointsRequired + 500)).toBe(0)
  })
})

describe('claimProgress', () => {
  it('is 0 at zero points against a positive cost', () => {
    expect(claimProgress(rewardMocks.bobaTea, 0)).toBe(0)
  })

  it('is 1 once the cost is met exactly', () => {
    expect(claimProgress(rewardMocks.bobaTea, rewardMocks.bobaTea.pointsRequired)).toBe(1)
  })

  it('caps at 1 rather than reporting over 100%', () => {
    expect(claimProgress(rewardMocks.bobaTea, rewardMocks.bobaTea.pointsRequired * 10)).toBe(1)
  })

  it('is always 1 for a free reward — division-by-zero guard (canon: `pointsRequired > 0 else return 1`)', () => {
    expect(claimProgress(rewardMocks.free, 0)).toBe(1)
  })
})

describe('partitionRewards', () => {
  it('is empty on both sides with no catalog', () => {
    const partition = partitionRewards([], [], 0)
    expect(partition.claimable).toEqual([])
    expect(partition.locked).toEqual([])
  })

  it('splits by affordability against the given balance', () => {
    const partition = partitionRewards(
      [rewardMocks.bobaTea, rewardMocks.weekendTrip],
      [],
      rewardMocks.bobaTea.pointsRequired,
    )
    expect(partition.claimable.map((r) => r.id)).toEqual([rewardMocks.bobaTea.id])
    expect(partition.locked.map((r) => r.id)).toEqual([rewardMocks.weekendTrip.id])
  })

  it('excludes an already-claimed reward from both lanes', () => {
    const partition = partitionRewards(
      [rewardMocks.bobaTea],
      [rewardMocks.bobaTea.id],
      10_000,
    )
    expect(partition.claimable).toEqual([])
    expect(partition.locked).toEqual([])
  })

  it('sorts claimable most-expensive first (canon order)', () => {
    const partition = partitionRewards(
      [rewardMocks.bobaTea, rewardMocks.movieNight],
      [],
      10_000,
    )
    expect(partition.claimable.map((r) => r.id)).toEqual([
      rewardMocks.movieNight.id,
      rewardMocks.bobaTea.id,
    ])
  })

  it('sorts locked cheapest first (canon order)', () => {
    const partition = partitionRewards(
      [rewardMocks.weekendTrip, rewardMocks.movieNight],
      [],
      0,
    )
    expect(partition.locked.map((r) => r.id)).toEqual([
      rewardMocks.movieNight.id,
      rewardMocks.weekendTrip.id,
    ])
  })
})

describe('availableSuggestions', () => {
  it('returns the whole starter catalog when the user catalog is empty', () => {
    expect(availableSuggestions([]).length).toBeGreaterThan(0)
  })

  it('filters out a suggestion already in the catalog, by title', () => {
    const suggestions = availableSuggestions([rewardMocks.bobaTea])
    expect(suggestions.some((s) => s.title === rewardMocks.bobaTea.title)).toBe(false)
  })

  it('matches titles case-insensitively', () => {
    const shouted = { ...rewardMocks.bobaTea, title: rewardMocks.bobaTea.title.toUpperCase() }
    const suggestions = availableSuggestions([shouted])
    expect(suggestions.some((s) => s.title.toLowerCase() === rewardMocks.bobaTea.title.toLowerCase())).toBe(false)
  })
})

describe('isCatalogEmpty', () => {
  it('is false before the first load has run', () => {
    expect(isCatalogEmpty('idle', [])).toBe(false)
  })

  it('is false while a load is in flight', () => {
    expect(isCatalogEmpty('loading', [])).toBe(false)
  })

  it('is true once loaded with nothing in it', () => {
    expect(isCatalogEmpty('loaded', [])).toBe(true)
  })

  it('is false once loaded with rewards present', () => {
    expect(isCatalogEmpty('loaded', [rewardMocks.bobaTea])).toBe(false)
  })

  it(
    'is false on a failed load — never claims "empty" for a read that never ' +
      'succeeded (a preferences-load failure before the first catalog fetch)',
    () => {
      expect(isCatalogEmpty('failed', [])).toBe(false)
    },
  )
})
