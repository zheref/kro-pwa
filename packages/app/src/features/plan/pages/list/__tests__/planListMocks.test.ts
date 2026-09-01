/**
 * The list fixtures are only worth anything if each one really is the day it
 * claims to be — a "past" row that is actually ongoing would make every
 * bucket assertion in this lane pass for the wrong reason.
 */
import { describe, expect, it } from 'vitest'
import {
  PlanListBucket,
  PlanTimeOfDayBand,
  planListBucketFor,
  planTimeOfDayBandFor,
} from '../planListModel'
import {
  PLAN_LIST_NOW,
  planListBucketFixtures,
  planListMixedDay,
  planListProjectDay,
  planListSortDay,
  planListTimeOfDayDay,
} from '../planListMocks'

describe('planListBucketFixtures', () => {
  it('puts exactly one fixture in each of the four temporal buckets', () => {
    const buckets = [
      planListBucketFixtures.allDay,
      planListBucketFixtures.past,
      planListBucketFixtures.ongoing,
      planListBucketFixtures.comingNext,
    ].map((endeavor) => planListBucketFor(endeavor, PLAN_LIST_NOW))

    expect(buckets).toEqual([
      PlanListBucket.allDay,
      PlanListBucket.past,
      PlanListBucket.ongoing,
      PlanListBucket.comingNext,
    ])
  })

  it('ships the two untimed shapes the day fetch cannot return', () => {
    expect(planListBucketFixtures.untimedDueToday.start).toBeNull()
    expect(planListBucketFixtures.untimedOverdue.start).toBeNull()
    expect(planListBucketFixtures.untimedDueToday.due).not.toBeNull()
  })

  it('ships a row with no schedule at all, for the fallback branch', () => {
    expect(planListBucketFixtures.unscheduled.start).toBeNull()
    expect(planListBucketFixtures.unscheduled.due).toBeNull()
  })
})

describe('planListMixedDay', () => {
  it('arrives unsorted, so a section order proves the sort ran', () => {
    const starts = planListMixedDay.map(
      (endeavor) => endeavor.start?.getTime() ?? Number.POSITIVE_INFINITY,
    )
    expect([...starts]).not.toEqual([...starts].sort((a, b) => a - b))
  })

  it('covers every id exactly once', () => {
    const ids = planListMixedDay.map((endeavor) => endeavor.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has at least one row in each of the four buckets', () => {
    const buckets = new Set(
      planListMixedDay.map((endeavor) =>
        planListBucketFor(endeavor, PLAN_LIST_NOW),
      ),
    )
    expect(buckets.size).toBe(4)
  })
})

describe('planListProjectDay', () => {
  it('carries two named projects and one unassigned row', () => {
    const projects = planListProjectDay.map((endeavor) => endeavor.projectId)
    expect(new Set(projects)).toEqual(new Set(['atlas', 'borealis', null]))
  })

  it('mixes kinds inside one project, as a real day does', () => {
    const atlas = planListProjectDay.filter(
      (endeavor) => endeavor.projectId === 'atlas',
    )
    expect(new Set(atlas.map((endeavor) => endeavor.kind)).size).toBe(2)
  })

  it('gives the unassigned row a due date, so it is on the day at all', () => {
    const none = planListProjectDay.find(
      (endeavor) => endeavor.projectId === null,
    )
    expect(none?.due).not.toBeNull()
  })
})

describe('planListTimeOfDayDay', () => {
  it('puts one row in each band, so no band is omitted by accident', () => {
    expect(planListTimeOfDayDay.map(planTimeOfDayBandFor)).toEqual([
      PlanTimeOfDayBand.morning,
      PlanTimeOfDayBand.afternoon,
      PlanTimeOfDayBand.evening,
    ])
  })

  it('ships three rows and no more', () => {
    expect(planListTimeOfDayDay).toHaveLength(3)
  })

  it('gives every band row a start, so the band is read from the row itself', () => {
    expect(
      planListTimeOfDayDay.every((endeavor) => endeavor.start !== null),
    ).toBe(true)
  })
})

describe('planListSortDay', () => {
  it('mixes case and an accent, so Title is really doing a locale compare', () => {
    expect(planListSortDay.map((endeavor) => endeavor.title)).toEqual([
      'café au lait',
      'Alpha',
      'beta',
    ])
  })

  it('spans all three priority tiers — overdue, due today, and no due date', () => {
    expect(planListSortDay.map((endeavor) => endeavor.due === null)).toEqual([
      false,
      false,
      true,
    ])
  })

  it('gives no row a start, so Time falls through to its title tiebreak', () => {
    expect(planListSortDay.every((endeavor) => endeavor.start === null)).toBe(
      true,
    )
  })
})
