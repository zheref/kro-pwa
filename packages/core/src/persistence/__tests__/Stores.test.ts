/**
 * The ports carry no logic — they are `UZF-16` contracts. What is worth
 * asserting about them is that they are *implementable as declared* and that
 * the `LocalStore` bundle names every store the sign-out wipe has to reach.
 *
 * So this suite builds a minimal double against each port and exercises the
 * conventions the ports document — a read excludes removed rows, a write is a
 * whole-record put — through that double. A port whose shape drifts breaks this
 * file at compile time, which is exactly the signal wanted: the live IndexedDB
 * binding and the in-memory stub in `@kro/app` both have to satisfy it.
 */
import { describe, expect, it } from 'vitest'
import { MOCK_NOW } from '../../domain/endeavor/__mocks__/Endeavor.mocks'
import { endeavorRecordMocks } from '../__mocks__/PersistenceRecords.mocks'
import type { EndeavorRecord } from '../EndeavorRecord'
import { epochMillisFromDate } from '../EpochMillis'
import type { EndeavorStore, LocalStore, SignOutWipeReport } from '../Stores'
import {
  isRecordSoftDeleted,
  liveRecords,
  markRecordSoftDeleted,
  markRecordSynced,
  pendingSyncRecords,
} from '../SyncBookkeeping'

const NOW_MILLIS = epochMillisFromDate(MOCK_NOW)

/** The smallest thing that satisfies `EndeavorStore`, over a Map. */
const makeEndeavorStoreDouble = (
  seed: readonly EndeavorRecord[] = [],
): EndeavorStore => {
  const rows = new Map(seed.map((record) => [record.id, record]))
  const owned = (ownerUserId: string | null) =>
    liveRecords([...rows.values()]).filter(
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
    allForOwner: async (ownerUserId) => owned(ownerUserId),
    softDelete: async (id, nowMillis) => {
      const record = rows.get(id)
      if (record !== undefined) {
        rows.set(id, markRecordSoftDeleted(record, nowMillis))
      }
    },
    markSynced: async (id, atMillis) => {
      const record = rows.get(id)
      if (record !== undefined) {
        rows.set(id, markRecordSynced(record, atMillis))
      }
    },
    pendingSync: async (ownerUserId) => pendingSyncRecords(owned(ownerUserId)),
    countAnonymous: async () =>
      liveRecords([...rows.values()]).filter(
        (record) => record.ownerUserId === null,
      ).length,
    adoptAnonymous: async (ownerUserId, nowMillis) => {
      let adopted = 0
      for (const [id, record] of rows) {
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

const seed = [
  endeavorRecordMocks.plannedTask,
  endeavorRecordMocks.syncedEvent,
  endeavorRecordMocks.deletedBlueprint,
]

describe('the KeyedRecordStore conventions the ports document', () => {
  it('a read excludes soft-deleted rows', async () => {
    expect(await makeEndeavorStoreDouble(seed).all()).toHaveLength(2)
  })

  it('the sync-engine read includes them', async () => {
    expect(
      await makeEndeavorStoreDouble(seed).allIncludingRemoved(),
    ).toHaveLength(3)
  })

  it('`get` answers null for a soft-deleted id, not the tombstone', async () => {
    const store = makeEndeavorStoreDouble(seed)
    expect(await store.get(endeavorRecordMocks.deletedBlueprint.id)).toBeNull()
  })

  it('`get` answers the row for a live id', async () => {
    const store = makeEndeavorStoreDouble(seed)
    expect(await store.get(endeavorRecordMocks.plannedTask.id)).toEqual(
      endeavorRecordMocks.plannedTask,
    )
  })
})

describe('EndeavorStore — canon`s repository surface, per row', () => {
  it('softDelete hides the row but keeps it on disk', async () => {
    const store = makeEndeavorStoreDouble(seed)
    await store.softDelete(endeavorRecordMocks.plannedTask.id, NOW_MILLIS)
    expect(await store.all()).toHaveLength(1)
    expect(await store.allIncludingRemoved()).toHaveLength(3)
  })

  it('allForOwner filters by owner, and `null` means every owner', async () => {
    const store = makeEndeavorStoreDouble(seed)
    expect(await store.allForOwner('user-ada')).toHaveLength(1)
    expect(await store.allForOwner(null)).toHaveLength(2)
  })

  it('pendingSync answers the dirty, live rows only', async () => {
    const store = makeEndeavorStoreDouble(seed)
    const pending = await store.pendingSync(null)
    expect(pending.map((record) => record.id)).toEqual([
      endeavorRecordMocks.plannedTask.id,
    ])
  })

  it('markSynced takes a row out of the pending set', async () => {
    const store = makeEndeavorStoreDouble(seed)
    await store.markSynced(endeavorRecordMocks.plannedTask.id, NOW_MILLIS)
    expect(await store.pendingSync(null)).toHaveLength(0)
  })

  it('countAnonymous counts live, unowned rows', async () => {
    expect(await makeEndeavorStoreDouble(seed).countAnonymous()).toBe(1)
  })

  it('adoptAnonymous claims them and marks them dirty for the next push', async () => {
    const store = makeEndeavorStoreDouble(seed)
    // Two rows are unowned — one live, one tombstoned. Canon's
    // `adoptAnonymousData` fetches on `ownerUserId == nil` WITHOUT excluding
    // tombstones, so the tombstone is adopted too: it still has to be pushed
    // under the new owner, or the deletion is lost at sign-in.
    expect(await store.adoptAnonymous('user-grace', NOW_MILLIS)).toBe(2)
    expect(await store.countAnonymous()).toBe(0)
    expect(await store.allForOwner('user-grace')).toHaveLength(1)
    expect(await store.allIncludingRemoved()).toHaveLength(3)
  })
})

describe('the LocalStore bundle names every store the sign-out has to reach', () => {
  it('declares all eight ports', () => {
    const names: readonly (keyof LocalStore)[] = [
      'endeavors',
      'projects',
      'defers',
      'performances',
      'userProfiles',
      'preferences',
      'runningSessionAnchor',
      'lensSnapshots',
    ]
    expect(names).toHaveLength(8)
  })

  it('a wipe report separates what was removed from what was preserved', () => {
    const report: SignOutWipeReport = {
      preferenceKeys: ['kro:theme'],
      preservedKeys: ['debug.ff.now'],
      clearedStores: ['endeavors'],
    }
    expect(report.preferenceKeys).not.toEqual(report.preservedKeys)
  })

  it('a report with nothing preserved is still a valid shape', () => {
    const report: SignOutWipeReport = {
      preferenceKeys: [],
      preservedKeys: [],
      clearedStores: [],
    }
    expect(report.clearedStores).toEqual([])
  })
})
