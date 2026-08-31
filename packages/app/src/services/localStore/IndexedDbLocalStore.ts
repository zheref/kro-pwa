/**
 * The **live** half of every record store: IndexedDB.
 *
 * Canon's counterpart is `KroEndeavorRepository.live`, which opens a background
 * `ModelContext` per operation. The shape here is the same — one short
 * transaction per operation, nothing held open across an `await` — and for the
 * same reason: an IndexedDB transaction auto-commits the moment its microtask
 * queue drains, so a transaction that spans a caller's `await` is already
 * closed by the time the caller comes back. Every method below therefore opens
 * its own transaction and finishes inside it.
 *
 * **Every query predicate comes from `@kro/core`.** `liveRecords`,
 * `livingChildRecords`, `pendingSyncRecords`, `markRecordSoftDeleted` — none of
 * them is re-implemented here, so the live store and the in-memory stub cannot
 * answer differently. That is what makes the shared contract suite meaningful:
 * if the two ever diverged, it would be in the plumbing, not in the rules.
 */
import {
  type DeferRecord,
  type DeferStore,
  type EndeavorRecord,
  type EndeavorStore,
  type EndeavorsLensSnapshot,
  type EpochMillis,
  type LensSnapshotStore,
  type PerformanceRecord,
  type PerformanceStore,
  type ProjectRecord,
  type ProjectStore,
  type UserProfileRecord,
  type UserProfileStore,
  decodeLensSnapshot,
  deferRecordKey,
  encodeLensSnapshot,
  isRecordSoftDeleted,
  liveRecords,
  livingChildRecords,
  markRecordSoftDeleted,
  markRecordSynced,
  pendingSyncChildRecords,
  pendingSyncRecords,
  performanceRecordKey,
} from '@kro/core'
import { KroObjectStore, idbRequest, idbTransactionDone } from './KroDatabase'

/** How the stores reach the database. Lazy, so opening is not a side effect. */
export type DatabaseProvider = () => Promise<IDBDatabase>

const readAll = async <Value>(
  provider: DatabaseProvider,
  storeName: string,
): Promise<readonly Value[]> => {
  const database = await provider()
  const transaction = database.transaction(storeName, 'readonly')
  const rows = await idbRequest<Value[]>(
    transaction.objectStore(storeName).getAll() as IDBRequest<Value[]>,
  )
  await idbTransactionDone(transaction)
  return rows
}

const readByIndex = async <Value>(
  provider: DatabaseProvider,
  storeName: string,
  indexName: string,
  key: IDBValidKey,
): Promise<readonly Value[]> => {
  const database = await provider()
  const transaction = database.transaction(storeName, 'readonly')
  const rows = await idbRequest<Value[]>(
    transaction
      .objectStore(storeName)
      .index(indexName)
      .getAll(key) as IDBRequest<Value[]>,
  )
  await idbTransactionDone(transaction)
  return rows
}

const readOne = async <Value>(
  provider: DatabaseProvider,
  storeName: string,
  key: IDBValidKey,
): Promise<Value | undefined> => {
  const database = await provider()
  const transaction = database.transaction(storeName, 'readonly')
  const row = await idbRequest<Value | undefined>(
    transaction.objectStore(storeName).get(key) as IDBRequest<
      Value | undefined
    >,
  )
  await idbTransactionDone(transaction)
  return row
}

/**
 * Run a read-modify-write inside **one** transaction.
 *
 * The `mutate` callback is synchronous on purpose: an `await` inside it would
 * let the transaction auto-commit underneath, and the write would land in a
 * different (or no) transaction. That is the single most common IndexedDB bug,
 * so the type signature forbids it rather than a comment asking nicely.
 */
const write = async (
  provider: DatabaseProvider,
  storeNames: string | readonly string[],
  mutate: (transaction: IDBTransaction) => void,
): Promise<void> => {
  const database = await provider()
  const transaction = database.transaction(
    storeNames as string | string[],
    'readwrite',
  )
  mutate(transaction)
  await idbTransactionDone(transaction)
}

/** Read every row, apply `change`, write the changed ones back — one pass. */
const rewriteAll = async <Value>(
  provider: DatabaseProvider,
  storeName: string,
  change: (row: Value) => Value | null,
  keyOf?: (row: Value) => IDBValidKey,
): Promise<number> => {
  const database = await provider()
  const transaction = database.transaction(storeName, 'readwrite')
  const store = transaction.objectStore(storeName)
  const rows = await idbRequest<Value[]>(store.getAll() as IDBRequest<Value[]>)
  let changed = 0
  for (const row of rows) {
    const next = change(row)
    if (next === null) continue
    if (keyOf === undefined) store.put(next)
    else store.put(next, keyOf(next))
    changed += 1
  }
  await idbTransactionDone(transaction)
  return changed
}

// MARK: - Endeavors

export const makeIndexedDbEndeavorStore = (
  provider: DatabaseProvider,
): EndeavorStore => {
  const store = KroObjectStore.endeavors
  const everything = () => readAll<EndeavorRecord>(provider, store)

  return {
    all: async () => liveRecords(await everything()),
    allIncludingRemoved: everything,
    get: async (id) => {
      const record = await readOne<EndeavorRecord>(provider, store, id)
      return record === undefined || isRecordSoftDeleted(record) ? null : record
    },
    put: (record) =>
      write(provider, store, (transaction) => {
        transaction.objectStore(store).put(record)
      }),
    remove: (id) =>
      write(provider, store, (transaction) => {
        transaction.objectStore(store).delete(id)
      }),
    clear: () =>
      write(provider, store, (transaction) => {
        transaction.objectStore(store).clear()
      }),

    allForOwner: async (ownerUserId) =>
      liveRecords(await everything()).filter(
        (record) => ownerUserId === null || record.ownerUserId === ownerUserId,
      ),

    softDelete: async (id, nowMillis) => {
      const database = await provider()
      const transaction = database.transaction(store, 'readwrite')
      const table = transaction.objectStore(store)
      const record = await idbRequest<EndeavorRecord | undefined>(
        table.get(id) as IDBRequest<EndeavorRecord | undefined>,
      )
      if (record !== undefined) {
        table.put(markRecordSoftDeleted(record, nowMillis))
      }
      await idbTransactionDone(transaction)
    },

    markSynced: async (id, atMillis) => {
      const database = await provider()
      const transaction = database.transaction(store, 'readwrite')
      const table = transaction.objectStore(store)
      const record = await idbRequest<EndeavorRecord | undefined>(
        table.get(id) as IDBRequest<EndeavorRecord | undefined>,
      )
      if (record !== undefined) {
        table.put(markRecordSynced(record, atMillis))
      }
      await idbTransactionDone(transaction)
    },

    pendingSync: async (ownerUserId) =>
      pendingSyncRecords(
        (await everything()).filter(
          (record) =>
            ownerUserId === null || record.ownerUserId === ownerUserId,
        ),
      ),

    countAnonymous: async () =>
      liveRecords(await everything()).filter(
        (record) => record.ownerUserId === null,
      ).length,

    // Canon's `adoptAnonymousData` fetches on `ownerUserId == nil` WITHOUT
    // excluding tombstones: a deleted-but-unpushed row still has to be pushed
    // under the new owner, or the deletion is lost at sign-in.
    adoptAnonymous: (ownerUserId, nowMillis) =>
      rewriteAll<EndeavorRecord>(provider, store, (record) =>
        record.ownerUserId === null
          ? {
              ...record,
              ownerUserId,
              updatedAtEpochMillis: nowMillis,
              lastSyncedAtEpochMillis: null,
            }
          : null,
      ),
  }
}

// MARK: - Projects

export const makeIndexedDbProjectStore = (
  provider: DatabaseProvider,
): ProjectStore => {
  const store = KroObjectStore.projects
  const everything = () => readAll<ProjectRecord>(provider, store)

  return {
    all: async () => liveRecords(await everything()),
    allIncludingRemoved: everything,
    get: async (id) => {
      const record = await readOne<ProjectRecord>(provider, store, id)
      return record === undefined || isRecordSoftDeleted(record) ? null : record
    },
    put: (record) =>
      write(provider, store, (transaction) => {
        transaction.objectStore(store).put(record)
      }),
    remove: (id) =>
      write(provider, store, (transaction) => {
        transaction.objectStore(store).delete(id)
      }),
    clear: () =>
      write(provider, store, (transaction) => {
        transaction.objectStore(store).clear()
      }),
    softDelete: async (id, nowMillis) => {
      const database = await provider()
      const transaction = database.transaction(store, 'readwrite')
      const table = transaction.objectStore(store)
      const record = await idbRequest<ProjectRecord | undefined>(
        table.get(id) as IDBRequest<ProjectRecord | undefined>,
      )
      if (record !== undefined) {
        table.put(markRecordSoftDeleted(record, nowMillis))
      }
      await idbTransactionDone(transaction)
    },
    markSynced: async (id, atMillis) => {
      const database = await provider()
      const transaction = database.transaction(store, 'readwrite')
      const table = transaction.objectStore(store)
      const record = await idbRequest<ProjectRecord | undefined>(
        table.get(id) as IDBRequest<ProjectRecord | undefined>,
      )
      if (record !== undefined) {
        table.put(markRecordSynced(record, atMillis))
      }
      await idbTransactionDone(transaction)
    },
    pendingSync: async () => pendingSyncRecords(await everything()),
  }
}

// MARK: - Child rows (defers, performances)

/**
 * Both child stores are the same store with a different key function, so they
 * are built once. The key is `record`'s canon match tuple — see
 * `deferRecordKey` for why that, rather than a synthetic id, is the identity.
 */
const makeIndexedDbChildStore = <
  Record extends {
    readonly endeavorId: string
    readonly serverId: string | null
    readonly pendingDeletion: boolean
    readonly updatedAtEpochMillis: EpochMillis
    readonly lastSyncedAtEpochMillis: EpochMillis | null
  },
>(
  provider: DatabaseProvider,
  storeName: string,
  keyOf: (record: Record) => string,
) => ({
  forEndeavor: async (endeavorId: string) =>
    livingChildRecords(
      await readByIndex<Record>(provider, storeName, 'endeavorId', endeavorId),
    ),

  forEndeavorIncludingRemoved: (endeavorId: string) =>
    readByIndex<Record>(provider, storeName, 'endeavorId', endeavorId),

  all: async () =>
    livingChildRecords(await readAll<Record>(provider, storeName)),

  put: (record: Record) =>
    write(provider, storeName, (transaction) => {
      transaction.objectStore(storeName).put(record, keyOf(record))
    }),

  /**
   * `removeLocal…` — canon's rule exactly: a never-synced row is hard-deleted
   * immediately (the server has never heard of it, so there is nothing to
   * retry), while a synced row is flagged and marked dirty so the next push
   * attempts the remote DELETE.
   */
  removeLocal: async (record: Record, nowMillis: EpochMillis) => {
    const key = keyOf(record)
    await write(provider, storeName, (transaction) => {
      const table = transaction.objectStore(storeName)
      if (record.serverId === null) {
        table.delete(key)
      } else {
        table.put(
          {
            ...record,
            pendingDeletion: true,
            updatedAtEpochMillis: nowMillis,
            lastSyncedAtEpochMillis: null,
          },
          key,
        )
      }
    })
    return record.serverId
  },

  confirmRemoved: (record: Record) =>
    write(provider, storeName, (transaction) => {
      transaction.objectStore(storeName).delete(keyOf(record))
    }),

  pendingSync: async () =>
    pendingSyncChildRecords(await readAll<Record>(provider, storeName)),

  clear: () =>
    write(provider, storeName, (transaction) => {
      transaction.objectStore(storeName).clear()
    }),
})

export const makeIndexedDbDeferStore = (
  provider: DatabaseProvider,
): DeferStore =>
  makeIndexedDbChildStore<DeferRecord>(
    provider,
    KroObjectStore.defers,
    deferRecordKey,
  )

export const makeIndexedDbPerformanceStore = (
  provider: DatabaseProvider,
): PerformanceStore =>
  makeIndexedDbChildStore<PerformanceRecord>(
    provider,
    KroObjectStore.performances,
    performanceRecordKey,
  )

// MARK: - User profile

export const makeIndexedDbUserProfileStore = (
  provider: DatabaseProvider,
): UserProfileStore => {
  const store = KroObjectStore.userProfiles
  return {
    get: async (id) =>
      (await readOne<UserProfileRecord>(provider, store, id)) ?? null,
    // At most one profile is cached at a time — the signed-in user's. `current`
    // exists so a caller that does not yet know the id (app launch, before the
    // session is restored) can still read it.
    current: async () =>
      (await readAll<UserProfileRecord>(provider, store))[0] ?? null,
    put: (record) =>
      write(provider, store, (transaction) => {
        transaction.objectStore(store).put(record)
      }),
    remove: (id) =>
      write(provider, store, (transaction) => {
        transaction.objectStore(store).delete(id)
      }),
    clear: () =>
      write(provider, store, (transaction) => {
        transaction.objectStore(store).clear()
      }),
  }
}

// MARK: - Lens snapshots

/** One row per vista — canon keeps one JSON file per vista id. */
interface LensSnapshotRow {
  readonly vistaId: string
  readonly record: Readonly<Record<string, unknown>>
}

export const makeIndexedDbLensSnapshotStore = (
  provider: DatabaseProvider,
): LensSnapshotStore => {
  const store = KroObjectStore.lensSnapshots
  return {
    /**
     * A row that will not decode answers `null` and is **left in place** —
     * canon's behaviour: *"Persistence failure is non-fatal: the user's filter
     * UI still works for the current session."* The surface falls back to its
     * default lens and the next successful write overwrites the bad row.
     */
    read: async (vistaId) => {
      const row = await readOne<LensSnapshotRow>(provider, store, vistaId)
      if (row === undefined) return null
      return decodeLensSnapshot(row.record)?.snapshot ?? null
    },
    write: (vistaId, snapshot: EndeavorsLensSnapshot) =>
      write(provider, store, (transaction) => {
        transaction
          .objectStore(store)
          .put({ vistaId, record: encodeLensSnapshot(snapshot) })
      }),
    clear: (vistaId) =>
      write(provider, store, (transaction) => {
        transaction.objectStore(store).delete(vistaId)
      }),
    clearAll: () =>
      write(provider, store, (transaction) => {
        transaction.objectStore(store).clear()
      }),
  }
}
