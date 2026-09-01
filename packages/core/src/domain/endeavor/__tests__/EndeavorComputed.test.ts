import { describe, expect, it } from 'vitest'
import { MOCK_NOW, endeavorMocks } from '../__mocks__/Endeavor.mocks'
import { shadowMocks } from '../__mocks__/EndeavorRelations.mocks'
import { makeEndeavor } from '../Endeavor'
import {
  DUE_SOON_WINDOW_SECONDS,
  RECENT_WINDOW_SECONDS,
  endOf,
  exposesEvent,
  hasBeenCompleted,
  hasBeenPersisted,
  isCompleted,
  isDue,
  isDueSoon,
  isDueToday,
  isEngaging,
  isEvent,
  isOnlyInMemory,
  isRecent,
  isShadowing,
} from '../EndeavorComputed'
import { EndeavorHost } from '../EndeavorHost'
import { EndeavorKind } from '../EndeavorKind'
import { EndeavorStatus } from '../EndeavorStatus'
import { EndeavorTag } from '../EndeavorTag'

const base = (overrides: Parameters<typeof makeEndeavor>[0]) =>
  makeEndeavor(overrides)

describe('canon windows', () => {
  it('uses 48 hours for `isRecent`', () => {
    expect(RECENT_WINDOW_SECONDS).toBe(172_800)
  })

  it('uses 72 hours for `isDueSoon`', () => {
    expect(DUE_SOON_WINDOW_SECONDS).toBe(259_200)
  })
})

describe('isCompleted vs hasBeenCompleted', () => {
  it('isCompleted reads the host timestamp, not the status', () => {
    expect(isCompleted(endeavorMocks.completedWithPerformances)).toBe(true)
    expect(isCompleted(endeavorMocks.plannedTask)).toBe(false)
  })

  it('hasBeenCompleted counts qa, reviewing and skipped as done, not just closed', () => {
    for (const status of [
      EndeavorStatus.closed,
      EndeavorStatus.reviewing,
      EndeavorStatus.qa,
      EndeavorStatus.skipped,
    ]) {
      expect(hasBeenCompleted({ ...endeavorMocks.plannedTask, status })).toBe(
        true,
      )
    }
  })

  it('hasBeenCompleted rejects the six open statuses', () => {
    for (const status of [
      EndeavorStatus.pending,
      EndeavorStatus.planned,
      EndeavorStatus.ongoing,
      EndeavorStatus.paused,
      EndeavorStatus.delegated,
      EndeavorStatus.blocked,
    ]) {
      expect(hasBeenCompleted({ ...endeavorMocks.plannedTask, status })).toBe(
        false,
      )
    }
  })

  it('can disagree with isCompleted — a closed row with no host stamp', () => {
    const closedWithoutStamp = {
      ...endeavorMocks.plannedTask,
      status: EndeavorStatus.closed,
      completed: null,
    }
    expect(hasBeenCompleted(closedWithoutStamp)).toBe(true)
    expect(isCompleted(closedWithoutStamp)).toBe(false)
  })
})

describe('isEvent', () => {
  it('is true only for the calendarEvent kind', () => {
    expect(isEvent(endeavorMocks.todayEvent)).toBe(true)
    expect(isEvent(endeavorMocks.plannedTask)).toBe(false)
    expect(isEvent(endeavorMocks.weekdayHabit)).toBe(false)
  })
})

describe('endOf', () => {
  it('adds the duration to the start', () => {
    expect(endOf(endeavorMocks.todayEvent)).toEqual(
      new Date(2026, 0, 15, 8, 30, 0),
    )
  })

  it('is null when there is no start', () => {
    expect(endOf(endeavorMocks.completedWithPerformances)).toBeNull()
  })

  it('is null when there is no duration', () => {
    expect(endOf({ ...endeavorMocks.todayEvent, duration: null })).toBeNull()
  })
})

describe('isEngaging', () => {
  it('is true for an untagged, non-draft task', () => {
    expect(
      isEngaging(
        base({ id: 'e', title: 'x', kind: EndeavorKind.task, isDraft: false }),
      ),
    ).toBe(true)
  })

  it('is false for all three meta kinds', () => {
    for (const kind of [
      EndeavorKind.background,
      EndeavorKind.behavior,
      EndeavorKind.blueprint,
    ]) {
      expect(isEngaging(base({ id: 'e', title: 'x', kind }))).toBe(false)
    }
  })

  it('is false for a draft', () => {
    expect(isEngaging(endeavorMocks.bareDraft)).toBe(false)
  })

  it('is false when ANY tag allows background execution', () => {
    expect(
      isEngaging(
        base({
          id: 'e',
          title: 'x',
          kind: EndeavorKind.task,
          tags: [EndeavorTag.engaging, EndeavorTag.passive],
        }),
      ),
    ).toBe(false)
  })

  it('is true when the only tag is `engaging`, which demands attention', () => {
    expect(
      isEngaging(
        base({
          id: 'e',
          title: 'x',
          kind: EndeavorKind.task,
          tags: [EndeavorTag.engaging],
        }),
      ),
    ).toBe(true)
  })

  it('is true when the only tag is `replica`, whose attention is unknown', () => {
    expect(
      isEngaging(
        base({
          id: 'e',
          title: 'x',
          kind: EndeavorKind.task,
          tags: [EndeavorTag.replica],
        }),
      ),
    ).toBe(true)
  })
})

describe('hasBeenPersisted / isOnlyInMemory', () => {
  it('reads a hosted endeavor as persisted', () => {
    expect(hasBeenPersisted(endeavorMocks.plannedTask)).toBe(true)
    expect(isOnlyInMemory(endeavorMocks.plannedTask)).toBe(false)
  })

  it('reads an unhosted draft as memory-only', () => {
    expect(hasBeenPersisted(endeavorMocks.bareDraft)).toBe(false)
    expect(isOnlyInMemory(endeavorMocks.bareDraft)).toBe(true)
  })

  it('are exact negations of each other across the whole mock spread', () => {
    for (const endeavor of Object.values(endeavorMocks)) {
      expect(hasBeenPersisted(endeavor)).toBe(!isOnlyInMemory(endeavor))
    }
  })
})

describe('isDue', () => {
  it('is true when the due moment has passed', () => {
    expect(isDue(endeavorMocks.overdueTouristReminder, MOCK_NOW)).toBe(true)
  })

  it('is false when the due moment is still ahead', () => {
    expect(isDue(endeavorMocks.plannedTask, MOCK_NOW)).toBe(false)
  })

  it('is false when there is no due date at all', () => {
    expect(isDue(endeavorMocks.todayEvent, MOCK_NOW)).toBe(false)
  })

  it('is false at the exact due instant — strictly "has passed"', () => {
    const due = new Date(2026, 0, 15, 9, 0, 0)
    expect(isDue({ ...endeavorMocks.plannedTask, due }, MOCK_NOW)).toBe(false)
  })
})

describe('isDueToday', () => {
  it('is true for a due date later the same day', () => {
    expect(isDueToday(endeavorMocks.plannedTask, MOCK_NOW)).toBe(true)
  })

  it('is true for a due date EARLIER the same day — overdue is still today', () => {
    expect(
      isDueToday(
        { ...endeavorMocks.plannedTask, due: new Date(2026, 0, 15, 6, 0, 0) },
        MOCK_NOW,
      ),
    ).toBe(true)
  })

  it('is false for yesterday and for tomorrow', () => {
    expect(isDueToday(endeavorMocks.overdueTouristReminder, MOCK_NOW)).toBe(
      false,
    )
    expect(
      isDueToday(
        { ...endeavorMocks.plannedTask, due: new Date(2026, 0, 16, 9, 0, 0) },
        MOCK_NOW,
      ),
    ).toBe(false)
  })

  it('is false with no due date', () => {
    expect(isDueToday(endeavorMocks.todayEvent, MOCK_NOW)).toBe(false)
  })
})

describe('isDueSoon', () => {
  it('is true inside the 72-hour window', () => {
    expect(
      isDueSoon(
        { ...endeavorMocks.plannedTask, due: new Date(2026, 0, 17, 9, 0, 0) },
        MOCK_NOW,
      ),
    ).toBe(true)
  })

  it('is false beyond the window', () => {
    expect(
      isDueSoon(
        { ...endeavorMocks.plannedTask, due: new Date(2026, 0, 25, 9, 0, 0) },
        MOCK_NOW,
      ),
    ).toBe(false)
  })

  it('is false for an OVERDUE endeavor — Overdue and Due Soon are separate lanes', () => {
    expect(isDueSoon(endeavorMocks.overdueTouristReminder, MOCK_NOW)).toBe(
      false,
    )
    expect(isDue(endeavorMocks.overdueTouristReminder, MOCK_NOW)).toBe(true)
  })

  it('is false with no due date', () => {
    expect(isDueSoon(endeavorMocks.weekdayHabit, MOCK_NOW)).toBe(false)
  })
})

describe('isRecent', () => {
  it('is true for something created inside the last 48 hours', () => {
    expect(isRecent(endeavorMocks.plannedTask, MOCK_NOW)).toBe(true)
  })

  it('is false for something created weeks ago', () => {
    expect(isRecent(endeavorMocks.blockedBlueprint, MOCK_NOW)).toBe(false)
  })

  it('is false when `createdAt` is null', () => {
    expect(isRecent(endeavorMocks.bareDraft, MOCK_NOW)).toBe(false)
  })

  it('is false for a creation stamp in the future', () => {
    expect(
      isRecent(
        {
          ...endeavorMocks.plannedTask,
          createdAt: new Date(2026, 0, 16, 9, 0, 0),
        },
        MOCK_NOW,
      ),
    ).toBe(false)
  })
})

describe('isShadowing', () => {
  const captured = base({
    id: 'captured',
    title: 'Cook Breakfast',
    kind: EndeavorKind.calendarEvent,
    shadows: [shadowMocks.googleEvent],
  })

  const kroSide = base({
    id: 'kro-side',
    title: 'Cook Breakfast',
    kind: EndeavorKind.calendarEvent,
    hostedBy: [EndeavorHost.supabase],
    shadows: [shadowMocks.googleEvent],
  })

  it('is true when a supabase-hosted endeavor already carries the same shadow', () => {
    expect(isShadowing(kroSide, captured)).toBe(true)
  })

  it('is false when the endeavor is not hosted by supabase', () => {
    expect(
      isShadowing({ ...kroSide, hostedBy: [EndeavorHost.local] }, captured),
    ).toBe(false)
  })

  it('is false when the endeavor has no shadows to compare', () => {
    expect(isShadowing({ ...kroSide, shadows: null }, captured)).toBe(false)
  })

  it('is false when the captured event carries no shadow', () => {
    expect(isShadowing(kroSide, { ...captured, shadows: null })).toBe(false)
  })

  it('is false when the source identifier differs', () => {
    expect(
      isShadowing(kroSide, {
        ...captured,
        shadows: [{ ...shadowMocks.googleEvent, sourceIdentifier: 'other' }],
      }),
    ).toBe(false)
  })

  it('ignores group and kind — a moved item still matches its mirror', () => {
    expect(
      isShadowing(kroSide, {
        ...captured,
        shadows: [
          {
            ...shadowMocks.googleEvent,
            group: 'Work',
            kind: EndeavorKind.task,
          },
        ],
      }),
    ).toBe(true)
  })
})

describe('exposesEvent', () => {
  it('is true when a calendarEvent shadow carries the id', () => {
    expect(exposesEvent(endeavorMocks.todayEvent, 'gcal-event-8891')).toBe(true)
  })

  it('is false for an id no shadow carries', () => {
    expect(exposesEvent(endeavorMocks.todayEvent, 'gcal-event-0000')).toBe(
      false,
    )
  })

  it('is false when the matching shadow is not a calendarEvent', () => {
    expect(
      exposesEvent(endeavorMocks.overdueTouristReminder, 'reminders-x-4410'),
    ).toBe(false)
  })

  it('is false when there are no shadows at all', () => {
    expect(exposesEvent(endeavorMocks.plannedTask, 'anything')).toBe(false)
    expect(
      exposesEvent(endeavorMocks.completedWithPerformances, 'anything'),
    ).toBe(false)
  })
})
