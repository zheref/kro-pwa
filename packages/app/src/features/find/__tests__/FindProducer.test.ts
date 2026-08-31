/**
 * Producers are dispatched for real against a stubbed `LocalStore` injected
 * through `ThunkExtra` — never a mocked `fetch`, never the live bindings
 * (`RC-54`, `RC-35`). The assertions are on the resolved `Result`, because a
 * Producer's contract is what it resolves.
 */
import type { EndeavorRecord } from '@kro/core'
import {
  EndeavorOperation,
  EndeavorStatus,
  endeavorRecordFromEndeavor,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import { makeStore } from '../../../library/store'
import { stubbedGreetingService } from '../../../services/greeting/GreetingService'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import {
  FIND_REFERENCE_NOW,
  allFindEndeavorMocks,
  findEndeavorMocks,
} from '../FindMocks'
import {
  fetchFindEndeavorsThunk,
  performBulkOperationThunk,
  performEndeavorOperationThunk,
  persistFindLensThunk,
  restoreFindLensThunk,
} from '../FindProducer'

const recordsOf = (): readonly EndeavorRecord[] =>
  allFindEndeavorMocks.map((endeavor) =>
    endeavorRecordFromEndeavor(endeavor, { now: FIND_REFERENCE_NOW }),
  )

const storeWith = (records: readonly EndeavorRecord[] = recordsOf()) => {
  const localStore = makeInMemoryLocalStore({ endeavors: records })
  return {
    localStore,
    store: makeStore({ greetingService: stubbedGreetingService, localStore }),
  }
}

const failingStore = (message: string) => {
  const base = makeInMemoryLocalStore({ endeavors: recordsOf() })
  return makeStore({
    greetingService: stubbedGreetingService,
    localStore: {
      ...base,
      endeavors: {
        ...base.endeavors,
        all: async () => {
          throw new Error(message)
        },
        put: async () => {
          throw new Error(message)
        },
      },
    },
  })
}

const request = (
  operation: EndeavorOperation,
  endeavorId: string,
  extra: Record<string, unknown> = {},
) => ({
  surface: 'find' as const,
  operation,
  endeavorId,
  now: FIND_REFERENCE_NOW,
  ...extra,
})

describe('fetchFindEndeavorsThunk reads the whole surface, unnarrowed', () => {
  it('resolves every stored row for the surface that asked', async () => {
    const { store } = storeWith()
    const result = await store
      .dispatch(fetchFindEndeavorsThunk({ surface: 'find', now: FIND_REFERENCE_NOW }))
      .unwrap()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.surface).toBe('find')
      expect(result.value.endeavors).toHaveLength(allFindEndeavorMocks.length)
    }
  })

  it('hands the rows through RAW — reconciliation is the install shifter’s', async () => {
    const { store } = storeWith()
    const result = await store
      .dispatch(fetchFindEndeavorsThunk({ surface: 'find', now: FIND_REFERENCE_NOW }))
      .unwrap()
    expect(result.ok && result.value.now).toEqual(FIND_REFERENCE_NOW)
  })

  it('resolves a typed failure rather than throwing when the store is broken', async () => {
    const store = failingStore('disk gone')
    const result = await store
      .dispatch(fetchFindEndeavorsThunk({ surface: 'find', now: FIND_REFERENCE_NOW }))
      .unwrap()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('fetchFailed')
  })

  it('answers an empty store with an empty list, not a failure', async () => {
    const { store } = storeWith([])
    const result = await store
      .dispatch(fetchFindEndeavorsThunk({ surface: 'find', now: FIND_REFERENCE_NOW }))
      .unwrap()
    expect(result.ok && result.value.endeavors).toEqual([])
  })
})

describe('the lens round-trip', () => {
  it('persists a lens and reads it back', async () => {
    const { store, localStore } = storeWith()
    await store
      .dispatch(
        persistFindLensThunk({
          surface: 'find',
          vistaId: 'find',
          lens: {
            hiddenKinds: ['habit'],
            hiddenHosts: [],
            hiddenStatuses: [],
            hiddenComputedStates: [],
            hiddenCalendarIds: [],
            searchQuery: 'slides',
            showArchived: true,
            grouping: 'status',
          },
        }),
      )
      .unwrap()

    expect(await localStore.lensSnapshots.read('find')).not.toBeNull()

    const restored = await store
      .dispatch(restoreFindLensThunk({ surface: 'find', vistaId: 'find' }))
      .unwrap()
    expect(restored.ok).toBe(true)
    if (restored.ok && restored.value !== null) {
      expect(restored.value.searchQuery).toBe('slides')
      expect(restored.value.showArchived).toBe(true)
      expect(restored.value.hiddenKinds).toEqual(['habit'])
    }
  })

  it('resolves null when nothing was ever saved for that vista', async () => {
    const { store } = storeWith()
    const restored = await store
      .dispatch(restoreFindLensThunk({ surface: 'find', vistaId: 'find' }))
      .unwrap()
    expect(restored.ok && restored.value).toBeNull()
  })

  it('stays SILENT on a read failure — a filter preference is not an error', async () => {
    const base = makeInMemoryLocalStore()
    const store = makeStore({
      greetingService: stubbedGreetingService,
      localStore: {
        ...base,
        lensSnapshots: {
          ...base.lensSnapshots,
          read: async () => {
            throw new Error('corrupt row')
          },
        },
      },
    })
    const restored = await store
      .dispatch(restoreFindLensThunk({ surface: 'find', vistaId: 'find' }))
      .unwrap()
    expect(restored.ok && restored.value).toBeNull()
  })

  it('swallows a write failure too — the session’s filters still work', async () => {
    const base = makeInMemoryLocalStore()
    const store = makeStore({
      greetingService: stubbedGreetingService,
      localStore: {
        ...base,
        lensSnapshots: {
          ...base.lensSnapshots,
          write: async () => {
            throw new Error('quota exceeded')
          },
        },
      },
    })
    const result = await store
      .dispatch(
        persistFindLensThunk({
          surface: 'find',
          vistaId: 'find',
          lens: {
            hiddenKinds: [],
            hiddenHosts: [],
            hiddenStatuses: [],
            hiddenComputedStates: [],
            hiddenCalendarIds: [],
            searchQuery: '',
            showArchived: false,
            grouping: 'status',
          },
        }),
      )
      .unwrap()
    expect(result.ok).toBe(true)
  })
})

describe('performEndeavorOperationThunk wires every declared capability', () => {
  it('completes a row and persists the backdated completion', async () => {
    const { store, localStore } = storeWith()
    const backdated = new Date(2026, 5, 17, 22, 0, 0)
    const result = await store
      .dispatch(
        performEndeavorOperationThunk(
          request(EndeavorOperation.markComplete, findEndeavorMocks.morningTask.id, {
            completionDate: backdated,
          }),
        ),
      )
      .unwrap()

    expect(result.ok && result.value.kind).toBe('mutated')
    const stored = await localStore.endeavors.get(
      findEndeavorMocks.morningTask.id,
    )
    expect(stored?.status).toBe(EndeavorStatus.closed)
    expect(stored?.completed).toEqual(backdated)
  })

  it('soft-deletes a row rather than rewriting it', async () => {
    const { store, localStore } = storeWith()
    const result = await store
      .dispatch(
        performEndeavorOperationThunk(
          request(EndeavorOperation.delete, findEndeavorMocks.morningTask.id),
        ),
      )
      .unwrap()

    expect(result.ok && result.value.kind).toBe('removed')
    expect(
      await localStore.endeavors.get(findEndeavorMocks.morningTask.id),
    ).toBeNull()
  })

  it('archives by closing the row without stamping a completion', async () => {
    const { store, localStore } = storeWith()
    await store
      .dispatch(
        performEndeavorOperationThunk(
          request(EndeavorOperation.archive, findEndeavorMocks.morningTask.id),
        ),
      )
      .unwrap()
    const stored = await localStore.endeavors.get(
      findEndeavorMocks.morningTask.id,
    )
    expect(stored?.status).toBe(EndeavorStatus.closed)
    expect(stored?.completed).toBeNull()
  })

  it('writes both rows of a defer: the moved due AND the audit entry', async () => {
    const { store, localStore } = storeWith()
    const target = new Date(2026, 5, 19, 9, 0, 0)
    await store
      .dispatch(
        performEndeavorOperationThunk(
          request(EndeavorOperation.defer, findEndeavorMocks.morningTask.id, {
            deferTarget: target,
            deferReason: 'blocked',
          }),
        ),
      )
      .unwrap()

    const stored = await localStore.endeavors.get(
      findEndeavorMocks.morningTask.id,
    )
    expect(stored?.due).toEqual(target)
    const defers = await localStore.defers.forEndeavor(
      findEndeavorMocks.morningTask.id,
    )
    expect(defers).toHaveLength(1)
    expect(defers[0]?.reason).toBe('blocked')
  })

  it('writes NEITHER row when the matrix refuses the defer', async () => {
    const { store, localStore } = storeWith()
    await store
      .dispatch(
        performEndeavorOperationThunk(
          request(EndeavorOperation.defer, findEndeavorMocks.teamSync.id, {
            deferTarget: new Date(2026, 5, 19, 9, 0, 0),
          }),
        ),
      )
      .unwrap()
    expect(
      await localStore.defers.forEndeavor(findEndeavorMocks.teamSync.id),
    ).toEqual([])
  })

  it('resolves an intent — not a failure — for an operation someone else owns', async () => {
    const { store } = storeWith()
    const result = await store
      .dispatch(
        performEndeavorOperationThunk(
          request(EndeavorOperation.startSession, findEndeavorMocks.morningTask.id),
        ),
      )
      .unwrap()
    expect(result.ok && result.value.kind).toBe('intent')
  })

  it('reports a stale tap on a row that is no longer stored', async () => {
    const { store } = storeWith([])
    const result = await store
      .dispatch(
        performEndeavorOperationThunk(
          request(EndeavorOperation.markComplete, 'ghost'),
        ),
      )
      .unwrap()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('endeavorNotFound')
  })

  it('resolves a typed failure when the write itself throws', async () => {
    const store = failingStore('disk gone')
    const result = await store
      .dispatch(
        performEndeavorOperationThunk(
          request(EndeavorOperation.markComplete, findEndeavorMocks.morningTask.id),
        ),
      )
      .unwrap()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('operationFailed')
  })
})

describe('performBulkOperationThunk applies to exactly the visible rows', () => {
  it('deletes every id it was given', async () => {
    const { store, localStore } = storeWith()
    const ids = [
      findEndeavorMocks.morningTask.id,
      findEndeavorMocks.afternoonTask.id,
    ]
    const result = await store
      .dispatch(
        performBulkOperationThunk({
          surface: 'find',
          operation: 'delete',
          endeavorIds: ids,
          now: FIND_REFERENCE_NOW,
        }),
      )
      .unwrap()
    expect(result.ok).toBe(true)
    for (const id of ids) {
      expect(await localStore.endeavors.get(id)).toBeNull()
    }
  })

  it('archives every id it was given, leaving the rest alone', async () => {
    const { store, localStore } = storeWith()
    await store
      .dispatch(
        performBulkOperationThunk({
          surface: 'find',
          operation: 'archive',
          endeavorIds: [findEndeavorMocks.morningTask.id],
          now: FIND_REFERENCE_NOW,
        }),
      )
      .unwrap()
    expect(
      (await localStore.endeavors.get(findEndeavorMocks.morningTask.id))?.status,
    ).toBe(EndeavorStatus.closed)
    expect(
      (await localStore.endeavors.get(findEndeavorMocks.afternoonTask.id))
        ?.status,
    ).toBe(EndeavorStatus.ongoing)
  })

  it('skips an id that is no longer stored instead of failing the batch', async () => {
    const { store } = storeWith()
    const result = await store
      .dispatch(
        performBulkOperationThunk({
          surface: 'find',
          operation: 'archive',
          endeavorIds: ['ghost', findEndeavorMocks.morningTask.id],
          now: FIND_REFERENCE_NOW,
        }),
      )
      .unwrap()
    expect(result.ok).toBe(true)
  })

  it('reports a partial batch as a failure rather than claiming success', async () => {
    const store = failingStore('disk gone')
    const result = await store
      .dispatch(
        performBulkOperationThunk({
          surface: 'find',
          operation: 'archive',
          endeavorIds: [findEndeavorMocks.morningTask.id],
          now: FIND_REFERENCE_NOW,
        }),
      )
      .unwrap()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('bulkOperationFailed')
  })
})
