import {
  EndeavorComputedState,
  EndeavorHost,
  EndeavorKind,
  defaultReconciliationContext,
  makeEndeavor,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  DO_MOCK_NOW,
  doEndeavorFixtures,
  doFixtureDay,
  doMockAt,
} from '../DoMocks'
import {
  DoLane,
  type DoPartitionInput,
  type DoVisibility,
  doCardKey,
  doClearExpiredTargets,
  doLensFor,
  emptyDoLanes,
  heroFirstSearchOrder,
  initialDoVisibility,
  doAutoAdvanceLaneOrder,
  isActionableDoKind,
  isCompletedToday,
  isComputedStateVisible,
  isDueNext,
  isDueNow,
  isExpired,
  isOverdueToday,
  isPastDue,
  laneCards,
  nextActionableCardKey,
  partitionDoTaskLanes,
  passesDoKindAndHostLens,
  pendingDoEndeavors,
} from '../DoRules'

const inputFor = (
  overrides: Partial<DoPartitionInput> = {},
): DoPartitionInput => ({
  tasks: doFixtureDay.filter(
    (endeavor) =>
      endeavor.kind !== EndeavorKind.calendarEvent &&
      endeavor.kind !== EndeavorKind.reminder,
  ),
  reminders: doFixtureDay.filter(
    (endeavor) => endeavor.kind === EndeavorKind.reminder,
  ),
  lens: doLensFor(initialDoVisibility),
  nowThresholdHours: 2,
  now: DO_MOCK_NOW,
  ...overrides,
})

/** Every task lane the given endeavor id lands in, in canon's lane order. */
const lanesContaining = (
  id: string,
  input: DoPartitionInput = inputFor(),
): readonly DoLane[] => {
  const lanes = partitionDoTaskLanes(input)
  const found: DoLane[] = []
  const has = (list: readonly { id: string }[]) =>
    list.some((endeavor) => endeavor.id === id)
  if (has(lanes.overdue)) found.push(DoLane.overdue)
  if (has(lanes.now)) found.push(DoLane.now)
  if (has(lanes.expired)) found.push(DoLane.expired)
  if (has(lanes.next)) found.push(DoLane.next)
  if (has(lanes.anytime)) found.push(DoLane.anytime)
  if (has(lanes.completedToday)) found.push(DoLane.completed)
  return found
}

// ---------------------------------------------------------------------------
// The table-driven lane suite from DoLanes.md
// ---------------------------------------------------------------------------

describe('the Do lanes, over one fixture day', () => {
  const cases: readonly {
    readonly fixture: keyof typeof doEndeavorFixtures
    readonly lanes: readonly DoLane[]
    readonly why: string
  }[] = [
    {
      fixture: 'overdueThisMorning',
      lanes: [DoLane.overdue],
      why: 'pending and due earlier today',
    },
    {
      fixture: 'overdueOneMinuteAgo',
      lanes: [DoLane.overdue],
      why: 'one minute past due is already Overdue, never still Due Soon',
    },
    {
      fixture: 'overdueAtMidnightToday',
      lanes: [DoLane.overdue],
      why: 'due at 00:00 today is due TODAY, so Overdue rather than Expired',
    },
    {
      fixture: 'dueAtExactlyNow',
      lanes: [DoLane.now],
      why: 'the Due Soon boundary is closed: due >= now',
    },
    {
      fixture: 'dueInExactlyTwoHours',
      lanes: [DoLane.now],
      why: 'the window is inclusive, so exactly two hours away is still Due Soon',
    },
    {
      fixture: 'dueOneSecondPastWindow',
      lanes: [DoLane.next],
      why: 'one second past the window crosses into Next',
    },
    {
      fixture: 'ongoingUndated',
      lanes: [DoLane.now],
      why: 'ongoing work stays visible in Due Soon and never falls to Anytime',
    },
    {
      fixture: 'ongoingDueTomorrow',
      lanes: [DoLane.now],
      why: 'the ongoing tail ignores the due date entirely',
    },
    {
      fixture: 'ongoingAndOverdue',
      lanes: [DoLane.overdue],
      why: 'the ongoing + overdue overlap resolves to Overdue alone, never both',
    },
    {
      fixture: 'expiredLastNight',
      lanes: [DoLane.expired],
      why: 'due 23:59 yesterday is Expired one minute later — the split is by day',
    },
    {
      fixture: 'expiredLastWeek',
      lanes: [DoLane.expired],
      why: 'long past its day',
    },
    {
      fixture: 'dueLateToday',
      lanes: [DoLane.next],
      why: 'due later today, beyond the window',
    },
    {
      fixture: 'dueTomorrowMorning',
      lanes: [],
      why: 'Next requires due-today and Anytime requires no due date, so neither takes it',
    },
    {
      fixture: 'dueAtMidnightTonight',
      lanes: [],
      why: '00:00 tomorrow is the far side of the midnight edge',
    },
    {
      fixture: 'skippedThisMorning',
      lanes: [],
      why: 'skipped counts as completed for the lanes but not for Completed Today',
    },
    {
      fixture: 'anytimeTask',
      lanes: [DoLane.anytime],
      why: 'no due date and not ongoing',
    },
    {
      fixture: 'habitDueSoon',
      lanes: [DoLane.now],
      why: 'habits are actionable alongside tasks',
    },
    {
      fixture: 'habitUndated',
      lanes: [DoLane.anytime],
      why: 'an undated habit is pickable whenever',
    },
    {
      fixture: 'habitCompletedToday',
      lanes: [DoLane.completed],
      why: 'closed with a completion stamped today',
    },
    {
      fixture: 'completedTodayTask',
      lanes: [DoLane.completed],
      why: 'the ordinary completed-today case',
    },
    {
      fixture: 'completedYesterdayTask',
      lanes: [],
      why: "yesterday's completion is not today's record",
    },
    {
      fixture: 'completedTodayViaPerformance',
      lanes: [DoLane.completed],
      why: 'the performance carries the completion the host never returned',
    },
    {
      fixture: 'reminderDueToday',
      lanes: [],
      why: 'reminders are not an actionable Do kind — they have their own lane',
    },
    {
      fixture: 'reminderCompletedToday',
      lanes: [DoLane.completed],
      why: 'Completed Today draws from reminders as well as tasks',
    },
    {
      fixture: 'eventToday',
      lanes: [],
      why: 'events are neither partitioned nor completed here',
    },
  ]

  for (const { fixture, lanes, why } of cases) {
    it(`puts ${fixture} in [${lanes.join(', ') || 'no lane'}] — ${why}`, () => {
      expect(lanesContaining(doEndeavorFixtures[fixture].id)).toEqual(lanes)
    })
  }
})

describe('lane ordering', () => {
  it('sorts Overdue oldest-first so the longest-missed task leads', () => {
    const { overdue } = partitionDoTaskLanes(inputFor())
    expect(overdue.map((endeavor) => endeavor.id)).toEqual([
      doEndeavorFixtures.overdueAtMidnightToday.id,
      doEndeavorFixtures.overdueThisMorning.id,
      doEndeavorFixtures.ongoingAndOverdue.id,
      doEndeavorFixtures.overdueOneMinuteAgo.id,
    ])
  })

  it('sorts Expired oldest-first', () => {
    const { expired } = partitionDoTaskLanes(inputFor())
    expect(expired.map((endeavor) => endeavor.id)).toEqual([
      doEndeavorFixtures.expiredLastWeek.id,
      doEndeavorFixtures.expiredLastNight.id,
    ])
  })

  it('appends the ongoing tail after the due-sorted head, unsorted', () => {
    const { now } = partitionDoTaskLanes(inputFor())
    expect(now.map((endeavor) => endeavor.id)).toEqual([
      doEndeavorFixtures.dueAtExactlyNow.id,
      doEndeavorFixtures.habitDueSoon.id,
      doEndeavorFixtures.dueInExactlyTwoHours.id,
      // The tail: pool order, not due order — `ongoingDueTomorrow` is due
      // *later* than nothing above it yet still sits last but one.
      doEndeavorFixtures.ongoingUndated.id,
      doEndeavorFixtures.ongoingDueTomorrow.id,
      doEndeavorFixtures.ongoingZeroDueTask.id,
    ])
  })

  it('leaves Anytime in pool order — canon applies no temporal sort', () => {
    const { anytime } = partitionDoTaskLanes(inputFor())
    expect(anytime.map((endeavor) => endeavor.id)).toEqual([
      doEndeavorFixtures.anytimeTask.id,
      doEndeavorFixtures.habitUndated.id,
      doEndeavorFixtures.zeroScoreTask.id,
    ])
  })
})

// ---------------------------------------------------------------------------
// Predicates, at the boundary
// ---------------------------------------------------------------------------

describe('isPastDue', () => {
  it('is true one millisecond after the due moment', () => {
    const due = doMockAt(17, 10, 0)
    const endeavor = makeEndeavor({
      id: 'x',
      title: 'x',
      kind: EndeavorKind.task,
      due,
    })
    expect(
      isPastDue(
        endeavor,
        new Date(due.getTime() + 1),
        defaultReconciliationContext(),
      ),
    ).toBe(true)
  })

  it('is false at exactly the due moment — that instant still belongs to Due Soon', () => {
    const due = doMockAt(17, 10, 0)
    const endeavor = makeEndeavor({
      id: 'x',
      title: 'x',
      kind: EndeavorKind.task,
      due,
    })
    expect(isPastDue(endeavor, due, defaultReconciliationContext())).toBe(false)
  })

  it('is false for a closed endeavor, however long past due', () => {
    expect(
      isPastDue(
        doEndeavorFixtures.completedYesterdayTask,
        DO_MOCK_NOW,
        defaultReconciliationContext(),
      ),
    ).toBe(false)
  })
})

describe('isOverdueToday / isExpired', () => {
  it('calls a task due one minute before midnight Expired the next morning', () => {
    const endeavor = doEndeavorFixtures.expiredLastNight
    expect(
      isExpired(endeavor, DO_MOCK_NOW, defaultReconciliationContext()),
    ).toBe(true)
    expect(
      isOverdueToday(endeavor, DO_MOCK_NOW, defaultReconciliationContext()),
    ).toBe(false)
  })

  it('moves a task from Overdue to Expired the moment the calendar day turns', () => {
    // Due 23:59 on the 16th. The 30 seconds either side of midnight are the
    // whole rule: nothing about the task changes, only which day `now` is on.
    const endeavor = doEndeavorFixtures.expiredLastNight
    const thatEvening = doMockAt(16, 23, 59, 30)
    const justAfterMidnight = doMockAt(17, 0, 0, 30)

    expect(
      isOverdueToday(endeavor, thatEvening, defaultReconciliationContext()),
    ).toBe(true)
    expect(
      isExpired(endeavor, thatEvening, defaultReconciliationContext()),
    ).toBe(false)

    expect(
      isOverdueToday(
        endeavor,
        justAfterMidnight,
        defaultReconciliationContext(),
      ),
    ).toBe(false)
    expect(
      isExpired(endeavor, justAfterMidnight, defaultReconciliationContext()),
    ).toBe(true)
  })

  it('never calls the same endeavor both Overdue and Expired', () => {
    for (const endeavor of doFixtureDay) {
      const both =
        isOverdueToday(endeavor, DO_MOCK_NOW, defaultReconciliationContext()) &&
        isExpired(endeavor, DO_MOCK_NOW, defaultReconciliationContext())
      expect(both).toBe(false)
    }
  })
})

describe('isDueNow / isDueNext against the nowThresholdHours preference', () => {
  const dueInFourHours = makeEndeavor({
    id: 'four-hours',
    title: 'Four hours out',
    kind: EndeavorKind.task,
    due: doMockAt(17, 14, 0),
  })

  it('is Next at the default two-hour window', () => {
    expect(
      isDueNow(dueInFourHours, 2, DO_MOCK_NOW, defaultReconciliationContext()),
    ).toBe(false)
    expect(
      isDueNext(dueInFourHours, 2, DO_MOCK_NOW, defaultReconciliationContext()),
    ).toBe(true)
  })

  it('becomes Due Soon once the user widens the window to six hours', () => {
    expect(
      isDueNow(dueInFourHours, 6, DO_MOCK_NOW, defaultReconciliationContext()),
    ).toBe(true)
    expect(
      isDueNext(dueInFourHours, 6, DO_MOCK_NOW, defaultReconciliationContext()),
    ).toBe(false)
  })

  it('never lets a task due tomorrow into Next, however wide the window', () => {
    expect(
      isDueNext(
        doEndeavorFixtures.dueTomorrowMorning,
        24,
        DO_MOCK_NOW,
        defaultReconciliationContext(),
      ),
    ).toBe(false)
  })
})

describe('isCompletedToday', () => {
  it('accepts a closed endeavor whose host stamped today', () => {
    expect(
      isCompletedToday(
        doEndeavorFixtures.completedTodayTask,
        DO_MOCK_NOW,
        defaultReconciliationContext(),
      ),
    ).toBe(true)
  })

  it('falls back to the latest completed performance when the host stamped nothing', () => {
    expect(
      isCompletedToday(
        doEndeavorFixtures.completedTodayViaPerformance,
        DO_MOCK_NOW,
        defaultReconciliationContext(),
      ),
    ).toBe(true)
  })

  it('rejects a skipped endeavor — skipping is not completing', () => {
    expect(
      isCompletedToday(
        doEndeavorFixtures.skippedThisMorning,
        DO_MOCK_NOW,
        defaultReconciliationContext(),
      ),
    ).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

describe('the visibility selection', () => {
  it('empties the Expired lane when the user hides the expired state', () => {
    const visibility: DoVisibility = {
      ...initialDoVisibility,
      hiddenComputedStates: [EndeavorComputedState.expired],
    }
    const lanes = partitionDoTaskLanes(
      inputFor({ lens: doLensFor(visibility) }),
    )
    expect(lanes.expired).toEqual([])
    expect(lanes.overdue.length).toBeGreaterThan(0)
  })

  it('drops habits from every lane when the habit kind is hidden', () => {
    const visibility: DoVisibility = {
      ...initialDoVisibility,
      hiddenKinds: [EndeavorKind.habit],
    }
    const lanes = partitionDoTaskLanes(
      inputFor({ lens: doLensFor(visibility) }),
    )
    expect(lanes.now.map((endeavor) => endeavor.id)).not.toContain(
      doEndeavorFixtures.habitDueSoon.id,
    )
    expect(lanes.anytime.map((endeavor) => endeavor.id)).not.toContain(
      doEndeavorFixtures.habitUndated.id,
    )
  })

  it('keeps a multi-host endeavor while one of its hosts is still visible', () => {
    const shared = makeEndeavor({
      id: 'multi-host',
      title: 'Shared task',
      kind: EndeavorKind.task,
      due: doMockAt(17, 11, 0),
      hostedBy: [EndeavorHost.local, EndeavorHost.supabase],
    })
    const lens = doLensFor({
      ...initialDoVisibility,
      hiddenHosts: [EndeavorHost.local],
    })
    expect(
      passesDoKindAndHostLens(shared, lens, defaultReconciliationContext()),
    ).toBe(true)

    const bothHidden = doLensFor({
      ...initialDoVisibility,
      hiddenHosts: [EndeavorHost.local, EndeavorHost.supabase],
    })
    expect(
      passesDoKindAndHostLens(
        shared,
        bothHidden,
        defaultReconciliationContext(),
      ),
    ).toBe(false)
  })
})

describe('pendingDoEndeavors', () => {
  it('keeps only actionable, uncompleted kinds', () => {
    const pending = pendingDoEndeavors(inputFor())
    const ids = pending.map((endeavor) => endeavor.id)
    expect(ids).toContain(doEndeavorFixtures.anytimeTask.id)
    expect(ids).not.toContain(doEndeavorFixtures.reminderDueToday.id)
    expect(ids).not.toContain(doEndeavorFixtures.completedTodayTask.id)
  })

  it('excludes an endeavor completed today even before its status settles', () => {
    const pending = pendingDoEndeavors(inputFor())
    expect(pending.map((endeavor) => endeavor.id)).not.toContain(
      doEndeavorFixtures.completedTodayViaPerformance.id,
    )
  })

  it('is empty for an empty day', () => {
    expect(pendingDoEndeavors(inputFor({ tasks: [], reminders: [] }))).toEqual(
      [],
    )
  })
})

// ---------------------------------------------------------------------------
// Auto-advance
// ---------------------------------------------------------------------------

describe('heroFirstSearchOrder', () => {
  it('walks a three-card lane centre, leading, trailing', () => {
    expect(heroFirstSearchOrder(3)).toEqual([1, 0, 2])
  })

  it('walks a nine-card lane outward from the hero', () => {
    expect(heroFirstSearchOrder(9)).toEqual([4, 3, 5, 2, 6, 1, 7, 0, 8])
  })

  it('returns nothing for an empty lane', () => {
    expect(heroFirstSearchOrder(0)).toEqual([])
  })
})

describe('nextActionableCardKey', () => {
  const cardOf = (id: string) => ({ ...doEndeavorFixtures.anytimeTask, id })

  it('prefers the featured hero over every other lane', () => {
    const key = nextActionableCardKey({
      ...emptyDoLanes,
      featuredNow: [cardOf('flanker'), cardOf('hero'), cardOf('other')],
      overdue: [cardOf('overdue')],
    })
    expect(key).toBe(doCardKey(DoLane.featured, 'hero'))
  })

  it('falls through the documented order once the featured lane is empty', () => {
    const key = nextActionableCardKey({
      ...emptyDoLanes,
      expired: [cardOf('expired')],
      next: [cardOf('next')],
    })
    expect(key).toBe(doCardKey(DoLane.expired, 'expired'))
  })

  it('is null when nothing actionable is left, so focus clears without jumping', () => {
    expect(
      nextActionableCardKey({
        ...emptyDoLanes,
        completedToday: [cardOf('done')],
      }),
    ).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Clear Expired
// ---------------------------------------------------------------------------

describe('doClearExpiredTargets', () => {
  it('names every expired endeavor', () => {
    const targets = doClearExpiredTargets(doFixtureDay, DO_MOCK_NOW)
    expect(targets.map((endeavor) => endeavor.id).sort()).toEqual(
      [
        doEndeavorFixtures.expiredLastNight.id,
        doEndeavorFixtures.expiredLastWeek.id,
      ].sort(),
    )
  })

  it("leaves today's overdue alone — the code's set, not the doc's", () => {
    const targets = doClearExpiredTargets(doFixtureDay, DO_MOCK_NOW).map(
      (endeavor) => endeavor.id,
    )
    expect(targets).not.toContain(doEndeavorFixtures.overdueThisMorning.id)
    expect(targets).not.toContain(doEndeavorFixtures.ongoingAndOverdue.id)
  })

  it('is empty on a day with nothing expired', () => {
    expect(
      doClearExpiredTargets([doEndeavorFixtures.anytimeTask], DO_MOCK_NOW),
    ).toEqual([])
  })
})

describe('doCardKey', () => {
  it('mints canon’s "lane:id" shape', () => {
    expect(doCardKey(DoLane.overdue, 'abc')).toBe('overdue:abc')
  })

  it('keys the same endeavor differently per lane, so one selection cannot span two', () => {
    expect(doCardKey(DoLane.featured, 'abc')).not.toBe(
      doCardKey(DoLane.now, 'abc'),
    )
  })

  it('keeps the completed tag distinct from the rest', () => {
    expect(doCardKey(DoLane.completed, 'abc')).toBe('completed:abc')
  })
})

describe('doLensFor', () => {
  it('keeps the vista’s showArchived so Completed Today survives a refetch', () => {
    expect(doLensFor(initialDoVisibility).showArchived).toBe(true)
  })

  it('materialises the user’s hidden kinds as a set', () => {
    const lens = doLensFor({
      ...initialDoVisibility,
      hiddenKinds: [EndeavorKind.habit],
    })
    expect(lens.hiddenKinds.has(EndeavorKind.habit)).toBe(true)
  })

  it('hides nothing by default', () => {
    const lens = doLensFor(initialDoVisibility)
    expect(lens.hiddenKinds.size + lens.hiddenHosts.size).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// The small predicates the lanes are assembled from
// ---------------------------------------------------------------------------

describe('isActionableDoKind', () => {
  it('admits a task', () => {
    expect(
      isActionableDoKind(
        doEndeavorFixtures.anytimeTask,
        defaultReconciliationContext(),
      ),
    ).toBe(true)
  })

  it('admits a habit, which Do treats as an ordinary card', () => {
    expect(
      isActionableDoKind(
        doEndeavorFixtures.habitUndated,
        defaultReconciliationContext(),
      ),
    ).toBe(true)
  })

  it('refuses a reminder and an event — neither is completed from a lane', () => {
    expect(
      isActionableDoKind(
        doEndeavorFixtures.reminderDueToday,
        defaultReconciliationContext(),
      ),
    ).toBe(false)
    expect(
      isActionableDoKind(
        doEndeavorFixtures.eventToday,
        defaultReconciliationContext(),
      ),
    ).toBe(false)
  })
})

describe('isComputedStateVisible', () => {
  it('is true while nothing is hidden', () => {
    expect(
      isComputedStateVisible(
        doLensFor(initialDoVisibility),
        EndeavorComputedState.overdue,
      ),
    ).toBe(true)
  })

  it('is false for the state the user hid', () => {
    const lens = doLensFor({
      ...initialDoVisibility,
      hiddenComputedStates: [EndeavorComputedState.completedToday],
    })
    expect(
      isComputedStateVisible(lens, EndeavorComputedState.completedToday),
    ).toBe(false)
  })

  it('leaves the sibling states alone', () => {
    const lens = doLensFor({
      ...initialDoVisibility,
      hiddenComputedStates: [EndeavorComputedState.expired],
    })
    expect(isComputedStateVisible(lens, EndeavorComputedState.overdue)).toBe(
      true,
    )
  })
})

describe('doAutoAdvanceLaneOrder', () => {
  it('is canon’s documented order, hero first', () => {
    expect(doAutoAdvanceLaneOrder).toEqual([
      DoLane.featured,
      DoLane.now,
      DoLane.overdue,
      DoLane.expired,
      DoLane.next,
      DoLane.anytime,
    ])
  })

  it('never includes Completed Today', () => {
    expect(doAutoAdvanceLaneOrder).not.toContain(DoLane.completed)
  })

  it('keeps Expired next to its Overdue sibling', () => {
    const overdueAt = doAutoAdvanceLaneOrder.indexOf(DoLane.overdue)
    expect(doAutoAdvanceLaneOrder[overdueAt + 1]).toBe(DoLane.expired)
  })
})

describe('laneCards', () => {
  const lanes = {
    ...emptyDoLanes,
    overdue: [doEndeavorFixtures.overdueThisMorning],
    completedToday: [doEndeavorFixtures.completedTodayTask],
  }

  it('reads the named lane', () => {
    expect(laneCards(lanes, DoLane.overdue)).toEqual([
      doEndeavorFixtures.overdueThisMorning,
    ])
  })

  it('reads Completed Today, which auto-advance never walks', () => {
    expect(laneCards(lanes, DoLane.completed)).toEqual([
      doEndeavorFixtures.completedTodayTask,
    ])
  })

  it('returns an empty lane rather than undefined', () => {
    expect(laneCards(lanes, DoLane.anytime)).toEqual([])
  })
})
