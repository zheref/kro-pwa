import { type Endeavor, EndeavorKind } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { DO_MOCK_NOW, doEndeavorFixtures } from '../DoMocks'
import { areDoRingsVisible, habitsRing, tasksRing } from '../DoRings'
import { doLensFor, initialDoVisibility, partitionDoTaskLanes } from '../DoRules'

const {
  anytimeTask,
  completedTodayTask,
  completedYesterdayTask,
  expiredLastWeek,
  habitCompletedToday,
  habitDueSoon,
  habitUndated,
  overdueThisMorning,
  reminderCompletedToday,
  reminderDueToday,
} = doEndeavorFixtures

const tasksOf = (endeavors: readonly Endeavor[]) =>
  endeavors.filter((endeavor) => endeavor.kind !== EndeavorKind.reminder)
const remindersOf = (endeavors: readonly Endeavor[]) =>
  endeavors.filter((endeavor) => endeavor.kind === EndeavorKind.reminder)

const ringFor = (endeavors: readonly Endeavor[]) =>
  tasksRing(
    { tasks: tasksOf(endeavors), reminders: remindersOf(endeavors) },
    DO_MOCK_NOW,
  )

// ---------------------------------------------------------------------------
// The truth table from DayProgressRings.md
// ---------------------------------------------------------------------------

describe('the rings truth table', () => {
  const cases: readonly {
    readonly state: string
    readonly endeavors: readonly Endeavor[]
    readonly tasks: string
    readonly habits: string
  }[] = [
    {
      state: 'nothing expected today',
      endeavors: [anytimeTask, expiredLastWeek],
      tasks: 'absent',
      habits: 'absent',
    },
    {
      state: 'habits only',
      endeavors: [habitUndated, habitCompletedToday],
      tasks: 'absent',
      habits: '1/2',
    },
    {
      state: 'tasks only',
      endeavors: [overdueThisMorning, completedTodayTask],
      tasks: '1/2',
      habits: 'absent',
    },
    {
      state: 'both, partly done',
      endeavors: [
        overdueThisMorning,
        completedTodayTask,
        habitDueSoon,
        habitCompletedToday,
      ],
      tasks: '1/2',
      habits: '1/2',
    },
    {
      state: 'both complete',
      endeavors: [completedTodayTask, habitCompletedToday],
      tasks: '1/1',
      habits: '1/1',
    },
  ]

  for (const { state, endeavors, tasks, habits } of cases) {
    it(`renders ${state} as tasks ${tasks} / habits ${habits}`, () => {
      const taskRing = ringFor(endeavors)
      const habitRing = habitsRing(
        endeavors.filter((endeavor) => endeavor.kind === EndeavorKind.habit),
        DO_MOCK_NOW,
      )
      const describeRing = (ring: { completed: number; expected: number } | null) =>
        ring === null ? 'absent' : `${ring.completed}/${ring.expected}`

      expect(describeRing(taskRing)).toBe(tasks)
      expect(describeRing(habitRing)).toBe(habits)
    })
  }
})

// ---------------------------------------------------------------------------
// The emerald (tasks) ring
// ---------------------------------------------------------------------------

describe('tasksRing', () => {
  it('is absent — not empty — when nothing is due today', () => {
    expect(ringFor([anytimeTask])).toBeNull()
  })

  it('counts an overdue task, because it is still expected of you today', () => {
    const ring = ringFor([overdueThisMorning])
    expect(ring).toEqual({ expected: 1, completed: 0, progress: 0 })
  })

  it('excludes an expired task outright, so it cannot drag the ring down forever', () => {
    expect(ringFor([expiredLastWeek])).toBeNull()
  })

  it('excludes an undated task — it is not expected today either way', () => {
    expect(ringFor([anytimeTask, overdueThisMorning])?.expected).toBe(1)
  })

  it('counts a reminder due today alongside tasks', () => {
    const ring = ringFor([reminderDueToday, reminderCompletedToday])
    expect(ring).toEqual({ expected: 2, completed: 1, progress: 0.5 })
  })

  it('never counts a habit a second time as a task', () => {
    expect(ringFor([habitDueSoon])).toBeNull()
  })

  it("ignores yesterday's completion", () => {
    expect(ringFor([completedYesterdayTask])).toBeNull()
  })

  it('closes at exactly 1 when everything due today is done', () => {
    expect(ringFor([completedTodayTask])?.progress).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// The gold (habits) ring
// ---------------------------------------------------------------------------

describe('habitsRing', () => {
  it('counts an undated habit — it is still one of today’s habits', () => {
    expect(habitsRing([habitUndated], DO_MOCK_NOW)?.expected).toBe(1)
  })

  it('fills only with habits completed today', () => {
    const ring = habitsRing(
      [habitUndated, habitDueSoon, habitCompletedToday],
      DO_MOCK_NOW,
    )
    expect(ring).toEqual({ expected: 3, completed: 1, progress: 1 / 3 })
  })

  it('is absent on a day with no habits at all', () => {
    expect(habitsRing([], DO_MOCK_NOW)).toBeNull()
  })

  it('ignores anything that is not a habit', () => {
    expect(habitsRing([overdueThisMorning], DO_MOCK_NOW)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Filter independence — the rule the whole file exists for
// ---------------------------------------------------------------------------

describe('the rings and the visibility selection', () => {
  it('still counts a habit the user has hidden from every lane', () => {
    // Hiding the habit kind empties the habit cards from the lanes…
    const hidingHabits = doLensFor({
      ...initialDoVisibility,
      hiddenKinds: [EndeavorKind.habit],
    })
    const lanes = partitionDoTaskLanes({
      tasks: [habitDueSoon, habitUndated, overdueThisMorning],
      reminders: [],
      lens: hidingHabits,
      nowThresholdHours: 2,
      now: DO_MOCK_NOW,
    })
    expect(lanes.now.concat(lanes.anytime)).toEqual([])

    // …and leaves the gold denominator exactly where it was, because the ring
    // is a fact about the day rather than about what is on screen.
    expect(
      habitsRing([habitDueSoon, habitUndated], DO_MOCK_NOW)?.expected,
    ).toBe(2)
  })

  it('does not move when the Completed Today lane is hidden', () => {
    // Hiding the completed state empties that lane; the numerator here is
    // computed from the channel, so it is untouched.
    const ring = ringFor([overdueThisMorning, completedTodayTask])
    expect(ring?.completed).toBe(1)
  })

  it('counts every host, not only the visible one', () => {
    const ring = ringFor([overdueThisMorning, reminderDueToday])
    expect(ring?.expected).toBe(2)
  })
})

describe('areDoRingsVisible', () => {
  it('shows the readout when the kill switch is on and bulk mode is off', () => {
    expect(
      areDoRingsVisible({
        activityRingsEnabled: true,
        isInMarkCompleteMode: false,
      }),
    ).toBe(true)
  })

  it('hides it in bulk mark-complete mode, so nothing competes with the instruction', () => {
    expect(
      areDoRingsVisible({
        activityRingsEnabled: true,
        isInMarkCompleteMode: true,
      }),
    ).toBe(false)
  })

  it('hides it when the flag is off', () => {
    expect(
      areDoRingsVisible({
        activityRingsEnabled: false,
        isInMarkCompleteMode: false,
      }),
    ).toBe(false)
  })
})
