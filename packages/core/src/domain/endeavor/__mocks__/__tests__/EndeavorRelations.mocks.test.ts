/**
 * Integrity of the four relation-model fixture spreads. Each owes `RC-13` at
 * least seven variants; the awkward ones are asserted individually, because a
 * well-meaning tidy-up is exactly what would remove them.
 */
import { describe, expect, it } from 'vitest'
import {
  allDeferMocks,
  allPerformFragmentMocks,
  allPerformMocks,
  allRepeatConfigMocks,
  allShadowMocks,
  deferMocks,
  performFragmentMocks,
  performMocks,
  repeatConfigMocks,
  shadowMocks,
} from '../EndeavorRelations.mocks'

describe('spread sizes', () => {
  it('offers at least seven of each relation model', () => {
    expect(allRepeatConfigMocks.length).toBeGreaterThanOrEqual(7)
    expect(allDeferMocks.length).toBeGreaterThanOrEqual(7)
    expect(allPerformFragmentMocks.length).toBeGreaterThanOrEqual(7)
    expect(allPerformMocks.length).toBeGreaterThanOrEqual(7)
    expect(allShadowMocks.length).toBeGreaterThanOrEqual(7)
  })
})

describe('repeatConfigMocks', () => {
  it('covers all four bases', () => {
    expect(
      new Set(allRepeatConfigMocks.map((config) => config.base.type)),
    ).toEqual(new Set(['daily', 'weekly', 'monthly', 'yearly']))
  })

  it('keeps the empty-weekday case, which means "never fires"', () => {
    expect(repeatConfigMocks.weeklyWithNoDays.base).toEqual({
      type: 'weekly',
      weekdays: [],
    })
  })

  it('keeps a day-31 rule and a leap-day rule', () => {
    expect(repeatConfigMocks.monthlyThirtyFirst.base).toEqual({
      type: 'monthly',
      day: 31,
    })
    expect(repeatConfigMocks.leapDayEveryFourthYear.base).toEqual({
      type: 'yearly',
      day: 29,
      month: 2,
    })
  })

  it('exercises everyOther beyond the default of 1', () => {
    expect(
      allRepeatConfigMocks.some((config) => config.everyOther > 1),
    ).toBe(true)
  })
})

describe('deferMocks', () => {
  it('includes one with no reason and one with an empty reason', () => {
    expect(deferMocks.noReason.reason).toBeNull()
    expect(deferMocks.zeroLength.reason).toBe('')
  })

  it('includes a backwards deferral and a zero-length one', () => {
    expect(deferMocks.targetInThePast.target.getTime()).toBeLessThan(
      deferMocks.targetInThePast.made.getTime(),
    )
    expect(deferMocks.zeroLength.target.getTime()).toBe(
      deferMocks.zeroLength.made.getTime(),
    )
  })

  it('includes a reason longer than any caption', () => {
    expect((deferMocks.essayReason.reason ?? '').length).toBeGreaterThan(200)
  })
})

describe('performFragmentMocks / performMocks', () => {
  it('includes an open fragment with no end', () => {
    expect(performFragmentMocks.running.endedAt).toBeNull()
  })

  it('includes a zero-length and a backwards fragment', () => {
    expect(performFragmentMocks.zeroLength.endedAt).toEqual(
      performFragmentMocks.zeroLength.startedAt,
    )
    expect(
      (performFragmentMocks.endsBeforeItStarts.endedAt as Date).getTime(),
    ).toBeLessThan(performFragmentMocks.endsBeforeItStarts.startedAt.getTime())
  })

  it('covers all three resolutions', () => {
    expect(
      new Set(allPerformMocks.map((performance) => performance.resolution)),
    ).toEqual(new Set(['complete', 'aborted', 'finished']))
  })

  it('includes a zero-duration in-session record and a negative-points record', () => {
    expect(performMocks.zeroDurationInSession.duration).toBe(0)
    expect(performMocks.zeroDurationInSession.wasCompletedInSession).toBe(true)
    expect(performMocks.inconsistentStamps.rewardPoints).toBeLessThan(0)
  })

  it('includes a multi-fragment performance', () => {
    expect(
      performMocks.twoFragmentDeepWork.sessionFragments.length,
    ).toBeGreaterThan(1)
  })
})

describe('shadowMocks', () => {
  it('separates "no priority" (0) from "no metadata" (null)', () => {
    expect(shadowMocks.appleHabit.appleReminderPriority).toBe(0)
    expect(shadowMocks.legacyWithoutPriority.appleReminderPriority).toBeNull()
  })

  it('includes the empty sentinel shape', () => {
    expect(shadowMocks.nothing.originalTitle).toBe('')
    expect(shadowMocks.nothing.sourceIdentifier).toBe('')
  })

  it('gives every fixture a distinct source identifier except the sentinel', () => {
    const identifiers = allShadowMocks
      .map((shadow) => shadow.sourceIdentifier)
      .filter((identifier) => identifier !== '')
    expect(new Set(identifiers).size).toBe(identifiers.length)
  })

  it('spans more than one provider', () => {
    expect(new Set(allShadowMocks.map((shadow) => shadow.source)).size).toBeGreaterThan(
      2,
    )
  })
})
