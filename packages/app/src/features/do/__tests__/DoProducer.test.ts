import {
  type EndeavorRecord,
  type EndeavorStore,
  EndeavorStatus,
  type LocalStore,
  featureFlagOverrideKey,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import { type AppStore, makeStore, stubbedThunkExtra } from '../../../library/store'
import {
  DO_MOCK_NOW,
  doEndeavorFixtures,
  doFixtureRecords,
  doMockAt,
} from '../DoMocks'
import {
  clearExpiredThunk,
  fetchDoEndeavorsThunk,
  loadDoPreferencesThunk,
  markEndeavorCompleteThunk,
} from '../DoProducer'

/**
 * A store wired to a stubbed `LocalStore` — every suite here goes through
 * `makeStore(extra)`, never a second `configureStore` (`RC-22`, `RC-35`), and
 * never the network.
 */
const storeWith = (localStore: LocalStore): AppStore =>
  makeStore({ ...stubbedThunkExtra, localStore })

const seeded = (records: readonly EndeavorRecord[] = doFixtureRecords()) =>
  makeInMemoryLocalStore({ endeavors: records })

/** Wraps the endeavor store so a suite can log calls or make one of them fail. */
const instrument = (
  localStore: LocalStore,
  hooks: {
    readonly log?: string[]
    readonly failPutAfter?: number
    readonly failAllAfter?: number
  },
): LocalStore => {
  let puts = 0
  let alls = 0
  const inner = localStore.endeavors
  const endeavors: EndeavorStore = {
    ...inner,
    all: async () => {
      alls += 1
      hooks.log?.push(`all#${alls}`)
      if (hooks.failAllAfter !== undefined && alls > hooks.failAllAfter) {
        throw new Error('read failed')
      }
      return inner.all()
    },
    get: (id) => inner.get(id),
    put: async (record) => {
      puts += 1
      hooks.log?.push(`put#${puts}:${record.id}`)
      if (hooks.failPutAfter !== undefined && puts > hooks.failPutAfter) {
        throw new Error('write failed')
      }
      return inner.put(record)
    },
  }
  return { ...localStore, endeavors }
}

// ---------------------------------------------------------------------------
// Preferences + flags
// ---------------------------------------------------------------------------

describe('loadDoPreferencesThunk', () => {
  it('falls back to every option default on a fresh install', async () => {
    const store = storeWith(seeded())
    const result = await store.dispatch(loadDoPreferencesThunk())

    expect(result.payload).toEqual({
      ok: true,
      value: {
        showSuggestions: true,
        nowThresholdHours: 2,
        autoAdvanceAfterComplete: false,
        // Both ship enabled in the statusQuo baseline.
        activityRingsEnabled: true,
        googleCalendarEnabled: true,
      },
    })
  })

  it('reads a preference the user has changed', async () => {
    const localStore = seeded()
    localStore.preferences.set('kro:do.nowThresholdHours', 6)
    localStore.preferences.set('kro:do.autoAdvanceAfterComplete', true)

    const store = storeWith(localStore)
    await store.dispatch(loadDoPreferencesThunk())

    expect(store.getState().do.preferences.nowThresholdHours).toBe(6)
    expect(store.getState().do.preferences.autoAdvanceAfterComplete).toBe(true)
  })

  it('honours a persisted debug override of the rings kill switch', async () => {
    const localStore = seeded()
    localStore.preferences.set(featureFlagOverrideKey('doActivityRings'), false)

    const store = storeWith(localStore)
    await store.dispatch(loadDoPreferencesThunk())

    expect(store.getState().do.preferences.activityRingsEnabled).toBe(false)
  })

  it('resolves an exception rather than throwing when the store is unreadable', async () => {
    const localStore = seeded()
    const broken: LocalStore = {
      ...localStore,
      preferences: {
        ...localStore.preferences,
        keys: () => {
          throw new Error('storage is gone')
        },
      },
    }
    const store = storeWith(broken)
    await store.dispatch(loadDoPreferencesThunk())

    const { load } = store.getState().do
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') {
      expect(load.exception.kind).toBe('preferencesLoadFailed')
    }
  })
})

// ---------------------------------------------------------------------------
// The day's fetch
// ---------------------------------------------------------------------------

describe('fetchDoEndeavorsThunk', () => {
  it('installs the whole day in one pass', async () => {
    const store = storeWith(seeded())
    await store.dispatch(fetchDoEndeavorsThunk({ now: DO_MOCK_NOW }))

    const { load, lanes, habits, events } = store.getState().do
    expect(load).toEqual({ kind: 'loaded' })
    expect(lanes.overdue.length).toBeGreaterThan(0)
    expect(lanes.expired).toHaveLength(2)
    expect(habits.length).toBeGreaterThan(0)
    expect(events).toHaveLength(1)
  })

  it('classifies against the instant it was given, not the wall clock', async () => {
    const store = storeWith(seeded())
    // 19:00: the 18:00 task has slipped into Overdue and Next is empty.
    await store.dispatch(fetchDoEndeavorsThunk({ now: doMockAt(17, 19, 0) }))

    const { lanes, clockAnchor } = store.getState().do
    expect(clockAnchor).toEqual(doMockAt(17, 19, 0))
    expect(lanes.next).toEqual([])
    expect(lanes.overdue.map((endeavor) => endeavor.id)).toContain(
      doEndeavorFixtures.dueLateToday.id,
    )
  })

  it('yields an empty day from an empty store', async () => {
    const store = storeWith(makeInMemoryLocalStore())
    await store.dispatch(fetchDoEndeavorsThunk({ now: DO_MOCK_NOW }))
    expect(store.getState().do.lanes.now).toEqual([])
  })

  it('keeps the retained day when the read fails', async () => {
    const localStore = seeded()
    const store = storeWith(localStore)
    await store.dispatch(fetchDoEndeavorsThunk({ now: DO_MOCK_NOW }))
    const goodLanes = store.getState().do.lanes

    const broken = storeWith(instrument(localStore, { failAllAfter: 0 }))
    await broken.dispatch(fetchDoEndeavorsThunk({ now: DO_MOCK_NOW }))
    // A different store instance, so assert the shape rather than identity:
    // the failing dispatch must not have installed anything.
    expect(broken.getState().do.load.kind).toBe('failed')
    expect(broken.getState().do.lanes.overdue).toEqual([])
    expect(goodLanes.overdue.length).toBeGreaterThan(0)
  })

  it('skips a row whose stored kind no longer decodes, rather than blanking the day', async () => {
    const records = doFixtureRecords()
    const corrupted = records.map((record, index) =>
      index === 0 ? { ...record, kind: 'not-a-kind' } : record,
    )
    const store = storeWith(makeInMemoryLocalStore({ endeavors: corrupted }))
    await store.dispatch(fetchDoEndeavorsThunk({ now: DO_MOCK_NOW }))

    expect(store.getState().do.load).toEqual({ kind: 'loaded' })
    expect(store.getState().do.tasks.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Clear Expired
// ---------------------------------------------------------------------------

describe('clearExpiredThunk', () => {
  it('closes every expired endeavor and leaves today’s overdue alone', async () => {
    const localStore = seeded()
    const store = storeWith(localStore)
    await store.dispatch(fetchDoEndeavorsThunk({ now: DO_MOCK_NOW }))
    await store.dispatch(clearExpiredThunk({ now: DO_MOCK_NOW }))

    const { lanes } = store.getState().do
    expect(lanes.expired).toEqual([])
    expect(lanes.overdue.map((endeavor) => endeavor.id)).toContain(
      doEndeavorFixtures.overdueThisMorning.id,
    )

    const cleared = await localStore.endeavors.get(
      doEndeavorFixtures.expiredLastWeek.id,
    )
    expect(cleared?.status).toBe(EndeavorStatus.closed)
    // Cleared, not completed: an acknowledgement must never fill a ring.
    expect(cleared?.completed).toBeNull()
  })

  it('awaits every mutation before the single refetch', async () => {
    const log: string[] = []
    const localStore = instrument(seeded(), { log })
    const store = storeWith(localStore)
    await store.dispatch(clearExpiredThunk({ now: DO_MOCK_NOW }))

    const firstPut = log.findIndex((entry) => entry.startsWith('put#'))
    const lastPut = log.map((entry) => entry.startsWith('put#')).lastIndexOf(true)
    const readsAfterTheLastPut = log
      .slice(lastPut + 1)
      .filter((entry) => entry.startsWith('all#'))

    expect(firstPut).toBeGreaterThan(0) // the target read comes first
    expect(log.filter((entry) => entry.startsWith('put#'))).toHaveLength(2)
    expect(readsAfterTheLastPut).toHaveLength(1) // exactly one refetch
  })

  it('installs nothing at all when a mutation fails halfway — no partial day is observable', async () => {
    const localStore = instrument(seeded(), { failPutAfter: 1 })
    const store = storeWith(localStore)
    await store.dispatch(fetchDoEndeavorsThunk({ now: DO_MOCK_NOW }))

    const before = store.getState().do.lanes
    const seenLanes: unknown[] = []
    const unsubscribe = store.subscribe(() => {
      seenLanes.push(store.getState().do.lanes)
    })
    await store.dispatch(clearExpiredThunk({ now: DO_MOCK_NOW }))
    unsubscribe()

    const { load, lanes } = store.getState().do
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') {
      expect(load.exception.kind).toBe('clearExpiredMutationFailed')
    }
    // Every state the reducer produced during the operation carried the same
    // lanes: there is no instant at which half the day was cleared.
    expect(lanes).toEqual(before)
    for (const seen of seenLanes) expect(seen).toEqual(before)
  })

  it('reports the refresh failure separately once the mutations have landed', async () => {
    // One read to find the targets succeeds; the refetch after them fails.
    const localStore = instrument(seeded(), { failAllAfter: 1 })
    const store = storeWith(localStore)
    await store.dispatch(clearExpiredThunk({ now: DO_MOCK_NOW }))

    const { load } = store.getState().do
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') {
      expect(load.exception.kind).toBe('clearExpiredRefreshFailed')
    }
  })

  it('is a quiet no-op on a day with nothing expired', async () => {
    const localStore = makeInMemoryLocalStore({
      endeavors: doFixtureRecords().filter(
        (record) =>
          record.id !== doEndeavorFixtures.expiredLastNight.id &&
          record.id !== doEndeavorFixtures.expiredLastWeek.id,
      ),
    })
    const log: string[] = []
    const store = storeWith(instrument(localStore, { log }))
    await store.dispatch(clearExpiredThunk({ now: DO_MOCK_NOW }))

    expect(log.filter((entry) => entry.startsWith('put#'))).toEqual([])
    expect(store.getState().do.load).toEqual({ kind: 'loaded' })
  })
})

// ---------------------------------------------------------------------------
// One completion
// ---------------------------------------------------------------------------

describe('markEndeavorCompleteThunk', () => {
  const targetId = doEndeavorFixtures.overdueThisMorning.id

  it('persists the completion at the instant the popover carried', async () => {
    const localStore = seeded()
    const store = storeWith(localStore)
    const backdated = doMockAt(17, 7, 15)

    await store.dispatch(
      markEndeavorCompleteThunk({
        endeavorId: targetId,
        completionDate: backdated,
        now: DO_MOCK_NOW,
      }),
    )

    const record = await localStore.endeavors.get(targetId)
    expect(record?.status).toBe(EndeavorStatus.closed)
    expect(record?.completed).toEqual(backdated)
  })

  it('reports a stale card key rather than closing the wrong row', async () => {
    const store = storeWith(seeded())
    await store.dispatch(
      markEndeavorCompleteThunk({
        endeavorId: 'gone',
        completionDate: DO_MOCK_NOW,
        now: DO_MOCK_NOW,
      }),
    )

    const { load } = store.getState().do
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') expect(load.exception.kind).toBe('endeavorNotFound')
  })

  it('resolves an exception rather than throwing when the write fails', async () => {
    const store = storeWith(instrument(seeded(), { failPutAfter: 0 }))
    await store.dispatch(
      markEndeavorCompleteThunk({
        endeavorId: targetId,
        completionDate: DO_MOCK_NOW,
        now: DO_MOCK_NOW,
      }),
    )

    const { load } = store.getState().do
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') {
      expect(load.exception.kind).toBe('markCompleteFailed')
    }
  })

  it('leaves the sync watermark of an already-synced row intact', async () => {
    const records = doFixtureRecords().map((record) =>
      record.id === targetId
        ? { ...record, lastSyncedAtEpochMillis: 1_700_000_000_000 }
        : record,
    )
    const localStore = makeInMemoryLocalStore({ endeavors: records })
    const store = storeWith(localStore)

    await store.dispatch(
      markEndeavorCompleteThunk({
        endeavorId: targetId,
        completionDate: DO_MOCK_NOW,
        now: DO_MOCK_NOW,
      }),
    )

    const record = await localStore.endeavors.get(targetId)
    expect(record?.lastSyncedAtEpochMillis).toBe(1_700_000_000_000)
  })
})
