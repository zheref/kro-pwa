import { EndeavorHost, citizenshipOf } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  TRIAGE_MOCK_NOW,
  triageDayEndeavorFixtures,
  triageDayFixtures,
  triageDecisionFixtures,
  triageEndeavorFixtures,
  triageFixturePool,
  triageFixtureRecords,
  triageMockAt,
  triageSessionSeed,
  triageStateMocks,
} from '../TriageMocks'
import { triageExpiryInvariantHolds } from '../TriageExpiry'

describe('triageEndeavorFixtures', () => {
  it('covers all three citizenships the promotion rule keys on', () => {
    expect(citizenshipOf(triageEndeavorFixtures.unscheduledTask)).toBe(
      'citizen',
    )
    expect(citizenshipOf(triageEndeavorFixtures.touristReminder)).toBe(
      'tourist',
    )
    expect(citizenshipOf(triageEndeavorFixtures.enhancedTask)).toBe('enhanced')
  })

  it('covers the two kinds whose field-relevance guard would no-op', () => {
    expect(triageEndeavorFixtures.habit.kind).toBe('habit')
    expect(triageEndeavorFixtures.calendarEvent.kind).toBe('calendarEvent')
  })

  it('gives every fixture a stable id, so a suite can name one', () => {
    const ids = triageFixturePool.map((endeavor) => endeavor.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('carries a cloud-hosted row, the only one with a remote push target', () => {
    expect(triageEndeavorFixtures.cloudHostedTask.hostedBy).toContain(
      EndeavorHost.supabase,
    )
  })
})

describe('triageDayFixtures', () => {
  it('offers an empty day, a busy morning and a day with no gap at all', () => {
    expect(triageDayFixtures.empty).toHaveLength(0)
    expect(triageDayFixtures.busyMorning).toHaveLength(2)
    expect(triageDayFixtures.fullyBooked).toHaveLength(1)
  })

  it('orders the busy morning’s blocks earliest first', () => {
    const [first, second] = triageDayFixtures.busyMorning

    expect(first?.start.getTime()).toBeLessThan(
      second?.start.getTime() ?? Number.POSITIVE_INFINITY,
    )
  })

  it('leaves a 15-minute hole the 25-minute case cannot use', () => {
    const [first, second] = triageDayFixtures.busyMorning
    const holeMinutes =
      ((second?.start.getTime() ?? 0) - (first?.end.getTime() ?? 0)) / 60_000

    expect(holeMinutes).toBe(15)
  })

  it('is built from endeavors on the mock day', () => {
    for (const endeavor of triageDayEndeavorFixtures) {
      expect(endeavor.start?.getDate()).toBe(TRIAGE_MOCK_NOW.getDate())
    }
  })
})

describe('triageStateMocks', () => {
  it('is built by the real Shifters, so no state here is unreachable', () => {
    expect(triageStateMocks.pristine.load.kind).toBe('loaded')
    expect(triageStateMocks.pristine.session).not.toBeNull()
  })

  it('leaves the pristine screen with no quadrant and a closed gate', () => {
    expect(triageStateMocks.pristine.session?.form.quadrant).toBeNull()
  })

  it('holds the expiry invariant in every state', () => {
    for (const state of Object.values(triageStateMocks)) {
      const form = state.session?.form
      if (form === undefined) continue
      expect(
        triageExpiryInvariantHolds({
          scheduled: form.dueDate,
          expiry: form.expiry,
        }),
      ).toBe(true)
    }
  })

  it('carries a save that succeeded and one that failed locally', () => {
    expect(triageStateMocks.savedLocalOnly.save.kind).toBe('saved')
    expect(triageStateMocks.saveFailed.save.kind).toBe('failed')
  })

  it('seeds the Schedule state one week out with a matching expiry', () => {
    expect(triageStateMocks.scheduled.session?.form.dueDate).toEqual(
      triageMockAt(24, 10, 7),
    )
    expect(triageStateMocks.scheduled.session?.form.expiry).toEqual(
      triageMockAt(24, 11, 7),
    )
  })
})

describe('triageSessionSeed', () => {
  it('defaults to the plain unscheduled task on an empty day', () => {
    const seed = triageSessionSeed()

    expect(seed.endeavor.id).toBe(triageEndeavorFixtures.unscheduledTask.id)
    expect(seed.busyIntervals).toHaveLength(0)
  })

  it('accepts an override without losing the other defaults', () => {
    const seed = triageSessionSeed({ isEditReachable: true })

    expect(seed.isEditReachable).toBe(true)
    expect(seed.now).toEqual(TRIAGE_MOCK_NOW)
  })

  it('offers canon’s nine duration chips', () => {
    expect(triageSessionSeed().durationOptionsMinutes).toEqual([
      1, 5, 15, 25, 45, 60, 90, 120, 180,
    ])
  })
})

describe('triageFixtureRecords', () => {
  it('encodes every fixture, so a Producer suite seeds one store', () => {
    expect(triageFixtureRecords()).toHaveLength(triageFixturePool.length)
  })

  it('stamps the write watermark from the supplied instant', () => {
    const records = triageFixtureRecords(triageMockAt(18, 9))

    for (const record of records) {
      expect(record.updatedAtEpochMillis).toBe(triageMockAt(18, 9).getTime())
    }
  })

  it('leaves every row unconfirmed, so a fresh fixture is dirty by definition', () => {
    for (const record of triageFixtureRecords()) {
      expect(record.lastSyncedAtEpochMillis).toBeNull()
    }
  })
})

describe('triageDecisionFixtures', () => {
  it('covers all three scheduling branches plus archive', () => {
    expect(triageDecisionFixtures.dueAndDuration.durationSeconds).not.toBeNull()
    expect(triageDecisionFixtures.dueAndDuration.dueDate).not.toBeNull()
    expect(triageDecisionFixtures.dueOnly.durationSeconds).toBeNull()
    expect(triageDecisionFixtures.durationOnly.dueDate).toBeNull()
    expect(triageDecisionFixtures.archive.quadrant).toBe('delete')
  })

  it('points the duration-only decision at an endeavor that has a start', () => {
    expect(triageDecisionFixtures.durationOnly.endeavorId).toBe(
      triageEndeavorFixtures.startOnlyTask.id,
    )
    expect(triageEndeavorFixtures.startOnlyTask.start).not.toBeNull()
  })

  it('gives the archive decision fields it must be seen to ignore', () => {
    expect(triageDecisionFixtures.archive.rewardPoints).toBe(99)
    expect(triageDecisionFixtures.archive.value).toBe(5)
  })
})
