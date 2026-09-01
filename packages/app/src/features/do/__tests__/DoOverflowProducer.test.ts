import { type EndeavorStore, EndeavorStatus, type LocalStore } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  type AppStore,
  makeStore,
  stubbedThunkExtra,
} from '../../../library/store'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import { DO_MOCK_NOW, doFixtureRecords, doMockAt } from '../DoMocks'
import { selectDoException } from '../DoSelectors'
import {
  deferEndeavorThunk,
  delegateEndeavorThunk,
  deleteEndeavorThunk,
  reopenEndeavorThunk,
  skipEndeavorThunk,
} from '../DoProducer'

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

  it('leaves the delegated row IN its lane — delegating is not completing', async () => {
    /*
      This case used to assert the opposite, and passed vacuously: the refetch
      was dispatched fire-and-forget, so the assertion ran against a day that
      had never loaded and `lanes.anytime` was empty. Awaiting it (KC-IS-#71
      item 3) made the day real and the claim false.

      The truth is canon's: `hasBeenCompleted` counts `closed`, `reviewing`,
      `qa` and `skipped` — NOT `delegated`. Handing a task to somebody else
      does not finish it, so it stays on your day with the delegated
      treatment the design system draws. Skip is the row that leaves.
    */
    const { store } = seededStore()

    await store.dispatch(
      delegateEndeavorThunk({ endeavorId: 'anytime-task', now: DO_MOCK_NOW }),
    )

    const lane = store.getState().do.lanes.anytime
    expect(lane.map((endeavor) => endeavor.id)).toContain('anytime-task')
    expect(
      lane.find((endeavor) => endeavor.id === 'anytime-task')?.status,
    ).toBe(EndeavorStatus.delegated)
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

/**
 * The failure reaches the banner (KC-IS-#71 item 3).
 *
 * These five registered no reducer arm at all, and the gap was quiet in the
 * exact case that matters. Each one refetches the day after its write, so a
 * broken *store* failed the refetch too and `fetchDoEndeavorsThunk`'s own arm
 * painted the banner — but a write that failed while the store was otherwise
 * healthy refetched a good day and the surface said nothing. The row simply did
 * not move, with no explanation.
 *
 * The store below is broken for **writes only**: reads succeed, so the refetch
 * lands a perfectly good day and the only thing that can surface the failure is
 * the arm.
 */
describe('a failed overflow write reaches the banner', () => {
  const cases = [
    {
      name: 'Defer',
      dispatchIt: (store: AppStore) =>
        store.dispatch(
          deferEndeavorThunk({
            endeavorId: 'due-late-today',
            target: doMockAt(18, 9),
            now: DO_MOCK_NOW,
          }),
        ),
    },
    {
      name: 'Skip',
      dispatchIt: (store: AppStore) =>
        store.dispatch(
          skipEndeavorThunk({ endeavorId: 'due-late-today', now: DO_MOCK_NOW }),
        ),
    },
    {
      name: 'Delegate',
      dispatchIt: (store: AppStore) =>
        store.dispatch(
          delegateEndeavorThunk({
            endeavorId: 'anytime-task',
            now: DO_MOCK_NOW,
          }),
        ),
    },
    {
      name: 'Delete',
      dispatchIt: (store: AppStore) =>
        store.dispatch(
          deleteEndeavorThunk({ endeavorId: 'anytime-task', now: DO_MOCK_NOW }),
        ),
    },
  ] as const

  for (const { name, dispatchIt } of cases) {
    it(`${name} leaves a message the surface can show`, async () => {
      const store = brokenWriteStore()

      await dispatchIt(store)

      const exception = selectDoException(store.getState())
      expect(exception, `${name} reported nothing`).not.toBeNull()
      expect(exception?.message).toContain('disk is full')
    })
  }

  it('says nothing when the write succeeds — the banner is not a receipt', async () => {
    const { store } = seededStore()

    await store.dispatch(
      skipEndeavorThunk({ endeavorId: 'due-late-today', now: DO_MOCK_NOW }),
    )

    expect(selectDoException(store.getState())).toBeNull()
  })

  it('keeps the retained day, so a failure costs the user nothing on screen', async () => {
    const store = brokenWriteStore()
    // The refetch still lands: the read half of the store works. The lanes are
    // the day; `load` is only the lifecycle, so a banner takes nothing away.
    await store.dispatch(
      skipEndeavorThunk({ endeavorId: 'due-late-today', now: DO_MOCK_NOW }),
    )

    expect(store.getState().do.load.kind).toBe('failed')
    expect(store.getState().do.lanes.anytime.length).toBeGreaterThan(0)
  })
})
