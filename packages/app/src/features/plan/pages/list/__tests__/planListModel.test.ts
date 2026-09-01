/**
 * The list model's rules, asserted against canon's own two partitions.
 *
 * Every case names the day it describes rather than the branch it covers
 * (`UZF-20`): "the meeting that is happening right now", not "ongoing === true".
 */
import { PlanListGrouping, PlanListSort } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { planAt } from '../../../PlanMocks'
import {
  PlanListBucket,
  PlanTimeOfDayBand,
  isPlanListAllDay,
  planListBucketFor,
  planListBucketTitle,
  planListBuckets,
  planListComparator,
  planListPriorityTier,
  planListSections,
  planListSortDate,
  planListSorted,
  planTimeOfDayBandFor,
  planTimeOfDayBandTitle,
  planTimeOfDayBands,
} from '../planListModel'
import {
  PLAN_LIST_NOW,
  planListBucketFixtures,
  planListMixedDay,
  planListProjectDay,
  planListSortDay,
  planListTimeOfDayDay,
} from '../planListMocks'

const now = PLAN_LIST_NOW

describe('isPlanListAllDay', () => {
  it('is true for a calendar event with a start and no duration — the offsite', () => {
    expect(isPlanListAllDay(planListBucketFixtures.allDay)).toBe(true)
  })

  it('is false for a timed calendar event — the vendor call has a duration', () => {
    expect(isPlanListAllDay(planListBucketFixtures.comingNext)).toBe(false)
  })

  it('is false for a durationless TASK — an untimed to-do is not an all-day event', () => {
    expect(isPlanListAllDay(planListBucketFixtures.untimedDueToday)).toBe(false)
  })
})

describe('planListBucketFor', () => {
  it('files the all-day offsite in All Day, ahead of every temporal rule', () => {
    expect(planListBucketFor(planListBucketFixtures.allDay, now)).toBe(
      PlanListBucket.allDay,
    )
  })

  it('files the 09:00–10:00 deep-work block as Ongoing at 09:40', () => {
    expect(planListBucketFor(planListBucketFixtures.ongoing, now)).toBe(
      PlanListBucket.ongoing,
    )
  })

  it('files breakfast, which ended at 08:30, as Past', () => {
    expect(planListBucketFor(planListBucketFixtures.past, now)).toBe(
      PlanListBucket.past,
    )
  })

  it('files the 14:00 vendor call as Coming Next', () => {
    expect(planListBucketFor(planListBucketFixtures.comingNext, now)).toBe(
      PlanListBucket.comingNext,
    )
  })

  it('treats an untimed task due at 16:00 as Coming Next — due is the anchor', () => {
    expect(planListBucketFor(planListBucketFixtures.untimedDueToday, now)).toBe(
      PlanListBucket.comingNext,
    )
  })

  it('treats an untimed task due at 08:00 as Past — its implied hour has run out', () => {
    expect(planListBucketFor(planListBucketFixtures.untimedOverdue, now)).toBe(
      PlanListBucket.past,
    )
  })

  it('treats an untimed task due within the last hour as Ongoing', () => {
    const dueJustNow = {
      ...planListBucketFixtures.untimedDueToday,
      due: planAt(9, 30),
    }
    expect(planListBucketFor(dueJustNow, now)).toBe(PlanListBucket.ongoing)
  })

  it('files a row with no schedule at all under Coming Next, never Past', () => {
    expect(planListBucketFor(planListBucketFixtures.unscheduled, now)).toBe(
      PlanListBucket.comingNext,
    )
  })

  it('files a task due on an earlier DAY as Past without an implied hour', () => {
    const yesterday = {
      ...planListBucketFixtures.untimedDueToday,
      due: new Date(planAt(16).getTime() - 86_400_000),
    }
    expect(planListBucketFor(yesterday, now)).toBe(PlanListBucket.past)
  })
})

describe('planListBucketTitle', () => {
  it('names the four buckets exactly as canon does', () => {
    expect(planListBuckets.map(planListBucketTitle)).toEqual([
      'All Day',
      'Past Events',
      'Ongoing',
      'Coming Next',
    ])
  })

  it('calls the past bucket "Past Events", not "Past"', () => {
    expect(planListBucketTitle(PlanListBucket.past)).toBe('Past Events')
  })

  it('keeps the ongoing bucket a single word, as the pulsing header expects', () => {
    expect(planListBucketTitle(PlanListBucket.ongoing)).toBe('Ongoing')
  })
})

describe('planListSortDate', () => {
  it('reads a timed row by its start', () => {
    expect(planListSortDate(planListBucketFixtures.ongoing)).toBe(
      planAt(9).getTime(),
    )
  })

  it('falls back to the due date for an untimed row', () => {
    expect(planListSortDate(planListBucketFixtures.untimedDueToday)).toBe(
      planAt(16).getTime(),
    )
  })

  it('floats an unscheduled row to the end of its section', () => {
    expect(planListSortDate(planListBucketFixtures.unscheduled)).toBe(
      Number.POSITIVE_INFINITY,
    )
  })
})

describe('planListPriorityTier', () => {
  it('puts an overdue row first — tier 0', () => {
    expect(
      planListPriorityTier(planListBucketFixtures.untimedOverdue, now),
    ).toBe(0)
  })

  it('puts a row still due today second — tier 1', () => {
    expect(
      planListPriorityTier(planListBucketFixtures.untimedDueToday, now),
    ).toBe(1)
  })

  it('puts a row with no due date last — tier 2, same as due later', () => {
    expect(planListPriorityTier(planListBucketFixtures.unscheduled, now)).toBe(
      2,
    )
  })
})

describe('planListComparator', () => {
  it('orders by start under Time, floating the untimed row to the end', () => {
    const ordered = planListSorted(planListSortDay, PlanListSort.time, now)
    expect(ordered.map((endeavor) => endeavor.id)).toEqual([
      // None of the three has a start, so Time falls back to title then id —
      // canon's documented tie behaviour for a fully untimed run.
      'sort-a',
      'sort-b',
      'sort-c',
    ])
  })

  it('orders case-insensitively under Title — "café" sorts beside "beta"', () => {
    const ordered = planListSorted(planListSortDay, PlanListSort.title, now)
    expect(ordered.map((endeavor) => endeavor.id)).toEqual([
      'sort-a',
      'sort-b',
      'sort-c',
    ])
  })

  it('puts the overdue row first under Priority, whatever its title', () => {
    const ordered = planListSorted(planListSortDay, PlanListSort.priority, now)
    expect(ordered[0]?.id).toBe('sort-a')
    expect(ordered.at(-1)?.id).toBe('sort-b')
  })

  it('breaks an exact tie by id, so equal rows never depend on sort stability', () => {
    const left = { ...planListSortDay[0]!, id: 'aaa', title: 'Same' }
    const right = { ...planListSortDay[0]!, id: 'zzz', title: 'Same' }
    const compare = planListComparator(PlanListSort.title, now)
    expect(compare(left, right)).toBeLessThan(0)
    expect(compare(right, left)).toBeGreaterThan(0)
  })

  it('never mutates the array it is handed', () => {
    const input = [...planListSortDay]
    planListSorted(input, PlanListSort.title, now)
    expect(input.map((endeavor) => endeavor.id)).toEqual([
      'sort-c',
      'sort-a',
      'sort-b',
    ])
  })
})

describe('planTimeOfDayBandFor', () => {
  it('files a 09:15 standup in the Morning band', () => {
    expect(planTimeOfDayBandFor(planListTimeOfDayDay[0]!)).toBe(
      PlanTimeOfDayBand.morning,
    )
  })

  it('files a 13:00 lab block in the Afternoon band — noon is the boundary', () => {
    expect(planTimeOfDayBandFor(planListTimeOfDayDay[1]!)).toBe(
      PlanTimeOfDayBand.afternoon,
    )
  })

  it('files a 19:00 dinner in the Evening band — 17:00 is the boundary', () => {
    expect(planTimeOfDayBandFor(planListTimeOfDayDay[2]!)).toBe(
      PlanTimeOfDayBand.evening,
    )
  })

  it('files a row with no moment at all in the Evening band, as canon does', () => {
    expect(planTimeOfDayBandFor(planListBucketFixtures.unscheduled)).toBe(
      PlanTimeOfDayBand.evening,
    )
  })

  it('names the three bands exactly as canon does', () => {
    expect(planTimeOfDayBands.map(planTimeOfDayBandTitle)).toEqual([
      'Morning',
      'Afternoon',
      'Evening',
    ])
  })
})

describe('planListSections', () => {
  it('renders NO sections for an empty day — the surface shows its empty state', () => {
    expect(
      planListSections({ endeavors: [], grouping: PlanListGrouping.none, now }),
    ).toEqual([])
  })

  it('renders the four temporal buckets under None, in canon order', () => {
    const sections = planListSections({
      endeavors: planListMixedDay,
      grouping: PlanListGrouping.none,
      now,
    })
    expect(sections.map((section) => section.title)).toEqual([
      'All Day',
      'Past Events',
      'Ongoing',
      'Coming Next',
    ])
  })

  it('omits a temporal bucket nobody is in — no empty "Ongoing" header', () => {
    const sections = planListSections({
      endeavors: [planListBucketFixtures.comingNext],
      grouping: PlanListGrouping.none,
      now,
    })
    expect(sections.map((section) => section.id)).toEqual(['comingNext'])
  })

  it('marks only the Ongoing bucket as the one that pulses', () => {
    const sections = planListSections({
      endeavors: planListMixedDay,
      grouping: PlanListGrouping.none,
      now,
    })
    expect(
      sections.filter((section) => section.isOngoing).map((s) => s.id),
    ).toEqual(['ongoing'])
  })

  it('orders a temporal bucket chronologically, whatever the list sort is', () => {
    const sections = planListSections({
      endeavors: planListMixedDay,
      grouping: PlanListGrouping.none,
      now,
    })
    const past = sections.find((section) => section.id === 'past')
    // Breakfast starts at 07:30, the permit is due at 08:00 — the section is
    // ordered by each row's own moment, not by whether it was timed.
    expect(past?.endeavors.map((endeavor) => endeavor.id)).toEqual([
      'list-past',
      'list-untimed-overdue',
    ])
  })

  it('groups by project id and puts the unassigned rows in a trailing section', () => {
    const sections = planListSections({
      endeavors: planListProjectDay,
      grouping: PlanListGrouping.project,
      now,
    })
    expect(sections.map((section) => section.id)).toEqual([
      'atlas',
      'borealis',
      'noProject',
    ])
    expect(sections.at(-1)?.title).toBe('No project')
  })

  it('omits the "No project" section when every row has one', () => {
    const sections = planListSections({
      endeavors: planListProjectDay.filter(
        (endeavor) => endeavor.projectId !== null,
      ),
      grouping: PlanListGrouping.project,
      now,
    })
    expect(sections.map((section) => section.id)).toEqual(['atlas', 'borealis'])
  })

  it('buckets the day into Morning / Afternoon / Evening under Time of day', () => {
    const sections = planListSections({
      endeavors: planListTimeOfDayDay,
      grouping: PlanListGrouping.timeOfDay,
      now,
    })
    expect(sections.map((section) => section.title)).toEqual([
      'Morning',
      'Afternoon',
      'Evening',
    ])
  })

  it('omits an empty time-of-day band rather than drawing a bare header', () => {
    const sections = planListSections({
      endeavors: [planListTimeOfDayDay[2]!],
      grouping: PlanListGrouping.timeOfDay,
      now,
    })
    expect(sections.map((section) => section.id)).toEqual(['evening'])
  })

  it('never marks a preference-driven section as the pulsing one', () => {
    const sections = planListSections({
      endeavors: planListProjectDay,
      grouping: PlanListGrouping.project,
      now,
    })
    expect(sections.every((section) => !section.isOngoing)).toBe(true)
  })
})
