/**
 * Reducer arms.
 *
 * Synchronous arms are called directly against the slice's reducer — no store,
 * no middleware (`RC-12`). Thunk lifecycle arms are driven through the **real**
 * thunk against a stubbed `LocalStore` injected via `ThunkExtra` (`RC-54`), so
 * the optimistic `.pending` write and the authoritative `.fulfilled` install are
 * both exercised the way they actually run.
 */
import type { EndeavorRecord } from '@kro/core'
import {
  EndeavorKind,
  EndeavorOperation,
  EndeavorStatus,
  endeavorRecordFromEndeavor,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import { makeStore, stubbedThunkExtra } from '../../../library/store'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import {
  childIntentDelegatedConsumed,
  findSlice,
  initialFindState,
  onViewLoaded,
  userDidChangeSearchQuery,
  userDidSelectGrouping,
  userDidSelectTasksVista,
  userDidTapCollapseGroups,
  userDidTapExpandGroup,
  userDidToggleFilter,
  userDidToggleShowArchived,
} from '../FindFeature'
import {
  FIND_REFERENCE_NOW,
  allFindEndeavorMocks,
  findEndeavorMocks,
  findStateMocks,
} from '../FindMocks'
import {
  fetchFindEndeavorsThunk,
  performBulkOperationThunk,
  performEndeavorOperationThunk,
  restoreFindLensThunk,
} from '../FindProducer'

const reducer = findSlice.reducer

const recordsOf = (): readonly EndeavorRecord[] =>
  allFindEndeavorMocks.map((endeavor) =>
    endeavorRecordFromEndeavor(endeavor, { now: FIND_REFERENCE_NOW }),
  )

const storeWith = (records: readonly EndeavorRecord[] = recordsOf()) => {
  const localStore = makeInMemoryLocalStore({ endeavors: records })
  return makeStore({ ...stubbedThunkExtra, localStore })
}

describe('onViewLoaded — a surface mounts', () => {
  it('stamps the clock and the flags for the surface that mounted', () => {
    const next = reducer(
      initialFindState,
      onViewLoaded({
        surface: 'find',
        now: FIND_REFERENCE_NOW,
        enabledFlags: ['endeavorDetail'],
      }),
    )
    expect(next.find.clockAnchor).toEqual(FIND_REFERENCE_NOW)
    expect(next.find.enabledFlags).toEqual(['endeavorDetail'])
  })

  it('leaves the other surface untouched', () => {
    const next = reducer(
      initialFindState,
      onViewLoaded({
        surface: 'tasks',
        now: FIND_REFERENCE_NOW,
        enabledFlags: [],
      }),
    )
    expect(next.find.clockAnchor).toBeNull()
  })

  it('re-arms the lens restore on a remount', () => {
    const next = reducer(
      findStateMocks.loaded,
      onViewLoaded({
        surface: 'find',
        now: FIND_REFERENCE_NOW,
        enabledFlags: [],
      }),
    )
    expect(next.find.isLensRestored).toBe(false)
  })
})

describe('the filter and grouping intents', () => {
  it('types a search query into the surface that asked', () => {
    const next = reducer(
      findStateMocks.loaded,
      userDidChangeSearchQuery({ surface: 'find', query: 'slides' }),
    )
    expect(next.find.lens.searchQuery).toBe('slides')
    expect(next.tasks.lens.searchQuery).toBe('')
  })

  it('flips a kind chip, then flips it back', () => {
    const hidden = reducer(
      findStateMocks.loaded,
      userDidToggleFilter({
        surface: 'find',
        toggle: { axis: 'kind', value: EndeavorKind.habit },
      }),
    )
    expect(hidden.find.lens.hiddenKinds).toEqual([EndeavorKind.habit])
    const shown = reducer(
      hidden,
      userDidToggleFilter({
        surface: 'find',
        toggle: { axis: 'kind', value: EndeavorKind.habit },
      }),
    )
    expect(shown.find.lens.hiddenKinds).toEqual([])
  })

  it('flips show-archived', () => {
    const next = reducer(
      findStateMocks.loaded,
      userDidToggleShowArchived({ surface: 'find' }),
    )
    expect(next.find.lens.showArchived).toBe(true)
  })

  it('re-points All Tasks at another vista and resets its lens defaults', () => {
    const next = reducer(
      findStateMocks.tasksLoaded,
      userDidSelectTasksVista({ selection: { kind: 'today' } }),
    )
    expect(next.tasksSelection).toEqual({ kind: 'today' })
    expect(next.tasks.lens.grouping).toBe('dueSection')
  })

  it('changes the grouping and releases the focused group with it', () => {
    const next = reducer(
      findStateMocks.tasksExpanded,
      userDidSelectGrouping({ surface: 'tasks', grouping: 'kind' }),
    )
    expect(next.tasks.lens.grouping).toBe('kind')
    expect(next.tasks.expandedGroupKey).toBeNull()
  })
})

describe('the group focus intents', () => {
  it('expands one group', () => {
    const next = reducer(
      findStateMocks.tasksLoaded,
      userDidTapExpandGroup({ surface: 'tasks', groupKey: 'pending' }),
    )
    expect(next.tasks.expandedGroupKey).toBe('pending')
  })

  it('replaces the focus on a second expand', () => {
    const first = reducer(
      findStateMocks.tasksLoaded,
      userDidTapExpandGroup({ surface: 'tasks', groupKey: 'pending' }),
    )
    const second = reducer(
      first,
      userDidTapExpandGroup({ surface: 'tasks', groupKey: 'ongoing' }),
    )
    expect(second.tasks.expandedGroupKey).toBe('ongoing')
  })

  it('collapses back to clipped', () => {
    const next = reducer(
      findStateMocks.tasksExpanded,
      userDidTapCollapseGroups({ surface: 'tasks' }),
    )
    expect(next.tasks.expandedGroupKey).toBeNull()
  })
})

describe('childIntentDelegatedConsumed — the owner handled a request', () => {
  it('drains the intent it names', () => {
    const next = reducer(
      findStateMocks.withPendingIntent,
      childIntentDelegatedConsumed({ intentId: 1 }),
    )
    expect(next.intents).toEqual([])
  })

  it('ignores an id that is not queued', () => {
    const next = reducer(
      findStateMocks.withPendingIntent,
      childIntentDelegatedConsumed({ intentId: 42 }),
    )
    expect(next.intents).toHaveLength(1)
  })

  it('is a no-op on an empty queue', () => {
    const next = reducer(
      findStateMocks.loaded,
      childIntentDelegatedConsumed({ intentId: 1 }),
    )
    expect(next.intents).toEqual([])
  })
})

describe('the fetch lifecycle', () => {
  it('installs the day on success — user opens Find for the first time', async () => {
    const store = storeWith()
    await store.dispatch(
      fetchFindEndeavorsThunk({ surface: 'find', now: FIND_REFERENCE_NOW }),
    )
    const { find } = store.getState().find
    expect(find.load).toEqual({ kind: 'loaded' })
    expect(find.endeavors).toHaveLength(allFindEndeavorMocks.length)
  })

  it('surfaces a typed exception when the store cannot be read', async () => {
    const base = makeInMemoryLocalStore()
    const store = makeStore({
      ...stubbedThunkExtra,
      localStore: {
        ...base,
        endeavors: {
          ...base.endeavors,
          all: async () => {
            throw new Error('disk gone')
          },
        },
      },
    })
    await store.dispatch(
      fetchFindEndeavorsThunk({ surface: 'find', now: FIND_REFERENCE_NOW }),
    )
    const { load } = store.getState().find.find
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') expect(load.exception.kind).toBe('fetchFailed')
  })

  it('raises the loading lifecycle while the read is in flight', () => {
    const pending = fetchFindEndeavorsThunk.pending('req', {
      surface: 'find',
      now: FIND_REFERENCE_NOW,
    })
    expect(reducer(findStateMocks.idle, pending).find.load).toEqual({
      kind: 'loading',
    })
  })

  it('stays quiet when a superseded read is aborted — the one silent exit', () => {
    const rejected = {
      ...fetchFindEndeavorsThunk.rejected(new Error('aborted'), 'req', {
        surface: 'find',
        now: FIND_REFERENCE_NOW,
      }),
      meta: {
        arg: { surface: 'find' as const, now: FIND_REFERENCE_NOW },
        requestId: 'req',
        requestStatus: 'rejected' as const,
        aborted: true,
        condition: false,
        rejectedWithValue: false,
      },
    }
    expect(reducer(findStateMocks.loaded, rejected).find.load).toEqual({
      kind: 'loaded',
    })
  })
})

describe('the lens restore lifecycle', () => {
  it('settles with the vista defaults when nothing was saved', async () => {
    const store = storeWith()
    await store.dispatch(
      restoreFindLensThunk({ surface: 'find', vistaId: 'find' }),
    )
    expect(store.getState().find.find.isLensRestored).toBe(true)
  })

  it('settles even when the read throws, so the surface never waits forever', async () => {
    const base = makeInMemoryLocalStore()
    const store = makeStore({
      ...stubbedThunkExtra,
      localStore: {
        ...base,
        lensSnapshots: {
          ...base.lensSnapshots,
          read: async () => {
            throw new Error('corrupt')
          },
        },
      },
    })
    await store.dispatch(
      restoreFindLensThunk({ surface: 'find', vistaId: 'find' }),
    )
    expect(store.getState().find.find.isLensRestored).toBe(true)
  })

  it('applies a saved lens onto the surface it belongs to', async () => {
    const localStore = makeInMemoryLocalStore({ endeavors: recordsOf() })
    await localStore.lensSnapshots.write('find', {
      hiddenKinds: new Set([EndeavorKind.habit]),
      hiddenHosts: new Set(),
      hiddenStatuses: new Set(),
      hiddenComputedStates: new Set(),
      hiddenCalendarIds: new Set(),
      searchQuery: 'slides',
      showArchived: true,
      grouping: 'status',
    })
    const store = makeStore({
      ...stubbedThunkExtra,
      localStore,
    })
    await store.dispatch(
      restoreFindLensThunk({ surface: 'find', vistaId: 'find' }),
    )
    const { lens } = store.getState().find.find
    expect(lens.searchQuery).toBe('slides')
    expect(lens.showArchived).toBe(true)
  })
})

describe('the operation lifecycle is optimistic, then authoritative', () => {
  it('removes a deleted row on .pending, before the write resolves', () => {
    const pending = performEndeavorOperationThunk.pending('req', {
      surface: 'find',
      operation: EndeavorOperation.delete,
      endeavorId: findEndeavorMocks.morningTask.id,
      now: FIND_REFERENCE_NOW,
    })
    const next = reducer(findStateMocks.loaded, pending)
    expect(
      next.find.endeavors.some(
        (row) => row.id === findEndeavorMocks.morningTask.id,
      ),
    ).toBe(false)
  })

  it('applies the same effect the Producer will persist, on .pending', () => {
    const pending = performEndeavorOperationThunk.pending('req', {
      surface: 'find',
      operation: EndeavorOperation.archive,
      endeavorId: findEndeavorMocks.morningTask.id,
      now: FIND_REFERENCE_NOW,
    })
    const next = reducer(findStateMocks.loaded, pending)
    const row = next.find.endeavors.find(
      (candidate) => candidate.id === findEndeavorMocks.morningTask.id,
    )
    expect(row?.status).toBe(EndeavorStatus.closed)
  })

  it('parks an intent for an operation another feature owns', async () => {
    const store = storeWith()
    await store.dispatch(
      fetchFindEndeavorsThunk({ surface: 'find', now: FIND_REFERENCE_NOW }),
    )
    await store.dispatch(
      performEndeavorOperationThunk({
        surface: 'find',
        operation: EndeavorOperation.startSession,
        endeavorId: findEndeavorMocks.morningTask.id,
        now: FIND_REFERENCE_NOW,
      }),
    )
    const { intents } = store.getState().find
    expect(intents).toHaveLength(1)
    expect(intents[0]?.operation).toBe(EndeavorOperation.startSession)
  })

  it('surfaces a stale tap as a typed exception', async () => {
    const store = storeWith([])
    await store.dispatch(
      performEndeavorOperationThunk({
        surface: 'find',
        operation: EndeavorOperation.markComplete,
        endeavorId: 'ghost',
        now: FIND_REFERENCE_NOW,
      }),
    )
    const { load } = store.getState().find.find
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed')
      expect(load.exception.kind).toBe('endeavorNotFound')
  })

  it('installs the authoritative row on success', async () => {
    const store = storeWith()
    await store.dispatch(
      fetchFindEndeavorsThunk({ surface: 'find', now: FIND_REFERENCE_NOW }),
    )
    await store.dispatch(
      performEndeavorOperationThunk({
        surface: 'find',
        operation: EndeavorOperation.markComplete,
        endeavorId: findEndeavorMocks.morningTask.id,
        now: FIND_REFERENCE_NOW,
      }),
    )
    const row = store
      .getState()
      .find.find.endeavors.find(
        (candidate) => candidate.id === findEndeavorMocks.morningTask.id,
      )
    expect(row?.status).toBe(EndeavorStatus.closed)
  })
})

describe('the bulk lifecycle applies to the whole visible set at once', () => {
  it('removes every named row on .pending — canon has no confirm step', () => {
    const pending = performBulkOperationThunk.pending('req', {
      surface: 'find',
      operation: 'delete',
      endeavorIds: [
        findEndeavorMocks.morningTask.id,
        findEndeavorMocks.afternoonTask.id,
      ],
      now: FIND_REFERENCE_NOW,
    })
    expect(reducer(findStateMocks.loaded, pending).find.endeavors).toHaveLength(
      allFindEndeavorMocks.length - 2,
    )
  })

  it('closes every named row on an archive-all, in place', () => {
    const pending = performBulkOperationThunk.pending('req', {
      surface: 'find',
      operation: 'archive',
      endeavorIds: [findEndeavorMocks.morningTask.id],
      now: FIND_REFERENCE_NOW,
    })
    const next = reducer(findStateMocks.loaded, pending)
    expect(next.find.endeavors).toHaveLength(allFindEndeavorMocks.length)
    expect(
      next.find.endeavors.find(
        (row) => row.id === findEndeavorMocks.morningTask.id,
      )?.status,
    ).toBe(EndeavorStatus.closed)
  })

  it('records a genuinely thrown bulk write on the defensive .rejected arm', () => {
    const arg = {
      surface: 'find' as const,
      operation: 'archive' as const,
      endeavorIds: [findEndeavorMocks.morningTask.id],
      now: FIND_REFERENCE_NOW,
    }
    const rejected = {
      ...performBulkOperationThunk.rejected(new Error('boom'), 'req', arg),
      meta: {
        arg,
        requestId: 'req',
        requestStatus: 'rejected' as const,
        aborted: false,
        condition: false,
        rejectedWithValue: false,
      },
    }
    const { load } = reducer(findStateMocks.loaded, rejected).find
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') expect(load.exception.kind).toBe('unknown')
  })

  it('records a genuinely thrown row write on the defensive .rejected arm', () => {
    const arg = {
      surface: 'find' as const,
      operation: EndeavorOperation.markComplete,
      endeavorId: findEndeavorMocks.morningTask.id,
      now: FIND_REFERENCE_NOW,
    }
    const rejected = {
      ...performEndeavorOperationThunk.rejected(new Error('boom'), 'req', arg),
      meta: {
        arg,
        requestId: 'req',
        requestStatus: 'rejected' as const,
        aborted: false,
        condition: false,
        rejectedWithValue: false,
      },
    }
    const { load } = reducer(findStateMocks.loaded, rejected).find
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') expect(load.exception.kind).toBe('unknown')
  })

  it('reports a partial batch as a failure', async () => {
    const base = makeInMemoryLocalStore({ endeavors: recordsOf() })
    const store = makeStore({
      ...stubbedThunkExtra,
      localStore: {
        ...base,
        endeavors: {
          ...base.endeavors,
          put: async () => {
            throw new Error('disk gone')
          },
        },
      },
    })
    await store.dispatch(
      performBulkOperationThunk({
        surface: 'find',
        operation: 'archive',
        endeavorIds: [findEndeavorMocks.morningTask.id],
        now: FIND_REFERENCE_NOW,
      }),
    )
    const { load } = store.getState().find.find
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') {
      expect(load.exception.kind).toBe('bulkOperationFailed')
    }
  })
})
