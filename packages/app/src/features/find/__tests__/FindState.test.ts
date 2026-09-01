/**
 * The initial state and the vista-selection helpers.
 *
 * The point of these cases is that nothing here is restated: the lens defaults
 * are read from the registry, so a registry edit shows up as a failure here
 * rather than as a surface that quietly disagrees with its own vista.
 */
import { EndeavorsVistas } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  initialFindLens,
  initialFindState,
  initialTasksLens,
  lensDefaultsForTasksSelection,
  tasksVistaIdFor,
} from '../FindState'

describe('the initial state mirrors the registry, never a copy of it', () => {
  it('starts Find on the `.find` vista’s own lens defaults', () => {
    expect(initialFindLens.grouping).toBe(EndeavorsVistas.find.lens.grouping)
    expect(initialFindLens.showArchived).toBe(
      EndeavorsVistas.find.lens.showArchived,
    )
  })

  it('starts All Tasks on `.tasksDefault`’s lens defaults', () => {
    expect(initialTasksLens.grouping).toBe(
      EndeavorsVistas.tasksDefault.lens.grouping,
    )
  })

  it('starts both surfaces idle, with nothing installed and no intent queued', () => {
    expect(initialFindState.find.load).toEqual({ kind: 'idle' })
    expect(initialFindState.tasks.endeavors).toEqual([])
    expect(initialFindState.intents).toEqual([])
    expect(initialFindState.nextIntentId).toBe(1)
  })

  it('starts All Tasks on the default selection, with no heading override', () => {
    expect(initialFindState.tasksSelection).toEqual({ kind: 'default' })
    expect(initialFindState.tasksCustomTitle).toBeNull()
  })
})

describe('a tasks selection carries its vista’s own defaults and id', () => {
  it('groups Today by due section, as that vista declares', () => {
    expect(lensDefaultsForTasksSelection({ kind: 'today' }).grouping).toBe(
      'dueSection',
    )
  })

  it('seeds the search vista’s lens with the query it was opened for', () => {
    expect(
      lensDefaultsForTasksSelection({ kind: 'search', query: 'slides' })
        .searchQuery,
    ).toBe('slides')
  })

  it('scopes a list vista’s id to the list, so each list saves its own lens', () => {
    expect(
      tasksVistaIdFor({ kind: 'list', listId: 'l-1', listTitle: null }),
    ).toBe('tasks.list.l-1')
    expect(
      tasksVistaIdFor({ kind: 'list', listId: 'l-2', listTitle: null }),
    ).toBe('tasks.list.l-2')
  })

  it('names the fixed vistas’ own ids for the other selections', () => {
    expect(tasksVistaIdFor({ kind: 'default' })).toBe('tasks.default')
    expect(tasksVistaIdFor({ kind: 'today' })).toBe('tasks.today')
    expect(tasksVistaIdFor({ kind: 'search', query: 'x' })).toBe('tasks.search')
  })

  it('stores the lens as plain arrays, so the store’s serializable check passes', () => {
    expect(Array.isArray(initialFindLens.hiddenKinds)).toBe(true)
    expect(Array.isArray(initialFindLens.hiddenStatuses)).toBe(true)
  })
})
