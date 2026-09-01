import { describe, expect, it } from 'vitest'
import { shadowMocks } from '../__mocks__/EndeavorRelations.mocks'
import {
  eventEndeavor,
  importedReminderEndeavor,
  makeEndeavor,
  taskEndeavor,
} from '../Endeavor'
import { EndeavorHost } from '../EndeavorHost'
import { EndeavorKind } from '../EndeavorKind'
import { EndeavorStatus } from '../EndeavorStatus'

const START = new Date(2026, 0, 15, 8, 0, 0)
const DUE = new Date(2026, 0, 15, 17, 0, 0)

describe('makeEndeavor', () => {
  it('applies canon’s defaults for everything the draft omits', () => {
    expect(
      makeEndeavor({ id: 'e-1', title: 'Minimal', kind: EndeavorKind.task }),
    ).toEqual({
      id: 'e-1',
      title: 'Minimal',
      kind: 'task',
      status: 'pending',
      sessionPoints: null,
      start: null,
      duration: null,
      minimumDuration: null,
      maximumDuration: null,
      repeatConfig: null,
      due: null,
      defers: [],
      performances: [],
      completed: null,
      value: null,
      effort: null,
      expiry: null,
      associatedColor: null,
      projectId: null,
      createdAt: null,
      updatedAt: null,
      isDraft: false,
      tags: null,
      shadows: null,
      owner: null,
      list: null,
      hostedBy: [],
      errorMessages: [],
      inActivity: false,
    })
  })

  it('defaults `status` to pending, as canon’s init does', () => {
    expect(
      makeEndeavor({ id: 'e-2', title: 'x', kind: EndeavorKind.task }).status,
    ).toBe(EndeavorStatus.pending)
  })

  it('distinguishes an absent tag list (null) from an empty one', () => {
    expect(
      makeEndeavor({ id: 'e-3', title: 'x', kind: EndeavorKind.task }).tags,
    ).toBeNull()
    expect(
      makeEndeavor({ id: 'e-4', title: 'x', kind: EndeavorKind.task, tags: [] })
        .tags,
    ).toEqual([])
  })

  it('leaves `createdAt` null rather than stamping a clock this tier does not have', () => {
    expect(
      makeEndeavor({ id: 'e-5', title: 'x', kind: EndeavorKind.task })
        .createdAt,
    ).toBeNull()
  })
})

describe('eventEndeavor', () => {
  it('builds a calendarEvent driven by start and duration', () => {
    const event = eventEndeavor({
      id: 'e-event',
      title: 'Cook Breakfast',
      start: START,
      duration: 1800,
      host: EndeavorHost.googleCalendar,
    })
    expect(event.kind).toBe(EndeavorKind.calendarEvent)
    expect(event.start).toEqual(START)
    expect(event.duration).toBe(1800)
  })

  it('never sets `due` — the matrix says a calendar event has none', () => {
    expect(
      eventEndeavor({
        id: 'e-event',
        title: 'x',
        start: START,
        host: EndeavorHost.appleCalendar,
      }).due,
    ).toBeNull()
  })

  it('hosts it by exactly the supplied host', () => {
    expect(
      eventEndeavor({
        id: 'e-event',
        title: 'x',
        start: START,
        host: EndeavorHost.googleCalendar,
      }).hostedBy,
    ).toEqual([EndeavorHost.googleCalendar])
  })

  it('carries a shadow when one is supplied, and leaves shadows null otherwise', () => {
    expect(
      eventEndeavor({
        id: 'e-event',
        title: 'x',
        start: START,
        host: EndeavorHost.googleCalendar,
        shadow: shadowMocks.googleEvent,
      }).shadows,
    ).toEqual([shadowMocks.googleEvent])
    expect(
      eventEndeavor({
        id: 'e-event',
        title: 'x',
        start: START,
        host: EndeavorHost.googleCalendar,
      }).shadows,
    ).toBeNull()
  })

  it('allows an all-day event with no duration', () => {
    expect(
      eventEndeavor({
        id: 'e-allday',
        title: 'Holiday',
        start: START,
        host: EndeavorHost.appleCalendar,
      }).duration,
    ).toBeNull()
  })
})

describe('taskEndeavor', () => {
  it('builds a pending task by default', () => {
    expect(
      taskEndeavor({
        id: 't-1',
        title: 'Pay Mortgage',
        host: EndeavorHost.local,
      }).status,
    ).toBe(EndeavorStatus.pending)
  })

  it('builds a CLOSED task when `complete` is true', () => {
    expect(
      taskEndeavor({
        id: 't-2',
        title: 'Buy mouse',
        complete: true,
        host: EndeavorHost.local,
      }).status,
    ).toBe(EndeavorStatus.closed)
  })

  it('carries due, duration and session points through', () => {
    const task = taskEndeavor({
      id: 't-3',
      title: 'Grocery Shopping',
      due: DUE,
      duration: 7200,
      sessionPoints: 30,
      host: EndeavorHost.local,
    })
    expect(task.due).toEqual(DUE)
    expect(task.duration).toBe(7200)
    expect(task.sessionPoints).toBe(30)
  })

  it('is always kind `task`, whatever else is supplied', () => {
    expect(
      taskEndeavor({ id: 't-4', title: 'x', host: EndeavorHost.supabase }).kind,
    ).toBe(EndeavorKind.task)
  })
})

describe('importedReminderEndeavor', () => {
  it('takes the source-resolved kind rather than assuming `reminder`', () => {
    expect(
      importedReminderEndeavor({
        id: 'i-1',
        title: 'Morning Stretch',
        kind: EndeavorKind.habit,
        host: EndeavorHost.appleReminders,
        shadow: shadowMocks.appleHabit,
      }).kind,
    ).toBe(EndeavorKind.habit)
  })

  it('never carries a duration — canon gives an imported reminder none', () => {
    expect(
      importedReminderEndeavor({
        id: 'i-2',
        title: 'x',
        kind: EndeavorKind.task,
        host: EndeavorHost.appleReminders,
        shadow: shadowMocks.appleTask,
      }).duration,
    ).toBeNull()
  })

  it('always carries its shadow — the origin is the point of the record', () => {
    expect(
      importedReminderEndeavor({
        id: 'i-3',
        title: 'x',
        kind: EndeavorKind.reminder,
        host: EndeavorHost.appleReminders,
        shadow: shadowMocks.legacyWithoutPriority,
      }).shadows,
    ).toEqual([shadowMocks.legacyWithoutPriority])
  })

  it('closes the endeavor when the source reports it complete', () => {
    expect(
      importedReminderEndeavor({
        id: 'i-4',
        title: 'x',
        kind: EndeavorKind.task,
        complete: true,
        host: EndeavorHost.appleReminders,
        shadow: shadowMocks.appleTask,
      }).status,
    ).toBe(EndeavorStatus.closed)
  })
})
