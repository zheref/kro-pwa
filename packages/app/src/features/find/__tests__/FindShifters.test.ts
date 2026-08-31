/**
 * Shifters are pure: no store, no dispatch, no clock (`RC-56`). Every case
 * states the real situation it is about, and every `State` comes from
 * `FindMocks` rather than being built inline (`RC-31`).
 */
import { EndeavorKind, EndeavorStatus } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  FIND_REFERENCE_NOW,
  allFindEndeavorMocks,
  findEndeavorMocks,
  findStateMocks,
} from '../FindMocks'
import { FindExceptions } from '../FindException'
import {
  surfaceOf,
  withEndeavorReplaced,
  withEndeavorsInstalled,
  withFetchStarted,
  withFilterToggled,
  withFindException,
  withFindViewLoaded,
  withGroupExpanded,
  withGroupsCollapsed,
  withGrouping,
  withIntentConsumed,
  withIntentEnqueued,
  withLensSnapshotRestored,
  withRowsArchived,
  withRowsRemoved,
  withSearchQuery,
  withShowArchivedToggled,
  withSurface,
  withTasksVistaSelected,
} from '../FindShifters'

describe('withFindViewLoaded arms a surface for its first paint', () => {
  it('stamps the clock the surface will classify against', () => {
    const next = withFindViewLoaded(findStateMocks.idle, {
      surface: 'find',
      now: FIND_REFERENCE_NOW,
      enabledFlags: [],
    })
    expect(next.find.clockAnchor).toEqual(FIND_REFERENCE_NOW)
  })

  it('caches the flags the capability gating will read', () => {
    const next = withFindViewLoaded(findStateMocks.idle, {
      surface: 'find',
      now: FIND_REFERENCE_NOW,
      enabledFlags: ['endeavorDetail'],
    })
    expect(next.find.enabledFlags).toEqual(['endeavorDetail'])
  })

  it('re-arms the lens restore on a remount, so saved filters are asked for again', () => {
    const next = withFindViewLoaded(findStateMocks.loaded, {
      surface: 'find',
      now: FIND_REFERENCE_NOW,
      enabledFlags: [],
    })
    expect(next.find.isLensRestored).toBe(false)
  })

  it('touches only the surface it names', () => {
    const next = withFindViewLoaded(findStateMocks.idle, {
      surface: 'tasks',
      now: FIND_REFERENCE_NOW,
      enabledFlags: [],
    })
    expect(next.find.clockAnchor).toBeNull()
    expect(next.tasks.clockAnchor).toEqual(FIND_REFERENCE_NOW)
  })
})

describe('withLensSnapshotRestored settles the saved-filter race', () => {
  const armed = withFindViewLoaded(findStateMocks.idle, {
    surface: 'find',
    now: FIND_REFERENCE_NOW,
    enabledFlags: [],
  })

  it('applies the snapshot when the user has touched nothing', () => {
    const next = withLensSnapshotRestored(armed, {
      surface: 'find',
      lens: { ...armed.find.lens, searchQuery: 'slides' },
    })
    expect(next.find.lens.searchQuery).toBe('slides')
    expect(next.find.isLensRestored).toBe(true)
  })

  it('settles with the vista defaults when nothing was ever saved', () => {
    const next = withLensSnapshotRestored(armed, { surface: 'find', lens: null })
    expect(next.find.lens).toEqual(armed.find.lens)
    expect(next.find.isLensRestored).toBe(true)
  })

  it('loses to a filter the user has already touched — their live choice wins', () => {
    const typed = withSearchQuery(armed, { surface: 'find', query: 'live' })
    const late = withLensSnapshotRestored(typed, {
      surface: 'find',
      lens: { ...armed.find.lens, searchQuery: 'stale' },
    })
    expect(late.find.lens.searchQuery).toBe('live')
  })
})

describe('withEndeavorsInstalled installs one snapshot atomically', () => {
  it('replaces the pool and marks the surface loaded', () => {
    const next = withEndeavorsInstalled(findStateMocks.idle, {
      surface: 'find',
      endeavors: allFindEndeavorMocks,
      now: FIND_REFERENCE_NOW,
    })
    expect(next.find.load).toEqual({ kind: 'loaded' })
    expect(next.find.endeavors).toHaveLength(allFindEndeavorMocks.length)
  })

  it('moves the clock anchor with the install, so the two never disagree', () => {
    const later = new Date(2026, 5, 18, 18, 0, 0)
    const next = withEndeavorsInstalled(findStateMocks.loaded, {
      surface: 'find',
      endeavors: allFindEndeavorMocks,
      now: later,
    })
    expect(next.find.clockAnchor).toEqual(later)
  })

  it('installs an empty day without complaint', () => {
    const next = withEndeavorsInstalled(findStateMocks.loaded, {
      surface: 'find',
      endeavors: [],
      now: FIND_REFERENCE_NOW,
    })
    expect(next.find.endeavors).toEqual([])
    expect(next.find.load).toEqual({ kind: 'loaded' })
  })
})

describe('withFetchStarted / withFindException keep the last good list', () => {
  it('raises the loading lifecycle', () => {
    expect(withFetchStarted(findStateMocks.idle, { surface: 'find' }).find.load)
      .toEqual({ kind: 'loading' })
  })

  it('keeps the installed rows through a failed refresh', () => {
    const next = withFindException(findStateMocks.loaded, {
      surface: 'find',
      exception: FindExceptions.fetchFailed('offline'),
    })
    expect(next.find.endeavors).toHaveLength(allFindEndeavorMocks.length)
    expect(next.find.load.kind).toBe('failed')
  })

  it('reports the failure on the surface that asked, not the other one', () => {
    const next = withFindException(findStateMocks.loaded, {
      surface: 'tasks',
      exception: FindExceptions.fetchFailed('offline'),
    })
    expect(next.find.load.kind).toBe('loaded')
    expect(next.tasks.load.kind).toBe('failed')
  })
})

describe('the lens toggles', () => {
  it('hides a kind the user deselected', () => {
    const next = withFilterToggled(findStateMocks.loaded, {
      surface: 'find',
      toggle: { axis: 'kind', value: EndeavorKind.habit },
    })
    expect(next.find.lens.hiddenKinds).toEqual([EndeavorKind.habit])
  })

  it('shows it again on a second tap', () => {
    const hidden = withFilterToggled(findStateMocks.loaded, {
      surface: 'find',
      toggle: { axis: 'kind', value: EndeavorKind.habit },
    })
    const shown = withFilterToggled(hidden, {
      surface: 'find',
      toggle: { axis: 'kind', value: EndeavorKind.habit },
    })
    expect(shown.find.lens.hiddenKinds).toEqual([])
  })

  it('toggles a host and a status on their own axes', () => {
    const next = withFilterToggled(
      withFilterToggled(findStateMocks.loaded, {
        surface: 'find',
        toggle: { axis: 'host', value: 'local' },
      }),
      { surface: 'find', toggle: { axis: 'status', value: EndeavorStatus.qa } },
    )
    expect(next.find.lens.hiddenHosts).toEqual(['local'])
    expect(next.find.lens.hiddenStatuses).toEqual([EndeavorStatus.qa])
  })

  it('toggles a computed state, the axis Do’s lens uses', () => {
    const next = withFilterToggled(findStateMocks.loaded, {
      surface: 'find',
      toggle: { axis: 'computedState', value: 'overdue' },
    })
    expect(next.find.lens.hiddenComputedStates).toEqual(['overdue'])
  })

  it('toggles a calendar id, which the lens carries but never filters on', () => {
    const next = withFilterToggled(findStateMocks.loaded, {
      surface: 'find',
      toggle: { axis: 'calendar', value: 'cal-1' },
    })
    expect(next.find.lens.hiddenCalendarIds).toEqual(['cal-1'])
    // Canon's `apply` has no calendar term — the choice only persists.
    expect(next.find.endeavors).toHaveLength(
      findStateMocks.loaded.find.endeavors.length,
    )
  })

  it('flips show-archived', () => {
    const next = withShowArchivedToggled(findStateMocks.loaded, {
      surface: 'find',
    })
    expect(next.find.lens.showArchived).toBe(true)
  })

  it('stores the search query verbatim, folding case only at comparison time', () => {
    const next = withSearchQuery(findStateMocks.loaded, {
      surface: 'find',
      query: 'Slides',
    })
    expect(next.find.lens.searchQuery).toBe('Slides')
  })

  it('releases the expanded group when the grouping criterion changes', () => {
    const expanded = withGroupExpanded(findStateMocks.tasksLoaded, {
      surface: 'tasks',
      groupKey: 'pending',
    })
    const regrouped = withGrouping(expanded, {
      surface: 'tasks',
      grouping: 'dueSection',
    })
    expect(regrouped.tasks.expandedGroupKey).toBeNull()
    expect(regrouped.tasks.lens.grouping).toBe('dueSection')
  })
})

describe('the group focus', () => {
  it('opens one group', () => {
    const next = withGroupExpanded(findStateMocks.tasksLoaded, {
      surface: 'tasks',
      groupKey: 'pending',
    })
    expect(next.tasks.expandedGroupKey).toBe('pending')
  })

  it('replaces the focus rather than accumulating one', () => {
    const next = withGroupExpanded(
      withGroupExpanded(findStateMocks.tasksLoaded, {
        surface: 'tasks',
        groupKey: 'pending',
      }),
      { surface: 'tasks', groupKey: 'ongoing' },
    )
    expect(next.tasks.expandedGroupKey).toBe('ongoing')
  })

  it('releases it', () => {
    const next = withGroupsCollapsed(findStateMocks.tasksExpanded, {
      surface: 'tasks',
    })
    expect(next.tasks.expandedGroupKey).toBeNull()
  })
})

describe('withTasksVistaSelected re-points All Tasks', () => {
  it('installs the selection and its own lens defaults', () => {
    const next = withTasksVistaSelected(findStateMocks.tasksLoaded, {
      selection: { kind: 'today' },
    })
    expect(next.tasksSelection).toEqual({ kind: 'today' })
    expect(next.tasks.lens.grouping).toBe('dueSection')
  })

  it('carries a caller-supplied heading override', () => {
    const next = withTasksVistaSelected(findStateMocks.tasksLoaded, {
      selection: { kind: 'list', listId: 'l-1', listTitle: 'Groceries' },
      customTitle: 'Shopping',
    })
    expect(next.tasksCustomTitle).toBe('Shopping')
  })

  it('re-arms the lens restore and drops the previous focus', () => {
    const next = withTasksVistaSelected(findStateMocks.tasksExpanded, {
      selection: { kind: 'search', query: 'slides' },
    })
    expect(next.tasks.isLensRestored).toBe(false)
    expect(next.tasks.expandedGroupKey).toBeNull()
  })
})

describe('the optimistic row mutations', () => {
  it('removes a deleted row before the write resolves', () => {
    const next = withRowsRemoved(findStateMocks.loaded, {
      surface: 'find',
      endeavorIds: [findEndeavorMocks.morningTask.id],
    })
    expect(
      next.find.endeavors.some(
        (row) => row.id === findEndeavorMocks.morningTask.id,
      ),
    ).toBe(false)
  })

  it('closes an archived row IN PLACE, so Show Archived reveals it again', () => {
    const next = withRowsArchived(findStateMocks.loaded, {
      surface: 'find',
      endeavorIds: [findEndeavorMocks.morningTask.id],
    })
    const row = next.find.endeavors.find(
      (candidate) => candidate.id === findEndeavorMocks.morningTask.id,
    )
    expect(row?.status).toBe(EndeavorStatus.closed)
  })

  it('replaces a row the write rewrote', () => {
    const rewritten = {
      ...findEndeavorMocks.morningTask,
      title: 'Prepare the deck',
    }
    const next = withEndeavorReplaced(findStateMocks.loaded, {
      surface: 'find',
      endeavor: rewritten,
    })
    expect(
      next.find.endeavors.find((row) => row.id === rewritten.id)?.title,
    ).toBe('Prepare the deck')
  })

  it('does NOT resurrect a row that already left the pool', () => {
    const removed = withRowsRemoved(findStateMocks.loaded, {
      surface: 'find',
      endeavorIds: [findEndeavorMocks.morningTask.id],
    })
    const next = withEndeavorReplaced(removed, {
      surface: 'find',
      endeavor: findEndeavorMocks.morningTask,
    })
    expect(next.find.endeavors).toHaveLength(allFindEndeavorMocks.length - 1)
  })
})

describe('the intent queue', () => {
  it('parks a request with the surface it came from', () => {
    const next = withIntentEnqueued(findStateMocks.loaded, {
      surface: 'find',
      operation: 'startSession',
      endeavorId: findEndeavorMocks.morningTask.id,
    })
    expect(next.intents).toHaveLength(1)
    expect(next.intents[0]?.surface).toBe('find')
  })

  it('issues a fresh id per request, so two taps are two intents', () => {
    const twice = withIntentEnqueued(
      withIntentEnqueued(findStateMocks.loaded, {
        surface: 'find',
        operation: 'startSession',
        endeavorId: 'a',
      }),
      { surface: 'find', operation: 'startSession', endeavorId: 'b' },
    )
    expect(twice.intents.map((entry) => entry.id)).toEqual([1, 2])
    expect(twice.nextIntentId).toBe(3)
  })

  it('drains by id, never by position', () => {
    const next = withIntentConsumed(findStateMocks.withPendingIntent, {
      intentId: 1,
    })
    expect(next.intents).toEqual([])
  })

  it('ignores an unknown id, so a double acknowledgement is harmless', () => {
    const next = withIntentConsumed(findStateMocks.withPendingIntent, {
      intentId: 99,
    })
    expect(next.intents).toHaveLength(1)
  })
})

describe('withSurface and surfaceOf are the one lift and read', () => {
  it('writes the Find surface back', () => {
    const next = withSurface(findStateMocks.idle, 'find', {
      ...findStateMocks.idle.find,
      expandedGroupKey: 'pending',
    })
    expect(next.find.expandedGroupKey).toBe('pending')
    expect(next.tasks.expandedGroupKey).toBeNull()
  })

  it('writes the Tasks surface back', () => {
    const next = withSurface(findStateMocks.idle, 'tasks', {
      ...findStateMocks.idle.tasks,
      expandedGroupKey: 'ongoing',
    })
    expect(next.tasks.expandedGroupKey).toBe('ongoing')
  })

  it('reads whichever surface is named', () => {
    expect(surfaceOf(findStateMocks.loaded, 'find').endeavors).toHaveLength(
      allFindEndeavorMocks.length,
    )
    expect(surfaceOf(findStateMocks.loaded, 'tasks').endeavors).toEqual([])
  })
})
