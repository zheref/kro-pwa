import { describe, expect, it } from 'vitest'
import {
  MOCK_NOW,
  endeavorMocks,
} from '../../domain/endeavor/__mocks__/Endeavor.mocks'
import {
  EndeavorPredicate,
  endeavorPredicateFromRawValue,
  endeavorPredicates,
  matchesEndeavorPredicate,
} from '../EndeavorPredicate'

describe('the closed catalog', () => {
  it('carries exactly canon’s four cases, in declaration order', () => {
    expect(endeavorPredicates).toEqual([
      'isDueToday',
      'isDueSoon',
      'isCompleted',
      'isRecent',
    ])
  })

  it('narrows a persisted raw value back into the union', () => {
    expect(endeavorPredicateFromRawValue('isDueSoon')).toBe(
      EndeavorPredicate.isDueSoon,
    )
  })

  it('refuses a name that no case answers to, rather than casting it through', () => {
    expect(endeavorPredicateFromRawValue('isBlocked')).toBeNull()
  })
})

describe('isDueToday', () => {
  it('matches a task due later on the same calendar day', () => {
    expect(
      matchesEndeavorPredicate(
        EndeavorPredicate.isDueToday,
        endeavorMocks.plannedTask,
        MOCK_NOW,
      ),
    ).toBe(true)
  })

  it('rejects an item that went overdue two days ago', () => {
    expect(
      matchesEndeavorPredicate(
        EndeavorPredicate.isDueToday,
        endeavorMocks.overdueTouristReminder,
        MOCK_NOW,
      ),
    ).toBe(false)
  })

  it('rejects an event, which is driven by `start` and carries no `due` at all', () => {
    expect(
      matchesEndeavorPredicate(
        EndeavorPredicate.isDueToday,
        endeavorMocks.todayEvent,
        MOCK_NOW,
      ),
    ).toBe(false)
  })
})

describe('isDueSoon', () => {
  it('matches a task due within the next 72 hours', () => {
    expect(
      matchesEndeavorPredicate(
        EndeavorPredicate.isDueSoon,
        endeavorMocks.plannedTask,
        MOCK_NOW,
      ),
    ).toBe(true)
  })

  it('does not count an already-overdue item as due soon — Do lists those lanes apart', () => {
    expect(
      matchesEndeavorPredicate(
        EndeavorPredicate.isDueSoon,
        endeavorMocks.overdueTouristReminder,
        MOCK_NOW,
      ),
    ).toBe(false)
  })

  it('rejects a task due four days out', () => {
    const farOut = {
      ...endeavorMocks.plannedTask,
      due: new Date(2026, 0, 19, 9, 0, 0),
    }
    expect(
      matchesEndeavorPredicate(EndeavorPredicate.isDueSoon, farOut, MOCK_NOW),
    ).toBe(false)
  })
})

describe('isCompleted', () => {
  it('matches the endeavor whose host reported a completion timestamp', () => {
    expect(
      matchesEndeavorPredicate(
        EndeavorPredicate.isCompleted,
        endeavorMocks.completedWithPerformances,
        MOCK_NOW,
      ),
    ).toBe(true)
  })

  it('rejects an open task', () => {
    expect(
      matchesEndeavorPredicate(
        EndeavorPredicate.isCompleted,
        endeavorMocks.plannedTask,
        MOCK_NOW,
      ),
    ).toBe(false)
  })

  it('ignores `now` entirely — it reads a stored field, not the clock', () => {
    const yearLater = new Date(2027, 0, 15, 9, 0, 0)
    expect(
      matchesEndeavorPredicate(
        EndeavorPredicate.isCompleted,
        endeavorMocks.completedWithPerformances,
        yearLater,
      ),
    ).toBe(true)
  })
})

describe('isRecent', () => {
  it('matches an endeavor created inside the 48-hour window', () => {
    expect(
      matchesEndeavorPredicate(
        EndeavorPredicate.isRecent,
        endeavorMocks.plannedTask,
        MOCK_NOW,
      ),
    ).toBe(true)
  })

  it('rejects one created back in November', () => {
    expect(
      matchesEndeavorPredicate(
        EndeavorPredicate.isRecent,
        endeavorMocks.blockedBlueprint,
        MOCK_NOW,
      ),
    ).toBe(false)
  })

  it('rejects a draft that has no creation stamp at all', () => {
    expect(
      matchesEndeavorPredicate(
        EndeavorPredicate.isRecent,
        endeavorMocks.bareDraft,
        MOCK_NOW,
      ),
    ).toBe(false)
  })
})
