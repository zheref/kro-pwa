import {
  type Endeavor,
  EndeavorKind,
  EndeavorStatus,
  makeEndeavor,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  FEATURED_NOW_MAX,
  centredFeaturedWindow,
  featuredNowCapacityFor,
  featuredNowScore,
  selectFeaturedNowEndeavors,
} from '../DoFeaturedNow'
import { DO_MOCK_NOW, doEndeavorFixtures, doMockAt } from '../DoMocks'

const scoreOf = (endeavor: Endeavor) => featuredNowScore(endeavor, DO_MOCK_NOW)

const candidate = (params: {
  readonly id: string
  readonly due?: Date | null
  readonly status?: EndeavorStatus
  readonly duration?: number | null
  readonly sessionPoints?: number | null
  readonly kind?: EndeavorKind
}): Endeavor =>
  makeEndeavor({
    id: params.id,
    title: params.id,
    kind: params.kind ?? EndeavorKind.task,
    status: params.status ?? EndeavorStatus.pending,
    due: params.due ?? null,
    duration: params.duration ?? null,
    sessionPoints: params.sessionPoints ?? null,
  })

describe('featuredNowScore', () => {
  it('gives an overdue task the dominating 100, plus 10 for having a due date', () => {
    expect(scoreOf(doEndeavorFixtures.overdueThisMorning)).toBe(110)
  })

  it('gives a task due inside two hours 50 + 10', () => {
    expect(scoreOf(doEndeavorFixtures.dueInExactlyTwoHours)).toBe(60)
  })

  it('gives a task due inside six hours 25 + 10, plus duration and reward nudges', () => {
    // Due in four hours, 30 minutes long, worth 25 points: 25 + 10 + 5 + 3.
    expect(scoreOf(doEndeavorFixtures.richUpcomingTask)).toBe(43)
  })

  it('scores an undated, idle, unmeasured task zero — no relevance to now', () => {
    expect(scoreOf(doEndeavorFixtures.zeroScoreTask)).toBe(0)
  })

  it('lifts an undated task out of zero purely by being ongoing', () => {
    expect(scoreOf(doEndeavorFixtures.ongoingZeroDueTask)).toBe(30)
  })

  it('scores a completed endeavor zero however urgent it looked', () => {
    expect(scoreOf(doEndeavorFixtures.completedTodayTask)).toBe(0)
  })

  it('scores a reminder zero — the lane is tasks and habits only', () => {
    expect(scoreOf(doEndeavorFixtures.reminderDueToday)).toBe(0)
  })

  it('scores a habit exactly as it scores a task', () => {
    const due = doMockAt(17, 11, 0)
    expect(scoreOf(candidate({ id: 'h', due, kind: EndeavorKind.habit }))).toBe(
      scoreOf(candidate({ id: 't', due, kind: EndeavorKind.task })),
    )
  })

  it('treats the six-hour band as inclusive and the moment past it as unscored', () => {
    expect(scoreOf(candidate({ id: 'six', due: doMockAt(17, 16, 0) }))).toBe(35)
    expect(
      scoreOf(candidate({ id: 'past-six', due: doMockAt(17, 16, 0, 1) })),
    ).toBe(10)
  })

  it('nudges only above the default ten reward points, never at it', () => {
    expect(scoreOf(candidate({ id: 'at-ten', sessionPoints: 10 }))).toBe(0)
    expect(scoreOf(candidate({ id: 'above-ten', sessionPoints: 11 }))).toBe(3)
  })

  it('does not consult the Due Soon preference — 2h and 6h are canon constants', () => {
    // Widening `nowThresholdHours` moves the LANE boundary, never the score.
    const dueInFive = candidate({ id: 'five', due: doMockAt(17, 15, 0) })
    expect(featuredNowScore(dueInFive, DO_MOCK_NOW)).toBe(35)
  })
})

describe('selectFeaturedNowEndeavors', () => {
  const overdue = candidate({ id: 'overdue', due: doMockAt(17, 8, 0) }) // 110
  const imminent = candidate({ id: 'imminent', due: doMockAt(17, 11, 0) }) // 60
  const soon = candidate({ id: 'soon', due: doMockAt(17, 14, 0) }) // 35
  const ongoing = candidate({ id: 'ongoing', status: EndeavorStatus.ongoing }) // 30
  const later = candidate({ id: 'later', due: doMockAt(17, 20, 0) }) // 10

  it('centres the top scorer and flanks it, so three cards read [2nd, 1st, 3rd]', () => {
    const lane = selectFeaturedNowEndeavors(
      [soon, overdue, imminent],
      DO_MOCK_NOW,
    )
    expect(lane.map((endeavor) => endeavor.id)).toEqual([
      'imminent',
      'overdue',
      'soon',
    ])
  })

  it('excludes every zero-scoring endeavor', () => {
    const lane = selectFeaturedNowEndeavors(
      [overdue, doEndeavorFixtures.zeroScoreTask, imminent],
      DO_MOCK_NOW,
    )
    expect(lane.map((endeavor) => endeavor.id)).not.toContain(
      doEndeavorFixtures.zeroScoreTask.id,
    )
  })

  it('drops the weakest card to keep the count odd', () => {
    const lane = selectFeaturedNowEndeavors(
      [overdue, imminent, soon, ongoing],
      DO_MOCK_NOW,
    )
    expect(lane).toHaveLength(3)
    expect(lane.map((endeavor) => endeavor.id)).not.toContain('ongoing')
  })

  it('keeps both cards on a two-card day rather than dropping to one', () => {
    const lane = selectFeaturedNowEndeavors([overdue, imminent], DO_MOCK_NOW)
    expect(lane.map((endeavor) => endeavor.id)).toEqual(['imminent', 'overdue'])
  })

  it('never ranks more than nine, and stays odd at the ceiling', () => {
    const many = Array.from({ length: 14 }, (_, index) =>
      candidate({
        id: `task-${index}`,
        due: doMockAt(17, 9, 0, index),
      }),
    )
    const lane = selectFeaturedNowEndeavors(many, DO_MOCK_NOW)
    expect(lane).toHaveLength(FEATURED_NOW_MAX)
  })

  it('breaks a score tie on the earlier due date', () => {
    const early = candidate({ id: 'early', due: doMockAt(17, 10, 30) })
    const late = candidate({ id: 'late', due: doMockAt(17, 11, 30) })
    const third = candidate({ id: 'third', due: doMockAt(17, 11, 45) })
    // Same score (50 + 10) for all three, so due-asc decides the hero.
    expect(scoreOf(early)).toBe(scoreOf(late))
    const lane = selectFeaturedNowEndeavors([late, third, early], DO_MOCK_NOW)
    expect(lane[1]?.id).toBe('early')
  })

  it('is deterministic on a full tie: the pool order decides, and repeats', () => {
    const a = candidate({ id: 'a', due: doMockAt(17, 11, 0) })
    const b = candidate({ id: 'b', due: doMockAt(17, 11, 0) })
    const c = candidate({ id: 'c', due: doMockAt(17, 11, 0) })
    const first = selectFeaturedNowEndeavors([a, b, c], DO_MOCK_NOW)
    const second = selectFeaturedNowEndeavors([a, b, c], DO_MOCK_NOW)
    expect(first.map((endeavor) => endeavor.id)).toEqual(['b', 'a', 'c'])
    expect(second.map((endeavor) => endeavor.id)).toEqual(
      first.map((endeavor) => endeavor.id),
    )
  })

  it('is empty when nothing scores', () => {
    expect(
      selectFeaturedNowEndeavors(
        [doEndeavorFixtures.zeroScoreTask],
        DO_MOCK_NOW,
      ),
    ).toEqual([])
  })

  it('keeps the hero centred at five and at seven', () => {
    const seven = [overdue, imminent, soon, ongoing, later].concat([
      candidate({ id: 'extra-1', due: doMockAt(17, 11, 1) }),
      candidate({ id: 'extra-2', due: doMockAt(17, 11, 2) }),
    ])
    const lane = selectFeaturedNowEndeavors(seven, DO_MOCK_NOW)
    expect(lane).toHaveLength(7)
    expect(lane[3]?.id).toBe('overdue')
  })
})

describe('featuredNowCapacityFor', () => {
  it('takes the largest supported odd count that fits', () => {
    expect(featuredNowCapacityFor(9)).toBe(9)
    expect(featuredNowCapacityFor(8)).toBe(7)
    expect(featuredNowCapacityFor(6)).toBe(5)
  })

  it('floors at three, because the lane stays focused rather than collapsing', () => {
    expect(featuredNowCapacityFor(1)).toBe(3)
    expect(featuredNowCapacityFor(0)).toBe(3)
  })

  it('never exceeds nine however wide the window gets', () => {
    expect(featuredNowCapacityFor(40)).toBe(9)
  })
})

describe('centredFeaturedWindow', () => {
  // A hero-centred seven: rank 1 is at the centre, ranks 6 and 7 at the ends.
  const arranged = [
    'rank6',
    'rank4',
    'rank2',
    'hero',
    'rank3',
    'rank5',
    'rank7',
  ].map((id) => candidate({ id, due: doMockAt(17, 11, 0) }))

  it('keeps the hero centred when the width narrows', () => {
    const window = centredFeaturedWindow(arranged, 3)
    expect(window.map((endeavor) => endeavor.id)).toEqual([
      'rank2',
      'hero',
      'rank3',
    ])
  })

  it('drops the lowest-ranked flankers from both ends, never one', () => {
    const window = centredFeaturedWindow(arranged, 5)
    expect(window.map((endeavor) => endeavor.id)).toEqual([
      'rank4',
      'rank2',
      'hero',
      'rank3',
      'rank5',
    ])
  })

  it('returns the whole lane when it already fits', () => {
    expect(centredFeaturedWindow(arranged, 9)).toEqual(arranged)
  })
})
