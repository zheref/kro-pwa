import { type EndeavorStore, EndeavorStatus, type LocalStore } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  type AppStore,
  makeStore,
  stubbedThunkExtra,
} from '../../../../library/store'
import { makeInMemoryLocalStore } from '../../../../services/localStore/InMemoryLocalStore'
import { DO_MOCK_NOW, doFixtureRecords, doMockAt } from '../../DoMocks'
import {
  deferEndeavorThunk,
  delegateEndeavorThunk,
  deleteEndeavorThunk,
  reopenEndeavorThunk,
  skipEndeavorThunk,
} from '../DoOverflowProducer'

/**
 * Every suite here goes through `makeStore(extra)` with a seeded in-memory
 * store (`RC-22`, `RC-35`) — never a second `configureStore`, never a mocked
 * `fetch`, never the live database.
 */
const seededStore = (): { store: AppStore; localStore: LocalStore } => {
  const localStore = makeInMemoryLocalStore({ endeavors: doFixtureRecords() })
  return { store: makeStore({ ...stubbedThunkExtra, localStore }), localStore }
}

/** A store whose one write always fails, for the failure arm. */
const brokenWriteStore = (): AppStore => {
  const localStore = makeInMemoryLocalStore({ endeavors: doFixtureRecords() })
  const endeavors: EndeavorStore = {
    ...localStore.endeavors,
    put: async () => {
      throw new Error('disk is full')
    },
    softDelete: async () => {
      throw new Error('disk is full')
    },
  }
  return makeStore({
    ...stubbedThunkExtra,
    localStore: { ...localStore, endeavors },
  })
}

describe('Defer — the schedule moves and the audit row is written', () => {
  it('moves the due date to the instant the popover confirmed', async () => {
    const { store, localStore } = seededStore()
    const target = doMockAt(18, 9)

    await store.dispatch(
      deferEndeavorThunk({
        endeavorId: 'overdue-morning',
        target,
        now: DO_MOCK_NOW,
      }),
    )

    const record = await localStore.endeavors.get('overdue-morning')
    expect(record?.due?.getTime()).toBe(target.getTime())
  })

  it('records one audit entry beside the new due date', async () => {
    const { store, localStore } = seededStore()

    await store.dispatch(
      deferEndeavorThunk({
        endeavorId: 'overdue-morning',
        target: doMockAt(18, 9),
        now: DO_MOCK_NOW,
      }),
    )

    const defers = await localStore.defers.forEndeavor('overdue-morning')
    expect(defers).toHaveLength(1)
    expect(defers[0]?.made.getTime()).toBe(DO_MOCK_NOW.getTime())
  })

  it('writes no audit entry for a kind the domain refuses to defer', async () => {
    const { store, localStore } = seededStore()

    // A calendar event's `defers` relation is not editable, so `withDeferred`
    // returns the row untouched — and history must not claim otherwise.
    await store.dispatch(
      deferEndeavorThunk({
        endeavorId: 'event-today',
        target: doMockAt(18, 9),
        now: DO_MOCK_NOW,
      }),
    )

    expect(await localStore.defers.forEndeavor('event-today')).toHaveLength(0)
  })

  it('reports a stale card key rather than writing anything', async () => {
    const { store } = seededStore()

    const result = await store
      .dispatch(
        deferEndeavorThunk({
          endeavorId: 'no-such-endeavor',
          target: doMockAt(18, 9),
          now: DO_MOCK_NOW,
        }),
      )
      .unwrap()

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('endeavorNotFound')
  })
})

describe('Skip — closed as skipped, which is not completed', () => {
  it('moves the row to skipped', async () => {
    const { store, localStore } = seededStore()

    await store.dispatch(
      skipEndeavorThunk({ endeavorId: 'due-late-today', now: DO_MOCK_NOW }),
    )

    const record = await localStore.endeavors.get('due-late-today')
    expect(record?.status).toBe(EndeavorStatus.skipped)
  })

  it('leaves the skipped row out of Completed Today after the refetch', async () => {
    const { store } = seededStore()

    await store.dispatch(
      skipEndeavorThunk({ endeavorId: 'due-late-today', now: DO_MOCK_NOW }),
    )

    const completed = store
      .getState()
      .do.lanes.completedToday.map((endeavor) => endeavor.id)
    expect(completed).not.toContain('due-late-today')
  })

  it('degrades to a typed exception when the write fails', async () => {
    const store = brokenWriteStore()

    const result = await store
      .dispatch(
        skipEndeavorThunk({ endeavorId: 'due-late-today', now: DO_MOCK_NOW }),
      )
      .unwrap()

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toContain('disk is full')
  })
})

describe('Delegate', () => {
  it('moves the row to delegated', async () => {
    const { store, localStore } = seededStore()

    await store.dispatch(
      delegateEndeavorThunk({ endeavorId: 'anytime-task', now: DO_MOCK_NOW }),
    )

    const record = await localStore.endeavors.get('anytime-task')
    expect(record?.status).toBe(EndeavorStatus.delegated)
  })

  it('takes the delegated row out of the Anytime lane', async () => {
    const { store } = seededStore()

    await store.dispatch(
      delegateEndeavorThunk({ endeavorId: 'anytime-task', now: DO_MOCK_NOW }),
    )

    expect(
      store.getState().do.lanes.anytime.map((endeavor) => endeavor.id),
    ).not.toContain('anytime-task')
  })

  it('reports a stale card key', async () => {
    const { store } = seededStore()

    const result = await store
      .dispatch(
        delegateEndeavorThunk({ endeavorId: 'ghost', now: DO_MOCK_NOW }),
      )
      .unwrap()
    expect(result.ok).toBe(false)
  })
})

describe('Delete — the soft delete the sync watermark needs', () => {
  it('tombstones rather than hard-deleting, so the removal can still sync', async () => {
    const { store, localStore } = seededStore()

    await store.dispatch(
      deleteEndeavorThunk({ endeavorId: 'anytime-task', now: DO_MOCK_NOW }),
    )

    const record = await localStore.endeavors.get('anytime-task')
    expect(record?.deletedAtEpochMillis).not.toBeNull()
  })

  it('takes the row out of the day after the refetch', async () => {
    const { store } = seededStore()

    await store.dispatch(
      deleteEndeavorThunk({ endeavorId: 'anytime-task', now: DO_MOCK_NOW }),
    )

    expect(
      store.getState().do.tasks.map((endeavor) => endeavor.id),
    ).not.toContain('anytime-task')
  })

  it('degrades to a typed exception when the store refuses', async () => {
    const store = brokenWriteStore()

    const result = await store
      .dispatch(
        deleteEndeavorThunk({ endeavorId: 'anytime-task', now: DO_MOCK_NOW }),
      )
      .unwrap()
    expect(result.ok).toBe(false)
  })
})

describe('Undo a completion — the exact inverse of marking complete', () => {
  it('returns the row to pending and clears the completion stamp', async () => {
    const { store, localStore } = seededStore()

    await store.dispatch(
      reopenEndeavorThunk({ endeavorId: 'completed-today', now: DO_MOCK_NOW }),
    )

    const record = await localStore.endeavors.get('completed-today')
    expect(record?.status).toBe(EndeavorStatus.pending)
    expect(record?.completed).toBeNull()
  })

  it('takes the row back out of Completed Today', async () => {
    const { store } = seededStore()

    await store.dispatch(
      reopenEndeavorThunk({ endeavorId: 'completed-today', now: DO_MOCK_NOW }),
    )

    expect(
      store.getState().do.lanes.completedToday.map((endeavor) => endeavor.id),
    ).not.toContain('completed-today')
  })

  it('leaves the due date where it was — undo is not a reschedule', async () => {
    const { store, localStore } = seededStore()
    const before = await localStore.endeavors.get('completed-today')

    await store.dispatch(
      reopenEndeavorThunk({ endeavorId: 'completed-today', now: DO_MOCK_NOW }),
    )

    const after = await localStore.endeavors.get('completed-today')
    expect(after?.due?.getTime()).toBe(before?.due?.getTime())
  })
})
