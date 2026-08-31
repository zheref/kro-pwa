import { EisenhowerQuadrant } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  TRIAGE_MOCK_NOW,
  triageDayEndeavorFixtures,
  triageDayFixtures,
  triageEndeavorFixtures,
  triageMockAt,
} from '../TriageMocks'
import {
  TRIAGE_QUARTER_HOUR_MINUTES,
  TRIAGE_SCHEDULE_LEAD_DAYS,
  defaultTriageDueDate,
  endOfTriageDay,
  nextTriageQuarterHour,
  soonestOpenTriageGap,
  triageBusyIntervalsFor,
} from '../TriageScheduling'

const inputs = (
  overrides: {
    durationSeconds?: number | null
    busyIntervals?: typeof triageDayFixtures.empty
    nextFreeSlotToday?: Date | null
    now?: Date
  } = {},
) => ({
  now: overrides.now ?? TRIAGE_MOCK_NOW,
  durationSeconds:
    overrides.durationSeconds === undefined ? null : overrides.durationSeconds,
  busyIntervals: overrides.busyIntervals ?? triageDayFixtures.empty,
  nextFreeSlotToday: overrides.nextFreeSlotToday ?? null,
})

describe('the scheduling constants', () => {
  it('snaps to the quarter hour every other surface uses', () => {
    expect(TRIAGE_QUARTER_HOUR_MINUTES).toBe(15)
  })

  it('leads the Schedule quadrant by a week', () => {
    expect(TRIAGE_SCHEDULE_LEAD_DAYS).toBe(7)
  })

  it('produces a slot on the quarter-hour grain', () => {
    expect(
      nextTriageQuarterHour(TRIAGE_MOCK_NOW).getMinutes() %
        TRIAGE_QUARTER_HOUR_MINUTES,
    ).toBe(0)
  })
})

describe('nextTriageQuarterHour', () => {
  it('rounds 10:07 up to 10:15 — never a slot that has already begun', () => {
    expect(nextTriageQuarterHour(TRIAGE_MOCK_NOW)).toEqual(
      triageMockAt(17, 10, 15),
    )
  })

  it('moves strictly forward from a quarter hour — 10:00 offers 10:15', () => {
    expect(nextTriageQuarterHour(triageMockAt(17, 10))).toEqual(
      triageMockAt(17, 10, 15),
    )
  })

  it('rolls the hour over — 10:59 offers 11:00', () => {
    expect(nextTriageQuarterHour(triageMockAt(17, 10, 59))).toEqual(
      triageMockAt(17, 11),
    )
  })

  it('drops seconds — 10:07:41 still offers 10:15:00', () => {
    const slot = nextTriageQuarterHour(triageMockAt(17, 10, 7, 41))
    expect(slot).toEqual(triageMockAt(17, 10, 15))
    expect(slot.getSeconds()).toBe(0)
  })
})

describe('endOfTriageDay', () => {
  it('is 23:59:00 on the reference day', () => {
    expect(endOfTriageDay(TRIAGE_MOCK_NOW)).toEqual(triageMockAt(17, 23, 59))
  })

  it('stays on the reference day even late at night', () => {
    expect(endOfTriageDay(triageMockAt(17, 23, 58))).toEqual(
      triageMockAt(17, 23, 59),
    )
  })

  it('drops seconds and milliseconds', () => {
    const end = endOfTriageDay(triageMockAt(17, 9, 3, 27))
    expect(end.getSeconds()).toBe(0)
    expect(end.getMilliseconds()).toBe(0)
  })
})

describe('triageBusyIntervalsFor', () => {
  it('turns the day’s timed endeavors into sorted [start, end) blocks', () => {
    expect(triageDayFixtures.busyMorning).toEqual([
      { start: triageMockAt(17, 10), end: triageMockAt(17, 11) },
      { start: triageMockAt(17, 11, 15), end: triageMockAt(17, 11, 45) },
    ])
  })

  it('ignores an endeavor on another day — yesterday’s standup is not today’s', () => {
    const intervals = triageBusyIntervalsFor(
      triageDayEndeavorFixtures,
      triageMockAt(18, 10),
    )

    expect(intervals).toHaveLength(0)
  })

  it('ignores an unscheduled endeavor — it occupies no block', () => {
    const intervals = triageBusyIntervalsFor(
      [triageEndeavorFixtures.unscheduledTask],
      TRIAGE_MOCK_NOW,
    )

    expect(intervals).toHaveLength(0)
  })

  it('gives a duration-less endeavor a zero-length block, which blocks nothing', () => {
    const intervals = triageBusyIntervalsFor(
      [triageEndeavorFixtures.startNoDurationTask],
      TRIAGE_MOCK_NOW,
    )

    expect(intervals).toHaveLength(1)
    expect(intervals[0]?.start).toEqual(intervals[0]?.end)
    expect(
      soonestOpenTriageGap({
        intervals,
        now: triageMockAt(17, 12, 55),
        durationSeconds: 60 * 60,
      }),
    ).toEqual(triageMockAt(17, 13))
  })
})

/**
 * The doc's rule — *"the soonest open calendar gap big enough to cover the task
 * duration"* — as a table over the `busyMorning` fixture (10:00–11:00 and
 * 11:15–11:45), from 10:07.
 *
 * The 15 / 25 rows are the pair that matters: a duration-blind search cannot
 * tell them apart, because both start life at the same colliding candidate.
 */
describe('soonestOpenTriageGap', () => {
  it.each([
    [
      null,
      triageMockAt(17, 11),
      'no estimate steps past the block it lands in',
    ],
    [
      15 * 60,
      triageMockAt(17, 11),
      'a 15-minute task fits in the 11:00–11:15 gap',
    ],
    [
      25 * 60,
      triageMockAt(17, 11, 45),
      'a 25-minute task does NOT fit that gap and waits for 11:45',
    ],
    [
      60 * 60,
      triageMockAt(17, 11, 45),
      'an hour-long task waits for the same open afternoon',
    ],
  ] as const)(
    'duration %s → %s (%s)',
    (durationSeconds, expected, _scenario) => {
      expect(
        soonestOpenTriageGap({
          intervals: triageDayFixtures.busyMorning,
          now: TRIAGE_MOCK_NOW,
          durationSeconds,
        }),
      ).toEqual(expected)
    },
  )

  it('offers the next quarter hour outright on an empty day', () => {
    expect(
      soonestOpenTriageGap({
        intervals: triageDayFixtures.empty,
        now: TRIAGE_MOCK_NOW,
        durationSeconds: 45 * 60,
      }),
    ).toEqual(triageMockAt(17, 10, 15))
  })

  it('falls back to end of day when the day has no gap at all', () => {
    expect(
      soonestOpenTriageGap({
        intervals: triageDayFixtures.fullyBooked,
        now: TRIAGE_MOCK_NOW,
        durationSeconds: 15 * 60,
      }),
    ).toEqual(triageMockAt(17, 23, 59))
  })

  it('falls back to end of day when the candidate would run past midnight', () => {
    expect(
      soonestOpenTriageGap({
        intervals: triageDayFixtures.empty,
        now: triageMockAt(17, 23, 58),
        durationSeconds: 60 * 60,
      }),
    ).toEqual(triageMockAt(17, 23, 59))
  })

  it('treats a negative duration as zero rather than searching backwards', () => {
    expect(
      soonestOpenTriageGap({
        intervals: triageDayFixtures.busyMorning,
        now: TRIAGE_MOCK_NOW,
        durationSeconds: -600,
      }),
    ).toEqual(triageMockAt(17, 11))
  })
})

describe('defaultTriageDueDate — the per-quadrant seed', () => {
  it('seeds Prioritize with the soonest fitting gap — 25 minutes on a busy morning', () => {
    expect(
      defaultTriageDueDate(
        EisenhowerQuadrant.prioritize,
        inputs({
          durationSeconds: 25 * 60,
          busyIntervals: triageDayFixtures.busyMorning,
        }),
      ),
    ).toEqual(triageMockAt(17, 11, 45))
  })

  it('seeds Delegate with the SAME gap — it also lives in the Urgent column', () => {
    const forDelegate = defaultTriageDueDate(
      EisenhowerQuadrant.delegate,
      inputs({
        durationSeconds: 25 * 60,
        busyIntervals: triageDayFixtures.busyMorning,
      }),
    )
    const forPrioritize = defaultTriageDueDate(
      EisenhowerQuadrant.prioritize,
      inputs({
        durationSeconds: 25 * 60,
        busyIntervals: triageDayFixtures.busyMorning,
      }),
    )

    expect(forDelegate).toEqual(forPrioritize)
  })

  it('falls back to end of day for the Urgent column when the day is full', () => {
    expect(
      defaultTriageDueDate(
        EisenhowerQuadrant.prioritize,
        inputs({
          durationSeconds: 15 * 60,
          busyIntervals: triageDayFixtures.fullyBooked,
        }),
      ),
    ).toEqual(triageMockAt(17, 23, 59))
  })

  it('honours canon’s parent-supplied seed when this session has no day cache', () => {
    const parentSeed = triageMockAt(17, 16, 30)

    expect(
      defaultTriageDueDate(
        EisenhowerQuadrant.prioritize,
        inputs({ nextFreeSlotToday: parentSeed }),
      ),
    ).toBe(parentSeed)
  })

  it('prefers its own duration-aware search over a parent seed once a day is known', () => {
    expect(
      defaultTriageDueDate(
        EisenhowerQuadrant.prioritize,
        inputs({
          durationSeconds: 25 * 60,
          busyIntervals: triageDayFixtures.busyMorning,
          nextFreeSlotToday: triageMockAt(17, 16, 30),
        }),
      ),
    ).toEqual(triageMockAt(17, 11, 45))
  })

  it('seeds Schedule one week out, keeping the wall-clock time of day', () => {
    expect(defaultTriageDueDate(EisenhowerQuadrant.decide, inputs())).toEqual(
      triageMockAt(24, 10, 7),
    )
  })

  it('seeds Schedule from NOW, not from the day’s gaps', () => {
    expect(
      defaultTriageDueDate(
        EisenhowerQuadrant.decide,
        inputs({ busyIntervals: triageDayFixtures.busyMorning }),
      ),
    ).toEqual(triageMockAt(24, 10, 7))
  })

  it('seeds Archive with nothing — archiving needs no scheduled date', () => {
    expect(defaultTriageDueDate(EisenhowerQuadrant.delete, inputs())).toBeNull()
  })
})
