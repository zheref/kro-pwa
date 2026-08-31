import { describe, expect, it } from 'vitest'
import { makeEndeavor } from '../../endeavor/Endeavor'
import { EndeavorHost } from '../../endeavor/EndeavorHost'
import { EndeavorKind } from '../../endeavor/EndeavorKind'
import {
  isEligibleForPriorityMatrix,
  partitionByKindResolvingShadows,
} from '../KindPartition'
import {
  appleRow,
  localMirrorRow,
  recurrenceMocks,
  reconciliationMocks,
} from '../__mocks__/Reconciliation.mocks'

const idsOf = (endeavors: readonly { readonly id: string }[]) =>
  endeavors.map((endeavor) => endeavor.id)

describe('splitting into the four channels', () => {
  it('routes each resolved kind to its own channel', () => {
    const partition = partitionByKindResolvingShadows([
      appleRow({ id: 'a-task', priority: 3 }),
      appleRow({ id: 'a-reminder', priority: 0 }),
      appleRow({
        id: 'a-habit',
        recurrence: recurrenceMocks.daily,
        priority: 0,
      }),
      reconciliationMocks.googleTouristEvent,
    ])
    expect(idsOf(partition.tasks)).toEqual(['a-task'])
    expect(idsOf(partition.reminders)).toEqual(['a-reminder'])
    expect(idsOf(partition.habits)).toEqual(['a-habit'])
    expect(idsOf(partition.events)).toEqual(['google-tourist'])
  })

  it('keys on the resolved kind, not the stored one', () => {
    // Stored as a task, daily Apple recurrence: it belongs to habits.
    const partition = partitionByKindResolvingShadows([
      appleRow({
        id: 'stored-task',
        kind: EndeavorKind.task,
        recurrence: recurrenceMocks.daily,
        priority: 0,
      }),
    ])
    expect(idsOf(partition.habits)).toEqual(['stored-task'])
    expect(partition.tasks).toEqual([])
  })

  it('drops kinds no channel asked for', () => {
    const partition = partitionByKindResolvingShadows([
      makeEndeavor({
        id: 'bp',
        title: 'Blueprint',
        kind: EndeavorKind.blueprint,
        hostedBy: [EndeavorHost.local],
      }),
      makeEndeavor({
        id: 'bg',
        title: 'Background',
        kind: EndeavorKind.background,
        hostedBy: [EndeavorHost.local],
      }),
      makeEndeavor({
        id: 'bh',
        title: 'Behavior',
        kind: EndeavorKind.behavior,
        hostedBy: [EndeavorHost.local],
      }),
    ])
    expect(partition.tasks).toEqual([])
    expect(partition.reminders).toEqual([])
    expect(partition.events).toEqual([])
    expect(partition.habits).toEqual([])
  })

  it('returns four empty channels for an empty input', () => {
    const partition = partitionByKindResolvingShadows([])
    expect(partition).toEqual({
      tasks: [],
      reminders: [],
      events: [],
      habits: [],
    })
  })
})

describe('a habit claims its own identity from the task channel', () => {
  it('drops a task mirror an unmerged habit already claims', () => {
    // The case identity merging misses: linked by shadow only, so both rows
    // survive reconciliation and one habit would be presented twice.
    const habit = localMirrorRow({
      id: 'kro-habit',
      sourceIdentifier: 'apple-vitamins',
      kind: EndeavorKind.habit,
      recurrence: recurrenceMocks.daily,
    })
    const taskMirror = makeEndeavor({
      id: 'apple-vitamins',
      title: 'Take vitamins',
      kind: EndeavorKind.task,
      hostedBy: [EndeavorHost.local],
    })
    const partition = partitionByKindResolvingShadows([habit, taskMirror])
    expect(idsOf(partition.habits)).toEqual(['kro-habit'])
    expect(partition.tasks).toEqual([])
  })

  it('drops a reminder the habit claims, in the same way', () => {
    const habit = localMirrorRow({
      id: 'kro-habit',
      sourceIdentifier: 'apple-vitamins',
      kind: EndeavorKind.habit,
      recurrence: recurrenceMocks.daily,
    })
    const reminderMirror = makeEndeavor({
      id: 'apple-vitamins',
      title: 'Take vitamins',
      kind: EndeavorKind.reminder,
      hostedBy: [EndeavorHost.local],
    })
    const partition = partitionByKindResolvingShadows([habit, reminderMirror])
    expect(partition.reminders).toEqual([])
  })

  it('covers the link in the other direction too', () => {
    // The habit carries the id; the task carries the shadow pointing at it.
    const habit = makeEndeavor({
      id: 'habit-id',
      title: 'Take vitamins',
      kind: EndeavorKind.habit,
      hostedBy: [EndeavorHost.local],
    })
    const taskShadowing = localMirrorRow({
      id: 'task-row',
      sourceIdentifier: 'habit-id',
      kind: EndeavorKind.task,
      priority: 5,
    })
    const partition = partitionByKindResolvingShadows([habit, taskShadowing])
    expect(partition.tasks).toEqual([])
  })

  it('leaves an unrelated task in its channel', () => {
    const habit = localMirrorRow({
      id: 'kro-habit',
      sourceIdentifier: 'apple-vitamins',
      kind: EndeavorKind.habit,
      recurrence: recurrenceMocks.daily,
    })
    const unrelated = makeEndeavor({
      id: 'unrelated',
      title: 'Something else',
      kind: EndeavorKind.task,
      hostedBy: [EndeavorHost.local],
    })
    const partition = partitionByKindResolvingShadows([habit, unrelated])
    expect(idsOf(partition.tasks)).toEqual(['unrelated'])
  })

  it('never lets an empty identifier claim anything', () => {
    const habit = makeEndeavor({
      ...reconciliationMocks.emptyIdentifierShadowRow,
      id: 'habit-empty',
      kind: EndeavorKind.habit,
    })
    const task = makeEndeavor({
      ...reconciliationMocks.emptyIdentifierShadowRow,
      id: 'task-empty',
      kind: EndeavorKind.task,
    })
    const partition = partitionByKindResolvingShadows([habit, task])
    expect(idsOf(partition.tasks)).toEqual(['task-empty'])
  })

  it('never drops an event, whatever a habit claims', () => {
    // Events are not contested: canon filters them without the habit check.
    const habit = makeEndeavor({
      id: 'shared-id',
      title: 'Overlap',
      kind: EndeavorKind.habit,
      hostedBy: [EndeavorHost.local],
    })
    const event = makeEndeavor({
      id: 'shared-id',
      title: 'Overlap',
      kind: EndeavorKind.calendarEvent,
      hostedBy: [EndeavorHost.googleCalendar],
    })
    const partition = partitionByKindResolvingShadows([habit, event])
    expect(idsOf(partition.events)).toEqual(['shared-id'])
  })
})

describe('priority-matrix admission', () => {
  it('admits a resolved task', () => {
    expect(isEligibleForPriorityMatrix(appleRow({ priority: 3 }))).toBe(true)
  })

  it('refuses a resolved habit, however it is hosted', () => {
    // "a resolved habit remains absent from the matrix … regardless of whether
    // it is hosted locally, in the cloud, by Apple, or by several hosts"
    const hostings: readonly (readonly EndeavorHost[])[] = [
      [EndeavorHost.appleReminders],
      [EndeavorHost.local],
      [EndeavorHost.supabase],
      [EndeavorHost.local, EndeavorHost.appleReminders],
    ]
    for (const hostedBy of hostings) {
      const row = makeEndeavor({
        ...localMirrorRow({ recurrence: recurrenceMocks.daily }),
        hostedBy,
      })
      expect(isEligibleForPriorityMatrix(row)).toBe(false)
    }
  })

  it('refuses a resolved reminder', () => {
    expect(isEligibleForPriorityMatrix(appleRow({ priority: 0 }))).toBe(false)
  })

  it('refuses a calendar event', () => {
    expect(
      isEligibleForPriorityMatrix(reconciliationMocks.googleTouristEvent),
    ).toBe(false)
  })

  it('admits a plain Kro task', () => {
    expect(
      isEligibleForPriorityMatrix(reconciliationMocks.kroCitizenTask),
    ).toBe(true)
  })
})
