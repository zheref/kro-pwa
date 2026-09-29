import { describe, expect, it } from 'vitest'
import { makeEndeavor } from '../Endeavor'
import { EndeavorKind, endeavorKinds } from '../EndeavorKind'
import { EndeavorStatus } from '../EndeavorStatus'
import {
  awaitsTriage,
  canBeTriaged,
  hasTriageDisposition,
  hasTriageRatings,
  isTriageReady,
  isTriageableKind,
} from '../TriageReadiness'

const at = (hour: number) => new Date(2026, 0, 15, hour, 0, 0)

const task = (overrides: Partial<Parameters<typeof makeEndeavor>[0]> = {}) =>
  makeEndeavor({
    id: 't',
    title: 'Pay rent',
    kind: EndeavorKind.task,
    ...overrides,
  })

const rated = {
  value: 3,
  due: at(17),
  sessionPoints: 10,
} as const

describe('isTriageableKind', () => {
  it('lets tasks and reminders into triage — the two kinds that wait to be told when', () => {
    expect(isTriageableKind(EndeavorKind.task)).toBe(true)
    expect(isTriageableKind(EndeavorKind.reminder)).toBe(true)
  })

  it('keeps habits and calendar events out — both are already commitments to a moment', () => {
    expect(isTriageableKind(EndeavorKind.habit)).toBe(false)
    expect(isTriageableKind(EndeavorKind.calendarEvent)).toBe(false)
  })

  it('keeps behaviors, blueprints and background work out, and answers every kind', () => {
    expect(isTriageableKind(EndeavorKind.behavior)).toBe(false)
    expect(isTriageableKind(EndeavorKind.blueprint)).toBe(false)
    expect(isTriageableKind(EndeavorKind.background)).toBe(false)
    expect(endeavorKinds.filter(isTriageableKind)).toEqual([
      EndeavorKind.reminder,
      EndeavorKind.task,
    ])
  })
})

describe('hasTriageDisposition', () => {
  it('counts a scheduled start as a disposition', () => {
    expect(hasTriageDisposition(task({ start: at(9) }))).toBe(true)
  })

  it('counts delegated, closed and skipped as dispositions without a start', () => {
    for (const status of [
      EndeavorStatus.delegated,
      EndeavorStatus.closed,
      EndeavorStatus.skipped,
    ]) {
      expect(hasTriageDisposition(task({ status }))).toBe(true)
    }
  })

  it('leaves a pending, unscheduled capture without one', () => {
    expect(hasTriageDisposition(task())).toBe(false)
    expect(hasTriageDisposition(task({ status: EndeavorStatus.blocked }))).toBe(
      false,
    )
  })
})

describe('hasTriageRatings', () => {
  it('is true once value, deadline and reward are all present', () => {
    expect(hasTriageRatings(task(rated))).toBe(true)
  })

  it('does not require effort — decided work stays actionable without it', () => {
    expect(hasTriageRatings(task({ ...rated, effort: null }))).toBe(true)
  })

  it('is false while any one of the three is missing', () => {
    expect(hasTriageRatings(task({ ...rated, value: null }))).toBe(false)
    expect(hasTriageRatings(task({ ...rated, due: null }))).toBe(false)
    expect(hasTriageRatings(task({ ...rated, sessionPoints: null }))).toBe(
      false,
    )
  })
})

describe('isTriageReady', () => {
  it('is ready with every rating and a scheduled start', () => {
    expect(isTriageReady(task({ ...rated, start: at(9) }))).toBe(true)
  })

  it('is not ready with ratings but no disposition — a deadline alone is not a plan', () => {
    expect(isTriageReady(task(rated))).toBe(false)
  })

  it('is not ready with a disposition but no ratings', () => {
    expect(isTriageReady(task({ start: at(9) }))).toBe(false)
  })
})

describe('canBeTriaged', () => {
  it('opens on a fresh task and on an already-ready one (re-triage)', () => {
    expect(canBeTriaged(task())).toBe(true)
    expect(canBeTriaged(task({ ...rated, start: at(9) }))).toBe(true)
  })

  it('refuses a habit or a calendar event whatever it carries', () => {
    expect(canBeTriaged(task({ kind: EndeavorKind.habit }))).toBe(false)
    expect(canBeTriaged(task({ kind: EndeavorKind.calendarEvent }))).toBe(false)
  })

  it('refuses completed work and honours a resolved kind passed in', () => {
    expect(canBeTriaged(task({ completed: at(8) }))).toBe(false)
    expect(canBeTriaged(task({ status: EndeavorStatus.closed }))).toBe(false)
    expect(canBeTriaged(task(), EndeavorKind.calendarEvent)).toBe(false)
  })
})

describe('awaitsTriage', () => {
  it('holds for an untriaged task or reminder capture', () => {
    expect(awaitsTriage(task())).toBe(true)
    expect(awaitsTriage(task({ kind: EndeavorKind.reminder }))).toBe(true)
  })

  it('releases a task that already carries every rating and a start', () => {
    expect(awaitsTriage(task({ ...rated, start: at(9) }))).toBe(false)
  })

  it('never holds for a habit, even an unrated unscheduled one', () => {
    expect(awaitsTriage(task({ kind: EndeavorKind.habit }))).toBe(false)
    expect(awaitsTriage(task({ status: EndeavorStatus.skipped }))).toBe(false)
  })
})
