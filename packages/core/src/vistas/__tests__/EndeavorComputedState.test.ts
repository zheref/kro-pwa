import { describe, expect, it } from 'vitest'
import {
  MOCK_NOW,
  endeavorMocks,
} from '../../domain/endeavor/__mocks__/Endeavor.mocks'
import { EndeavorKind } from '../../domain/endeavor/EndeavorKind'
import { EndeavorStatus } from '../../domain/endeavor/EndeavorStatus'
import { PerformResolution, makePerform } from '../../domain/endeavor/Perform'
import {
  EndeavorComputedState,
  endeavorComputedStateFromRawValue,
  endeavorComputedStates,
  matchesEndeavorComputedState,
} from '../EndeavorComputedState'

const overdueToday = {
  ...endeavorMocks.plannedTask,
  status: EndeavorStatus.pending,
  due: new Date(2026, 0, 15, 7, 0, 0),
}

describe('the closed catalog', () => {
  it('carries exactly canon’s three cases, in declaration order', () => {
    expect(endeavorComputedStates).toEqual([
      'overdue',
      'expired',
      'completedToday',
    ])
  })

  it('narrows a persisted raw value back into the union', () => {
    expect(endeavorComputedStateFromRawValue('completedToday')).toBe(
      EndeavorComputedState.completedToday,
    )
  })

  it('refuses a state name no case answers to', () => {
    expect(endeavorComputedStateFromRawValue('dueSoon')).toBeNull()
  })
})

describe('overdue — past-due AND due today', () => {
  it('matches a task whose 7am due time slipped past a 9am now', () => {
    expect(
      matchesEndeavorComputedState(
        EndeavorComputedState.overdue,
        overdueToday,
        MOCK_NOW,
      ),
    ).toBe(true)
  })

  it('rejects an item due two days ago — that is expired, a separate lane', () => {
    expect(
      matchesEndeavorComputedState(
        EndeavorComputedState.overdue,
        endeavorMocks.overdueTouristReminder,
        MOCK_NOW,
      ),
    ).toBe(false)
  })

  it('rejects a task already marked done, however late its due time was', () => {
    expect(
      matchesEndeavorComputedState(
        EndeavorComputedState.overdue,
        { ...overdueToday, status: EndeavorStatus.closed },
        MOCK_NOW,
      ),
    ).toBe(false)
  })

  it('rejects a calendar event: only tasks and habits go overdue', () => {
    expect(
      matchesEndeavorComputedState(
        EndeavorComputedState.overdue,
        { ...overdueToday, kind: EndeavorKind.calendarEvent },
        MOCK_NOW,
      ),
    ).toBe(false)
  })

  it('rejects a task still due later today', () => {
    expect(
      matchesEndeavorComputedState(
        EndeavorComputedState.overdue,
        endeavorMocks.plannedTask,
        MOCK_NOW,
      ),
    ).toBe(false)
  })
})

describe('expired — past-due AND NOT due today', () => {
  it('matches the reminder that went past its due date two days ago', () => {
    expect(
      matchesEndeavorComputedState(
        EndeavorComputedState.expired,
        { ...endeavorMocks.overdueTouristReminder, kind: EndeavorKind.task },
        MOCK_NOW,
      ),
    ).toBe(true)
  })

  it('rejects a task that merely slipped earlier the same morning', () => {
    expect(
      matchesEndeavorComputedState(
        EndeavorComputedState.expired,
        overdueToday,
        MOCK_NOW,
      ),
    ).toBe(false)
  })

  it('rejects a reminder, which canon excludes from both past-due lanes', () => {
    expect(
      matchesEndeavorComputedState(
        EndeavorComputedState.expired,
        endeavorMocks.overdueTouristReminder,
        MOCK_NOW,
      ),
    ).toBe(false)
  })

  it('rejects an item with no due date to be past', () => {
    expect(
      matchesEndeavorComputedState(
        EndeavorComputedState.expired,
        endeavorMocks.weekdayHabit,
        MOCK_NOW,
      ),
    ).toBe(false)
  })
})

describe('completedToday', () => {
  it('matches a task closed earlier the same day', () => {
    const closedToday = {
      ...endeavorMocks.completedWithPerformances,
      completed: new Date(2026, 0, 15, 8, 30, 0),
    }
    expect(
      matchesEndeavorComputedState(
        EndeavorComputedState.completedToday,
        closedToday,
        MOCK_NOW,
      ),
    ).toBe(true)
  })

  it('rejects a task closed six days ago — yesterday’s work leaves the lane', () => {
    expect(
      matchesEndeavorComputedState(
        EndeavorComputedState.completedToday,
        endeavorMocks.completedWithPerformances,
        MOCK_NOW,
      ),
    ).toBe(false)
  })

  it('falls back to the latest complete performance when the host reported no timestamp', () => {
    const noHostStamp = {
      ...endeavorMocks.completedWithPerformances,
      completed: null,
      performances: [
        makePerform({
          date: new Date(2026, 0, 15, 7, 0, 0),
          duration: 600,
          resolution: PerformResolution.complete,
          completedAt: new Date(2026, 0, 15, 7, 10, 0),
        }),
      ],
    }
    expect(
      matchesEndeavorComputedState(
        EndeavorComputedState.completedToday,
        noHostStamp,
        MOCK_NOW,
      ),
    ).toBe(true)
  })

  it('ignores an aborted performance when falling back', () => {
    const abortedOnly = {
      ...endeavorMocks.completedWithPerformances,
      completed: null,
      performances: [
        makePerform({
          date: new Date(2026, 0, 15, 7, 0, 0),
          duration: 120,
          resolution: PerformResolution.aborted,
          completedAt: new Date(2026, 0, 15, 7, 2, 0),
        }),
      ],
    }
    expect(
      matchesEndeavorComputedState(
        EndeavorComputedState.completedToday,
        abortedOnly,
        MOCK_NOW,
      ),
    ).toBe(false)
  })

  it('requires the status to be closed — `reviewing` is done but not completed-today', () => {
    const reviewing = {
      ...endeavorMocks.completedWithPerformances,
      status: EndeavorStatus.reviewing,
      completed: new Date(2026, 0, 15, 8, 30, 0),
    }
    expect(
      matchesEndeavorComputedState(
        EndeavorComputedState.completedToday,
        reviewing,
        MOCK_NOW,
      ),
    ).toBe(false)
  })

  it('rejects a blueprint: only tasks, habits and reminders complete', () => {
    const blueprint = {
      ...endeavorMocks.completedWithPerformances,
      kind: EndeavorKind.blueprint,
      completed: new Date(2026, 0, 15, 8, 30, 0),
    }
    expect(
      matchesEndeavorComputedState(
        EndeavorComputedState.completedToday,
        blueprint,
        MOCK_NOW,
      ),
    ).toBe(false)
  })
})
