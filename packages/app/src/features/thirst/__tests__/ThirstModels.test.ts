import { describe, expect, it } from 'vitest'
import {
  ALL_VOTE_PLATFORMS,
  VotePlatform,
  bumpVotePlatform,
  countFor,
  emptyFeatureVoteCounts,
  perPlatformTalliesFor,
  votePlatformLabel,
} from '../ThirstModels'

describe('emptyFeatureVoteCounts', () => {
  it('has a zero total and no per-platform entries', () => {
    const counts = emptyFeatureVoteCounts('matrix')
    expect(counts).toEqual({ featureKey: 'matrix', total: 0, perPlatform: {} })
  })
})

describe('countFor', () => {
  it('reads a platform present in the map', () => {
    const counts = { featureKey: 'matrix', total: 5, perPlatform: { ios: 5 } }
    expect(countFor(counts, VotePlatform.ios)).toBe(5)
  })

  it('reports 0 for a platform absent from the map', () => {
    const counts = emptyFeatureVoteCounts('matrix')
    expect(countFor(counts, VotePlatform.web)).toBe(0)
  })
})

describe('bumpVotePlatform', () => {
  it('increments the total and the platform tally together', () => {
    const before = { featureKey: 'matrix', total: 10, perPlatform: { ios: 10 } }
    const after = bumpVotePlatform(before, 'matrix', VotePlatform.web)
    expect(after.total).toBe(11)
    expect(after.perPlatform.web).toBe(1)
    expect(after.perPlatform.ios).toBe(10)
  })

  it('starts from empty when counts have never loaded (a vote confirmed before any fetch)', () => {
    const after = bumpVotePlatform(null, 'matrix', VotePlatform.web)
    expect(after).toEqual({
      featureKey: 'matrix',
      total: 1,
      perPlatform: { web: 1 },
    })
  })

  it('adds to an existing web tally rather than overwriting it', () => {
    const before = {
      featureKey: 'matrix',
      total: 3,
      perPlatform: { web: 2, ios: 1 },
    }
    const after = bumpVotePlatform(before, 'matrix', VotePlatform.web)
    expect(after.perPlatform.web).toBe(3)
  })
})

describe('perPlatformTalliesFor', () => {
  it('omits platforms with zero votes', () => {
    const counts = {
      featureKey: 'matrix',
      total: 30,
      perPlatform: { ios: 30, android: 0 },
    }
    expect(perPlatformTalliesFor(counts)).toEqual([
      { platform: 'ios', count: 30 },
    ])
  })

  it('orders tallies by the canon platform order, not insertion order', () => {
    const counts = {
      featureKey: 'matrix',
      total: 3,
      perPlatform: { windows: 1, ios: 1, web: 1 },
    }
    expect(
      perPlatformTalliesFor(counts).map((tally) => tally.platform),
    ).toEqual(['ios', 'web', 'windows'])
  })

  it('returns an empty list for a feature with no votes at all', () => {
    expect(perPlatformTalliesFor(emptyFeatureVoteCounts('matrix'))).toEqual([])
  })
})

describe('votePlatformLabel', () => {
  it.each(ALL_VOTE_PLATFORMS)('gives %s a non-empty label', (platform) => {
    expect(votePlatformLabel(platform).length).toBeGreaterThan(0)
  })

  it('reads "Web" for the platform this app always casts', () => {
    expect(votePlatformLabel(VotePlatform.web)).toBe('Web')
  })
})
