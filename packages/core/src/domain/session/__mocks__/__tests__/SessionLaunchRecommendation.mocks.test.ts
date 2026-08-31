import { describe, expect, it } from 'vitest'
import { FocusTimerMode } from '../../FocusTimerMode'
import { EMPIRICAL_SAMPLE_MINIMUM } from '../../SessionLaunchRecommendation'
import {
  allSessionLaunchRecommendationMocks,
  sessionLaunchRecommendationMocks,
} from '../SessionLaunchRecommendation.mocks'

describe('the SessionLaunchRecommendation mock spread', () => {
  it('offers at least the seven RC-13 variants', () => {
    expect(allSessionLaunchRecommendationMocks.length).toBeGreaterThanOrEqual(7)
  })

  it('covers all four launch sources, which are the four rungs of the priority', () => {
    const sources = new Set(
      allSessionLaunchRecommendationMocks.map(
        (recommendation) => recommendation.source.kind,
      ),
    )
    expect(sources).toEqual(
      new Set(['preferred', 'empirical', 'stopwatch', 'fallback']),
    )
  })

  it('pairs every non-stopwatch source with countdown mode', () => {
    for (const recommendation of allSessionLaunchRecommendationMocks) {
      if (recommendation.source.kind === 'stopwatch') {
        expect(recommendation.mode).toBe(FocusTimerMode.stopwatch)
      } else {
        expect(recommendation.mode).toBe(FocusTimerMode.countdown)
      }
    }
  })

  it('includes an empirical fixture at exactly the minimum sample count', () => {
    const minimal = sessionLaunchRecommendationMocks.empiricalAtMinimumSamples
    expect(minimal.source).toEqual({
      kind: 'empirical',
      sampleCount: EMPIRICAL_SAMPLE_MINIMUM,
    })
  })

  it('includes an empirical fixture with a four-digit sample count', () => {
    const long = sessionLaunchRecommendationMocks.empiricalFromLongHistory
    expect(long.source.kind).toBe('empirical')
    if (long.source.kind === 'empirical') {
      expect(long.source.sampleCount).toBeGreaterThan(999)
    }
  })

  it('includes a stopwatch fixture with a zero target — nothing to toggle back to', () => {
    expect(
      sessionLaunchRecommendationMocks.stopwatchWithZeroTarget.targetDuration,
    ).toBe(0)
  })

  it('spans a wide range of targets, from one minute to twelve hours', () => {
    const targets = allSessionLaunchRecommendationMocks.map(
      (recommendation) => recommendation.targetDuration,
    )
    expect(Math.min(...targets)).toBe(0)
    expect(Math.max(...targets)).toBe(12 * 60 * 60)
  })
})
