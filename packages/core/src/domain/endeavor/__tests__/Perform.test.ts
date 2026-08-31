import { describe, expect, it } from 'vitest'
import {
  performFragmentMocks,
  performMocks,
} from '../__mocks__/EndeavorRelations.mocks'
import {
  PerformResolution,
  makePerform,
  makePerformFragment,
  performFragmentDuration,
  performResolutionFromRawValue,
  performResolutions,
} from '../Perform'

const DATE = new Date(2026, 0, 15, 9, 0, 0)

describe('PerformResolution canon parity', () => {
  it('has canon’s three resolutions in declaration order', () => {
    expect(performResolutions).toEqual(['complete', 'aborted', 'finished'])
  })

  it('round-trips every raw value', () => {
    for (const resolution of performResolutions) {
      expect(performResolutionFromRawValue(resolution)).toBe(resolution)
    }
  })

  it('returns null for an unknown resolution', () => {
    expect(performResolutionFromRawValue('cancelled')).toBeNull()
  })
})

describe('makePerformFragment', () => {
  it('keeps a closed fragment’s two instants', () => {
    const fragment = makePerformFragment({
      startedAt: DATE,
      endedAt: new Date(2026, 0, 15, 9, 25, 0),
    })
    expect(fragment.startedAt).toEqual(DATE)
    expect(fragment.endedAt).toEqual(new Date(2026, 0, 15, 9, 25, 0))
  })

  it('defaults an open fragment’s end to null', () => {
    expect(makePerformFragment({ startedAt: DATE }).endedAt).toBeNull()
  })

  it('keeps an explicit null end', () => {
    expect(makePerformFragment({ startedAt: DATE, endedAt: null }).endedAt).toBeNull()
  })
})

describe('performFragmentDuration', () => {
  it('measures a closed fragment in seconds', () => {
    expect(performFragmentDuration(performFragmentMocks.fullPomodoro)).toBe(1500)
  })

  it('is null while the fragment is still running — never "so far"', () => {
    expect(performFragmentDuration(performFragmentMocks.running)).toBeNull()
  })

  it('is zero for a fragment opened and closed in the same instant', () => {
    expect(performFragmentDuration(performFragmentMocks.zeroLength)).toBe(0)
  })

  it('is negative when the end precedes the start, rather than clamping', () => {
    expect(performFragmentDuration(performFragmentMocks.endsBeforeItStarts)).toBe(
      -1500,
    )
  })

  it('measures across midnight without losing the day boundary', () => {
    expect(performFragmentDuration(performFragmentMocks.acrossMidnight)).toBe(2400)
  })
})

describe('makePerform', () => {
  it('carries every supplied field through unchanged', () => {
    const performance = makePerform({
      date: DATE,
      duration: 1500,
      notes: 'Clean run',
      resolution: PerformResolution.complete,
      sessionFragments: [performFragmentMocks.fullPomodoro],
      rewardPoints: 25,
      followUpNotes: 'None',
      completedAt: new Date(2026, 0, 15, 9, 25, 0),
      wasCompletedInSession: true,
    })
    expect(performance.notes).toBe('Clean run')
    expect(performance.rewardPoints).toBe(25)
    expect(performance.sessionFragments).toHaveLength(1)
    expect(performance.wasCompletedInSession).toBe(true)
  })

  it('applies canon’s defaults for everything optional', () => {
    const performance = makePerform({
      date: DATE,
      duration: 600,
      resolution: PerformResolution.complete,
    })
    expect(performance.notes).toBeNull()
    expect(performance.sessionFragments).toEqual([])
    expect(performance.rewardPoints).toBe(0)
    expect(performance.followUpNotes).toBeNull()
    expect(performance.completedAt).toBeNull()
    expect(performance.wasCompletedInSession).toBe(false)
  })

  it('accepts an aborted attempt with no points and no completion stamp', () => {
    expect(performMocks.abortedEarly.resolution).toBe(PerformResolution.aborted)
    expect(performMocks.abortedEarly.rewardPoints).toBe(0)
    expect(performMocks.abortedEarly.completedAt).toBeNull()
  })

  it('does not reject a zero duration or negative reward points', () => {
    expect(performMocks.zeroDurationInSession.duration).toBe(0)
    expect(performMocks.inconsistentStamps.rewardPoints).toBe(-10)
  })
})
