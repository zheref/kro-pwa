/**
 * What only the **live** binding can be asked: that the rows really are in
 * IndexedDB, under the keys the schema says, and that they survive a close and
 * a re-open.
 *
 * The behavioural rules the two implementations share are asserted once, in
 * `LocalStoreContract.test.ts`. Nothing here duplicates them.
 */
import type { LocalStore } from '@kro/core'
import {
  MOCK_RECORD_NOW_MILLIS,
  deferRecordMocks,
  endeavorRecordMocks,
  performanceRecordMocks,
} from '@kro/core/mocks'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { KroObjectStore, idbRequest, openKroDatabase } from '../KroDatabase'
import { makeLiveLocalStore } from '../liveLocalStore'
import { makeMemoryWebStorage } from '../WebStorageStores'
import { deferRecordKey, performanceRecordKey } from '@kro/core'

let counter = 0
let factory: IDBFactory
let databaseName: string
let store: LocalStore

beforeEach(() => {
  counter += 1
  factory = new IDBFactory()
  databaseName = `kro-idb-${counter}`
  store = makeLiveLocalStore({
    indexedDB: factory,
    webStorage: makeMemoryWebStorage(),
    databaseName,
  })
})

/** Read a row straight out of the object store, bypassing the port. */
const rawGet = async <Value>(
  storeName: string,
  key: IDBValidKey,
): Promise<Value | undefined> => {
  const database = await openKroDatabase(factory, { name: databaseName })
  const transaction = database.transaction(storeName)
  const row = await idbRequest<Value | undefined>(
    transaction.objectStore(storeName).get(key) as IDBRequest<
      Value | undefined
    >,
  )
  database.close()
  return row
}

describe('rows land in the object store the schema declares', () => {
  it('keys an endeavor by its `id`, as canon`s unique attribute does', async () => {
    await store.endeavors.put(endeavorRecordMocks.plannedTask)
    expect(
      await rawGet(
        KroObjectStore.endeavors,
        endeavorRecordMocks.plannedTask.id,
      ),
    ).toMatchObject({ id: endeavorRecordMocks.plannedTask.id })
  })

  it('keys a defer by its canon match tuple, not by an invented id', async () => {
    await store.defers.put(deferRecordMocks.neverSynced)
    expect(
      await rawGet(
        KroObjectStore.defers,
        deferRecordKey(deferRecordMocks.neverSynced),
      ),
    ).toMatchObject({ endeavorId: deferRecordMocks.neverSynced.endeavorId })
  })

  it('keys a performance by its nine-field match tuple', async () => {
    await store.performances.put(performanceRecordMocks.withFragments)
    expect(
      await rawGet(
        KroObjectStore.performances,
        performanceRecordKey(performanceRecordMocks.withFragments),
      ),
    ).toMatchObject({ serverId: 'performance-server-1' })
  })
})

describe('durability across a close and a re-open — the reload case', () => {
  it('an endeavor written before a reload is still there afterwards', async () => {
    await store.endeavors.put(endeavorRecordMocks.plannedTask)

    // A new store instance over the same factory is what a reload looks like:
    // fresh closures, fresh memo, same origin storage.
    const afterReload = makeLiveLocalStore({
      indexedDB: factory,
      webStorage: makeMemoryWebStorage(),
      databaseName,
    })
    expect(await afterReload.endeavors.all()).toHaveLength(1)
  })

  it('a tombstone survives the reload as a tombstone, not as a deletion', async () => {
    await store.endeavors.put(endeavorRecordMocks.plannedTask)
    await store.endeavors.softDelete(
      endeavorRecordMocks.plannedTask.id,
      MOCK_RECORD_NOW_MILLIS,
    )

    const afterReload = makeLiveLocalStore({
      indexedDB: factory,
      webStorage: makeMemoryWebStorage(),
      databaseName,
    })
    expect(await afterReload.endeavors.all()).toHaveLength(0)
    expect(await afterReload.endeavors.allIncludingRemoved()).toHaveLength(1)
  })

  it('Date columns come back as real Dates, not as strings', async () => {
    // IndexedDB stores by structured clone, so a Date is a Date on the way
    // back. That is why the record type keeps `Date` rather than an ISO string.
    await store.endeavors.put(endeavorRecordMocks.plannedTask)
    const restored = await store.endeavors.get(
      endeavorRecordMocks.plannedTask.id,
    )
    expect(restored?.createdAt).toBeInstanceOf(Date)
    expect(restored?.createdAt).toEqual(
      endeavorRecordMocks.plannedTask.createdAt,
    )
  })
})

describe('the endeavorId index the child reads use', () => {
  it('answers only the rows of the endeavor asked for', async () => {
    await store.defers.put(deferRecordMocks.neverSynced)
    await store.defers.put({
      ...deferRecordMocks.neverSynced,
      endeavorId: 'endeavor-other',
    })
    expect(
      await store.defers.forEndeavor(deferRecordMocks.neverSynced.endeavorId),
    ).toHaveLength(1)
  })

  it('answers an empty list for an endeavor with no child rows', async () => {
    expect(await store.defers.forEndeavor('endeavor-lonely')).toEqual([])
  })

  it('does not hide a row whose optional columns are null', async () => {
    // An IndexedDB index omits records whose indexed value is undefined, which
    // is why `endeavorId` (never null) is indexed and `ownerUserId` is not.
    await store.defers.put(deferRecordMocks.noTarget)
    expect(
      await store.defers.forEndeavor(deferRecordMocks.noTarget.endeavorId),
    ).toHaveLength(1)
  })
})

describe('concurrency — the transaction-per-operation shape', () => {
  it('survives a burst of parallel writes without losing one', async () => {
    await Promise.all(
      Object.values(endeavorRecordMocks).map((record) =>
        store.endeavors.put(record),
      ),
    )
    expect(await store.endeavors.allIncludingRemoved()).toHaveLength(
      Object.values(endeavorRecordMocks).length,
    )
  })

  it('serves parallel reads from the one memoised database handle', async () => {
    await store.endeavors.put(endeavorRecordMocks.plannedTask)
    const [first, second, third] = await Promise.all([
      store.endeavors.all(),
      store.endeavors.all(),
      store.endeavors.all(),
    ])
    expect(first).toHaveLength(1)
    expect(second).toHaveLength(1)
    expect(third).toHaveLength(1)
  })

  it('leaves a clear-then-write in the order it was issued', async () => {
    await store.endeavors.put(endeavorRecordMocks.plannedTask)
    await store.endeavors.clear()
    await store.endeavors.put(endeavorRecordMocks.syncedEvent)
    const rows = await store.endeavors.all()
    expect(rows.map((record) => record.id)).toEqual([
      endeavorRecordMocks.syncedEvent.id,
    ])
  })
})
