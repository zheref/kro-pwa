/**
 * The matrix table, walked exhaustively.
 *
 * `resolveIntoQuadrant` is asserted over **every** combination of destination
 * quadrant × existing due state × existing value state (4 × 4 × 5 = 80 rows),
 * against the due date and value canon's rules produce, and then round-tripped
 * through `planMatrixQuadrant` — because the real contract is not "writes these
 * fields" but "writes fields whose *derived* classification is this quadrant."
 */
import type { Endeavor } from '@kro/core'
import {
  EisenhowerQuadrant,
  EndeavorHost,
  EndeavorKind,
  EndeavorStatus,
  dailyBase,
  eisenhowerQuadrants,
  makeEndeavor,
  makeRepeatConfig,
  makeShadow,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import { addingPlanDays, startOfPlanDay } from '../PlanCalendar'
import {
  PlanPresentationKind,
  followingWeekend,
  isEligibleMatrixKind,
  isIssueTrackerTicket,
  planMatrixAdmits,
  planMatrixItems,
  planMatrixPickerCandidates,
  planMatrixQuadrant,
  planMatrixResolvedDue,
  planMatrixResolvedValue,
  planPresentationKind,
  resolveIntoQuadrant,
} from '../PlanMatrix'
import {
  PLAN_REFERENCE_NOW,
  planAt,
  planMatrixFixtureList,
  planMatrixFixtures,
} from '../PlanMocks'

const now = PLAN_REFERENCE_NOW // Thursday 2026-06-18, 09:40 local
const startOfToday = startOfPlanDay(now)
const endOfToday = new Date(addingPlanDays(startOfToday, 1).getTime() - 1000)

const taskWith = (due: Date | null, value: number | null): Endeavor =>
  makeEndeavor({
    id: `task-${String(due?.getTime() ?? 'none')}-${String(value ?? 'none')}`,
    title: 'Table row',
    kind: EndeavorKind.task,
    status: EndeavorStatus.pending,
    due,
    value,
  })

// ------------------------------------------------------------ classification

describe('planMatrixQuadrant — the derived quadrant', () => {
  it('puts a today-due, highly-valued task in Prioritize', () => {
    expect(planMatrixQuadrant(taskWith(planAt(17), 5), now)).toBe(
      EisenhowerQuadrant.prioritize,
    )
  })

  it('puts a future, highly-valued task in Schedule', () => {
    expect(
      planMatrixQuadrant(taskWith(addingPlanDays(startOfToday, 3), 4), now),
    ).toBe(EisenhowerQuadrant.decide)
  })

  it('puts a today-due, low-value task in Delegate', () => {
    expect(planMatrixQuadrant(taskWith(planAt(18), 3), now)).toBe(
      EisenhowerQuadrant.delegate,
    )
  })

  it('puts a future, low-value task in Archive', () => {
    expect(
      planMatrixQuadrant(taskWith(addingPlanDays(startOfToday, 5), 1), now),
    ).toBe(EisenhowerQuadrant.delete)
  })

  it('treats an overdue task as urgent, not as belonging to no quadrant', () => {
    expect(
      planMatrixQuadrant(taskWith(addingPlanDays(startOfToday, -2), 5), now),
    ).toBe(EisenhowerQuadrant.prioritize)
  })

  it('splits importance at 4, so a 3 is never important', () => {
    expect(planMatrixQuadrant(taskWith(planAt(17), 3), now)).toBe(
      EisenhowerQuadrant.delegate,
    )
    expect(planMatrixQuadrant(taskWith(planAt(17), 4), now)).toBe(
      EisenhowerQuadrant.prioritize,
    )
  })

  it('excludes an untriaged task rather than reading a missing field as a value', () => {
    expect(planMatrixQuadrant(taskWith(planAt(17), null), now)).toBeNull()
    expect(planMatrixQuadrant(taskWith(null, 5), now)).toBeNull()
    expect(planMatrixQuadrant(taskWith(null, null), now)).toBeNull()
  })

  it('treats the last second of today as urgent and the first of tomorrow as not', () => {
    expect(planMatrixQuadrant(taskWith(endOfToday, 5), now)).toBe(
      EisenhowerQuadrant.prioritize,
    )
    expect(
      planMatrixQuadrant(taskWith(addingPlanDays(startOfToday, 1), 5), now),
    ).toBe(EisenhowerQuadrant.decide)
  })
})

// -------------------------------------------------------------- assignment

describe('followingWeekend', () => {
  it('lands on 09:00 the coming Saturday from a Thursday', () => {
    const saturday = followingWeekend(now)
    expect(saturday.getDay()).toBe(6)
    expect(saturday.getDate()).toBe(20)
    expect(saturday.getHours()).toBe(9)
    expect(saturday.getMinutes()).toBe(0)
  })

  it('skips a whole week when today is itself a Saturday', () => {
    const saturday = new Date(2026, 5, 20, 11, 0)
    const next = followingWeekend(saturday)
    expect(next.getDay()).toBe(6)
    expect(next.getDate()).toBe(27)
  })

  it('lands on tomorrow when today is a Friday', () => {
    const friday = new Date(2026, 5, 19, 11, 0)
    expect(followingWeekend(friday).getDate()).toBe(20)
  })

  it('is always strictly after today, for every weekday', () => {
    for (let offset = 0; offset < 7; offset += 1) {
      const day = addingPlanDays(startOfToday, offset)
      expect(followingWeekend(day).getTime()).toBeGreaterThan(
        addingPlanDays(day, 1).getTime() - 1,
      )
    }
  })
})

describe('planMatrixResolvedValue', () => {
  it('raises an unrated endeavor to 4 for an important destination', () => {
    expect(planMatrixResolvedValue(null, EisenhowerQuadrant.prioritize)).toBe(4)
  })

  it('preserves a 5 rather than flattening it to the floor', () => {
    expect(planMatrixResolvedValue(5, EisenhowerQuadrant.decide)).toBe(5)
  })

  it('preserves 1–3 for a lower-impact destination', () => {
    expect(planMatrixResolvedValue(1, EisenhowerQuadrant.delegate)).toBe(1)
    expect(planMatrixResolvedValue(3, EisenhowerQuadrant.delete)).toBe(3)
  })

  it('reduces 4–5 to 2 for a lower-impact destination', () => {
    expect(planMatrixResolvedValue(4, EisenhowerQuadrant.delegate)).toBe(2)
    expect(planMatrixResolvedValue(5, EisenhowerQuadrant.delete)).toBe(2)
  })

  it('assigns 2 when a lower-impact destination has nothing to preserve', () => {
    expect(planMatrixResolvedValue(null, EisenhowerQuadrant.delete)).toBe(2)
  })
})

describe('planMatrixResolvedDue', () => {
  it('keeps a due date that already falls today for an urgent destination', () => {
    expect(
      planMatrixResolvedDue(planAt(14), EisenhowerQuadrant.prioritize, now),
    ).toEqual(planAt(14))
  })

  it('parks an urgent destination at 23:59:59 today otherwise', () => {
    expect(
      planMatrixResolvedDue(null, EisenhowerQuadrant.delegate, now),
    ).toEqual(endOfToday)
  })

  it('keeps an already-future due date for a non-urgent destination', () => {
    const future = addingPlanDays(startOfToday, 4)
    expect(
      planMatrixResolvedDue(future, EisenhowerQuadrant.decide, now),
    ).toEqual(future)
  })

  it('parks a non-urgent destination on the next Saturday otherwise', () => {
    expect(planMatrixResolvedDue(null, EisenhowerQuadrant.delete, now)).toEqual(
      followingWeekend(now),
    )
    expect(
      planMatrixResolvedDue(planAt(14), EisenhowerQuadrant.delete, now),
    ).toEqual(followingWeekend(now))
  })

  it('does not treat an overdue date as "already today" for an urgent destination', () => {
    expect(
      planMatrixResolvedDue(
        addingPlanDays(startOfToday, -1),
        EisenhowerQuadrant.prioritize,
        now,
      ),
    ).toEqual(endOfToday)
  })
})

describe('resolveIntoQuadrant — the exhaustive table', () => {
  const dueStates = {
    none: null,
    overdue: new Date(
      addingPlanDays(startOfToday, -2).getTime() + 9 * 3600_000,
    ),
    today: planAt(14),
    future: new Date(addingPlanDays(startOfToday, 3).getTime() + 9 * 3600_000),
  } as const

  const valueStates = [null, 1, 3, 4, 5] as const

  const expectedDue = (
    quadrant: EisenhowerQuadrant,
    due: Date | null,
  ): Date => {
    const urgent =
      quadrant === EisenhowerQuadrant.prioritize ||
      quadrant === EisenhowerQuadrant.delegate
    if (urgent) return due === dueStates.today ? dueStates.today : endOfToday
    return due === dueStates.future ? dueStates.future : followingWeekend(now)
  }

  const expectedValue = (
    quadrant: EisenhowerQuadrant,
    value: number | null,
  ): number => {
    const important =
      quadrant === EisenhowerQuadrant.prioritize ||
      quadrant === EisenhowerQuadrant.decide
    if (important) return Math.max(4, value ?? 0)
    if (value !== null && value <= 3) return value
    return 2
  }

  for (const quadrant of eisenhowerQuadrants) {
    for (const [dueName, due] of Object.entries(dueStates)) {
      for (const value of valueStates) {
        const valueName = value === null ? 'no value' : `value ${value}`
        it(`assigning ${quadrant} to a task with ${dueName} due and ${valueName} writes the canon pair`, () => {
          const resolved = resolveIntoQuadrant(
            taskWith(due, value),
            quadrant,
            now,
          )
          expect(resolved.due).toEqual(expectedDue(quadrant, due))
          expect(resolved.value).toBe(expectedValue(quadrant, value))
        })

        it(`assigning ${quadrant} to a task with ${dueName} due and ${valueName} resolves back to ${quadrant}`, () => {
          const resolved = resolveIntoQuadrant(
            taskWith(due, value),
            quadrant,
            now,
          )
          expect(planMatrixQuadrant(resolved, now)).toBe(quadrant)
        })
      }
    }
  }

  it('leaves every other field of the endeavor alone', () => {
    const original = taskWith(planAt(14), 3)
    const resolved = resolveIntoQuadrant(
      original,
      EisenhowerQuadrant.decide,
      now,
    )
    expect(resolved.id).toBe(original.id)
    expect(resolved.title).toBe(original.title)
    expect(resolved.kind).toBe(original.kind)
    expect(resolved.status).toBe(original.status)
  })
})

// --------------------------------------------------------------- admission

describe('planPresentationKind / isIssueTrackerTicket', () => {
  it('files a plain task under tasks', () => {
    expect(planPresentationKind(planMatrixFixtures.urgentImportant)).toBe(
      PlanPresentationKind.tasks,
    )
  })

  it('files a Jira-shadowed task under tickets', () => {
    expect(planPresentationKind(planMatrixFixtures.ticket)).toBe(
      PlanPresentationKind.tickets,
    )
    expect(isIssueTrackerTicket(planMatrixFixtures.ticket)).toBe(true)
  })

  it('files a calendar event, habit and reminder under their own buckets', () => {
    expect(planPresentationKind(planMatrixFixtures.calendarEvent)).toBe(
      PlanPresentationKind.events,
    )
    expect(planPresentationKind(planMatrixFixtures.habit)).toBe(
      PlanPresentationKind.habits,
    )
    expect(planPresentationKind(planMatrixFixtures.reminder)).toBe(
      PlanPresentationKind.reminders,
    )
  })

  it('does not call an endeavor with no shadows a ticket', () => {
    expect(isIssueTrackerTicket(planMatrixFixtures.urgentImportant)).toBe(false)
  })
})

describe('isEligibleMatrixKind — admission by resolved kind only', () => {
  it('admits a task', () => {
    expect(isEligibleMatrixKind(planMatrixFixtures.urgentImportant)).toBe(true)
  })

  it('admits an externally-tracked ticket', () => {
    expect(isEligibleMatrixKind(planMatrixFixtures.ticket)).toBe(true)
  })

  it('refuses a calendar event, a habit and a reminder', () => {
    expect(isEligibleMatrixKind(planMatrixFixtures.calendarEvent)).toBe(false)
    expect(isEligibleMatrixKind(planMatrixFixtures.habit)).toBe(false)
    expect(isEligibleMatrixKind(planMatrixFixtures.reminder)).toBe(false)
  })

  it('refuses a habit that a stale local row still calls a task', () => {
    // The row's *stored* kind is `task` — a cached fallback — but it is linked
    // to Apple Reminders and recurs daily, which is habit evidence. Admission
    // must follow the resolved kind, not the stale one.
    const staleShadowHabit = makeEndeavor({
      id: 'stale-habit',
      title: 'Stretch',
      kind: EndeavorKind.task,
      due: planAt(20),
      value: 5,
      repeatConfig: makeRepeatConfig(dailyBase()),
      hostedBy: [EndeavorHost.appleReminders],
      shadows: [
        makeShadow({
          originalTitle: 'Stretch',
          sourceIdentifier: 'reminder-1',
          kind: EndeavorKind.task,
          source: 'appleReminders',
        }),
      ],
    })

    expect(staleShadowHabit.kind).toBe(EndeavorKind.task)
    expect(planPresentationKind(staleShadowHabit)).toBe(
      PlanPresentationKind.habits,
    )
    expect(isEligibleMatrixKind(staleShadowHabit)).toBe(false)
    expect(planMatrixAdmits(staleShadowHabit, { now })).toBe(false)
  })
})

describe('planMatrixAdmits', () => {
  it('admits an open, triaged task', () => {
    expect(planMatrixAdmits(planMatrixFixtures.urgentImportant, { now })).toBe(
      true,
    )
  })

  it('refuses a completed task even though it is triaged', () => {
    expect(planMatrixAdmits(planMatrixFixtures.completed, { now })).toBe(false)
  })

  it('refuses an untriaged task, missing either half', () => {
    expect(planMatrixAdmits(planMatrixFixtures.missingValue, { now })).toBe(
      false,
    )
    expect(planMatrixAdmits(planMatrixFixtures.missingDue, { now })).toBe(false)
  })
})

describe('planMatrixItems', () => {
  const items = planMatrixItems(planMatrixFixtureList, { now })

  it('admits exactly the five triaged, open, task-shaped rows', () => {
    expect(items.map((item) => item.id).sort()).toEqual([
      'matrix-decide',
      'matrix-delegate',
      'matrix-delete',
      'matrix-prioritize',
      'matrix-ticket',
    ])
  })

  it('carries each row’s derived quadrant, never a stored one', () => {
    const byId = Object.fromEntries(
      items.map((item) => [item.id, item.quadrant]),
    )
    expect(byId['matrix-prioritize']).toBe(EisenhowerQuadrant.prioritize)
    expect(byId['matrix-decide']).toBe(EisenhowerQuadrant.decide)
    expect(byId['matrix-delegate']).toBe(EisenhowerQuadrant.delegate)
    expect(byId['matrix-delete']).toBe(EisenhowerQuadrant.delete)
  })

  it('preserves input order, so a refresh does not repaint the board', () => {
    expect(items[0]?.id).toBe('matrix-prioritize')
    expect(items[items.length - 1]?.id).toBe('matrix-ticket')
  })

  it('yields nothing for an empty set', () => {
    expect(planMatrixItems([], { now })).toEqual([])
  })
})

describe('planMatrixPickerCandidates', () => {
  const candidates = planMatrixPickerCandidates(planMatrixFixtureList, { now })

  it('offers untriaged tasks, which the items list excludes', () => {
    expect(candidates.map((endeavor) => endeavor.id)).toContain(
      'matrix-no-value',
    )
    expect(candidates.map((endeavor) => endeavor.id)).toContain('matrix-no-due')
  })

  it('still refuses events, habits and reminders', () => {
    const ids = candidates.map((endeavor) => endeavor.id)
    expect(ids).not.toContain('matrix-event')
    expect(ids).not.toContain('matrix-habit')
    expect(ids).not.toContain('matrix-reminder')
  })

  it('still refuses a completed task', () => {
    expect(candidates.map((endeavor) => endeavor.id)).not.toContain(
      'matrix-done',
    )
  })
})
