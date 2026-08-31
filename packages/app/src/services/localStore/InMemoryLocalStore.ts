/**
 * The **stubbed** half of every store (`RC-33`): in-memory doubles that feature
 * tests and Storybook stories consume through `ThunkExtra`.
 *
 * A live-only Service is incomplete, and here the stub is doing more work than
 * usual: `fake-indexeddb` exists and is used by this package's own suite, but a
 * *feature* test has no business standing up a database to check that a Do-lane
 * Selector groups correctly. The stub is what keeps every downstream feature
 * suite synchronous-fast and deterministic.
 *
 * **The stub and the live store share every rule.** `liveRecords`,
 * `livingChildRecords`, `pendingSyncRecords`, `markRecordSoftDeleted` and the
 * key functions all come from `@kro/core` — the same imports the IndexedDB
 * binding uses. What differs is only the medium: a `Map` instead of an object
 * store. That is precisely why `__tests__/LocalStoreContract.test.ts` can run
 * one suite against both and mean something: the two share their semantics by
 * construction and differ only where they must.
 *
 * Seeding is a constructor argument rather than a `seed()` method, so a test
 * states the world it is asking about at the point it builds the store, and a
 * store handed to a feature cannot be re-seeded behind that feature's back.
 */
import {
  type DeferRecord,
  type DeferStore,
  type EndeavorRecord,
  type EndeavorStore,
  type EndeavorsLensSnapshot,
  type EpochMillis,
  type LensSnapshotStore,
  type LocalStore,
  type PerformanceRecord,
  type PerformanceStore,
  type PersistedRunningSession,
  type KeyValueStore,
  type SettingValue,
  type ProjectRecord,
  type ProjectStore,
  type RunningSessionAnchorStore,
  type UserProfileRecord,
  type UserProfileStore,
  deferRecordKey,
  isRecordSoftDeleted,
  liveRecords,
  livingChildRecords,
  markRecordSoftDeleted,
  markRecordSynced,
  pendingSyncChildRecords,
  pendingSyncRecords,
  performanceRecordKey,
} from '@kro/core'

/** Everything a stubbed store can be pre-loaded with. */
export interface InMemoryLocalStoreSeed {
  readonly endeavors?: readonly EndeavorRecord[]
  readonly projects?: readonly ProjectRecord[]
  readonly defers?: readonly DeferRecord[]
  readonly performances?: readonly PerformanceRecord[]
  readonly userProfiles?: readonly UserProfileRecord[]
  readonly preferences?: Readonly<Record<string, SettingValue>>
  /**
   * An already-built key-value store, which wins over `preferences`. It exists
   * so a suite can hand in KC-IS-#11's `makeInMemoryKeyValueStore(...)` — the
   * two are the same port, and passing #11's fixture straight in is the
   * cheapest possible proof of that.
   */
  readonly preferenceStore?: KeyValueStore
  readonly runningSessionAnchor?: PersistedRunningSession | null
  readonly lensSnapshots?: Readonly<Record<string, EndeavorsLensSnapshot>>
}

export const makeInMemoryEndeavorStore = (
  seed: readonly EndeavorRecord[] = [],
): EndeavorStore => {
  const rows = new Map(seed.map((record) => [record.id, record]))
  const owned = (ownerUserId: string | null) =>
    [...rows.values()].filter(
      (record) => ownerUserId === null || record.ownerUserId === ownerUserId,
    )

  return {
    all: async () => liveRecords([...rows.values()]),
    allIncludingRemoved: async () => [...rows.values()],
    get: async (id) => {
      const record = rows.get(id)
      return record === undefined || isRecordSoftDeleted(record) ? null : record
    },
    put: async (record) => {
      rows.set(record.id, record)
    },
    remove: async (id) => {
      rows.delete(id)
    },
    clear: async () => {
      rows.clear()
    },
    allForOwner: async (ownerUserId) => liveRecords(owned(ownerUserId)),
    softDelete: async (id, nowMillis) => {
      const record = rows.get(id)
      if (record !== undefined) {
        rows.set(id, markRecordSoftDeleted(record, nowMillis))
      }
    },
    markSynced: async (id, atMillis) => {
      const record = rows.get(id)
      if (record !== undefined) rows.set(id, markRecordSynced(record, atMillis))
    },
    pendingSync: async (ownerUserId) => pendingSyncRecords(owned(ownerUserId)),
    countAnonymous: async () =>
      liveRecords([...rows.values()]).filter(
        (record) => record.ownerUserId === null,
      ).length,
    adoptAnonymous: async (ownerUserId, nowMillis) => {
      let adopted = 0
      for (const [id, record] of [...rows]) {
        if (record.ownerUserId !== null) continue
        rows.set(id, {
          ...record,
          ownerUserId,
          updatedAtEpochMillis: nowMillis,
          lastSyncedAtEpochMillis: null,
        })
        adopted += 1
      }
      return adopted
    },
  }
}

export const makeInMemoryProjectStore = (
  seed: readonly ProjectRecord[] = [],
): ProjectStore => {
  const rows = new Map(seed.map((record) => [record.id, record]))
  return {
    all: async () => liveRecords([...rows.values()]),
    allIncludingRemoved: async () => [...rows.values()],
    get: async (id) => {
      const record = rows.get(id)
      return record === undefined || isRecordSoftDeleted(record) ? null : record
    },
    put: async (record) => {
      rows.set(record.id, record)
    },
    remove: async (id) => {
      rows.delete(id)
    },
    clear: async () => {
      rows.clear()
    },
    softDelete: async (id, nowMillis) => {
      const record = rows.get(id)
      if (record !== undefined) {
        rows.set(id, markRecordSoftDeleted(record, nowMillis))
      }
    },
    markSynced: async (id, atMillis) => {
      const record = rows.get(id)
      if (record !== undefined) rows.set(id, markRecordSynced(record, atMillis))
    },
    pendingSync: async () => pendingSyncRecords([...rows.values()]),
  }
}

const makeInMemoryChildStore = <
  Record extends {
    readonly endeavorId: string
    readonly serverId: string | null
    readonly pendingDeletion: boolean
    readonly updatedAtEpochMillis: EpochMillis
    readonly lastSyncedAtEpochMillis: EpochMillis | null
  },
>(
  seed: readonly Record[],
  keyOf: (record: Record) => string,
) => {
  const rows = new Map(seed.map((record) => [keyOf(record), record]))
  const forEndeavorIncludingRemoved = async (endeavorId: string) =>
    [...rows.values()].filter((record) => record.endeavorId === endeavorId)

  return {
    forEndeavor: async (endeavorId: string) =>
      livingChildRecords(await forEndeavorIncludingRemoved(endeavorId)),
    forEndeavorIncludingRemoved,
    all: async () => livingChildRecords([...rows.values()]),
    put: async (record: Record) => {
      rows.set(keyOf(record), record)
    },
    removeLocal: async (record: Record, nowMillis: EpochMillis) => {
      const key = keyOf(record)
      if (record.serverId === null) {
        rows.delete(key)
      } else {
        rows.set(key, {
          ...record,
          pendingDeletion: true,
          updatedAtEpochMillis: nowMillis,
          lastSyncedAtEpochMillis: null,
        })
      }
      return record.serverId
    },
    confirmRemoved: async (record: Record) => {
      rows.delete(keyOf(record))
    },
    pendingSync: async () => pendingSyncChildRecords([...rows.values()]),
    clear: async () => {
      rows.clear()
    },
  }
}

export const makeInMemoryDeferStore = (
  seed: readonly DeferRecord[] = [],
): DeferStore => makeInMemoryChildStore<DeferRecord>(seed, deferRecordKey)

export const makeInMemoryPerformanceStore = (
  seed: readonly PerformanceRecord[] = [],
): PerformanceStore =>
  makeInMemoryChildStore<PerformanceRecord>(seed, performanceRecordKey)

export const makeInMemoryUserProfileStore = (
  seed: readonly UserProfileRecord[] = [],
): UserProfileStore => {
  const rows = new Map(seed.map((record) => [record.id, record]))
  return {
    get: async (id) => rows.get(id) ?? null,
    current: async () => [...rows.values()][0] ?? null,
    put: async (record) => {
      rows.set(record.id, record)
    },
    remove: async (id) => {
      rows.delete(id)
    },
    clear: async () => {
      rows.clear()
    },
  }
}

/**
 * The stubbed `KeyValueStore`.
 *
 * KC-IS-#11 ships an equivalent under `settings/__mocks__/KeyValueStore.mocks`,
 * and this is deliberately **not** a re-export of it: that one lives behind the
 * `@kro/core/mocks` subpath, which exists precisely so mocks never ride into a
 * production bundle (`RC-13`) — and `stubbedThunkExtra` is production module
 * scope. The two are interchangeable by construction, and
 * `InMemoryLocalStoreSeed.preferenceStore` lets a suite pass #11's in directly,
 * which is where that interchangeability is actually asserted.
 *
 * It stores the **values**, not their JSON encoding: a stub has no wire, so
 * encoding here would test the encoder twice and hide a type mismatch only the
 * live binding can surface. The contract suite exercises the encoding where it
 * belongs — against the live binding.
 */
export const makeInMemoryPreferenceStorage = (
  seed: Readonly<Record<string, SettingValue>> = {},
): KeyValueStore => {
  const entries = new Map<string, SettingValue>(Object.entries(seed))
  return {
    get: (key) => entries.get(key) ?? null,
    set: (key, value) => {
      entries.set(key, value)
    },
    remove: (key) => {
      entries.delete(key)
    },
    keys: () => [...entries.keys()],
  }
}

export const makeInMemoryRunningSessionAnchorStore = (
  seed: PersistedRunningSession | null = null,
): RunningSessionAnchorStore => {
  let anchor = seed
  return {
    read: async () => anchor,
    write: async (session) => {
      anchor = session
    },
    clear: async () => {
      anchor = null
    },
  }
}

export const makeInMemoryLensSnapshotStore = (
  seed: Readonly<Record<string, EndeavorsLensSnapshot>> = {},
): LensSnapshotStore => {
  const rows = new Map<string, EndeavorsLensSnapshot>(Object.entries(seed))
  return {
    read: async (vistaId) => rows.get(vistaId) ?? null,
    write: async (vistaId, snapshot) => {
      rows.set(vistaId, snapshot)
    },
    clear: async (vistaId) => {
      rows.delete(vistaId)
    },
    clearAll: async () => {
      rows.clear()
    },
  }
}

/** The whole bundle, in memory — what `stubbedThunkExtra` carries. */
export const makeInMemoryLocalStore = (
  seed: InMemoryLocalStoreSeed = {},
): LocalStore => ({
  endeavors: makeInMemoryEndeavorStore(seed.endeavors),
  projects: makeInMemoryProjectStore(seed.projects),
  defers: makeInMemoryDeferStore(seed.defers),
  performances: makeInMemoryPerformanceStore(seed.performances),
  userProfiles: makeInMemoryUserProfileStore(seed.userProfiles),
  preferences:
    seed.preferenceStore ?? makeInMemoryPreferenceStorage(seed.preferences),
  runningSessionAnchor: makeInMemoryRunningSessionAnchorStore(
    seed.runningSessionAnchor ?? null,
  ),
  lensSnapshots: makeInMemoryLensSnapshotStore(seed.lensSnapshots),
})

/**
 * The bundle every test and story gets by default: empty, so a suite that
 * forgets to seed sees an empty app rather than someone else's fixtures.
 */
export const stubbedLocalStore: LocalStore = makeInMemoryLocalStore()
