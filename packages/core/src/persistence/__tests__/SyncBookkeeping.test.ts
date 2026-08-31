import { describe, expect, it } from 'vitest'
import {
  dirtyRecords,
  isRecordDirty,
  isRecordSoftDeleted,
  lastWriteWins,
  liveRecords,
  livingChildRecords,
  markRecordDirty,
  markRecordSoftDeleted,
  markRecordSynced,
  pendingSyncChildRecords,
  pendingSyncRecords,
} from '../SyncBookkeeping'

const NOW = 1_768_467_600_000
const HOUR = 3_600_000

const watermarks = (updated: number, lastSynced: number | null) => ({
  updatedAtEpochMillis: updated,
  lastSyncedAtEpochMillis: lastSynced,
})

const row = (
  updated: number,
  lastSynced: number | null,
  deleted: number | null = null,
) => ({ ...watermarks(updated, lastSynced), deletedAtEpochMillis: deleted })

describe('isDirty — the truth table, exactly as canon derives it', () => {
  it('a never-synced row is dirty (a task created offline this morning)', () => {
    expect(isRecordDirty(watermarks(NOW, null))).toBe(true)
  })

  it('a row written after its last confirmation is dirty (edited on the train)', () => {
    expect(isRecordDirty(watermarks(NOW, NOW - HOUR))).toBe(true)
  })

  it('a row confirmed in the same millisecond it was written is CLEAN', () => {
    // Strictly greater-than, per canon. `>=` here would make every synced row
    // permanently dirty and the push sweep would never converge.
    expect(isRecordDirty(watermarks(NOW, NOW))).toBe(false)
  })

  it('a row confirmed AFTER its last write is clean (a pull overwrote it)', () => {
    expect(isRecordDirty(watermarks(NOW - HOUR, NOW))).toBe(false)
  })

  it('a row confirmed one millisecond before its write is dirty', () => {
    expect(isRecordDirty(watermarks(NOW, NOW - 1))).toBe(true)
  })
})

describe('isRecordSoftDeleted — a tombstone is a value, not an absence', () => {
  it('is false for a live row', () => {
    expect(isRecordSoftDeleted(row(NOW, NOW))).toBe(false)
  })

  it('is true once the tombstone is stamped', () => {
    expect(isRecordSoftDeleted(row(NOW, NOW, NOW))).toBe(true)
  })

  it('treats a zero tombstone as deleted, not as absent', () => {
    // 1970 is a real (if unlikely) instant; `deletedAtEpochMillis === 0` must
    // not be read as falsy-therefore-alive.
    expect(isRecordSoftDeleted(row(NOW, NOW, 0))).toBe(true)
  })
})

describe('markRecordDirty — canon clears the confirmation, it does not only bump', () => {
  it('stamps the write and drops the last confirmation', () => {
    const next = markRecordDirty(watermarks(NOW - HOUR, NOW - HOUR), NOW)
    expect(next).toEqual(watermarks(NOW, null))
  })

  it('makes the row dirty even when the clock ran backwards', () => {
    // A device whose clock stepped back would still look clean under a
    // `updated > lastSynced` comparison alone.
    const next = markRecordDirty(watermarks(NOW, NOW), NOW - HOUR)
    expect(isRecordDirty(next)).toBe(true)
  })

  it('returns a new object rather than mutating the row', () => {
    const original = watermarks(NOW, NOW)
    markRecordDirty(original, NOW + HOUR)
    expect(original.lastSyncedAtEpochMillis).toBe(NOW)
  })
})

describe('markRecordSynced / markRecordSoftDeleted', () => {
  it('a confirmation makes a dirty row clean', () => {
    expect(isRecordDirty(markRecordSynced(watermarks(NOW, null), NOW))).toBe(
      false,
    )
  })

  it('a soft delete stamps the tombstone AND marks the row dirty', () => {
    const next = markRecordSoftDeleted(row(NOW - HOUR, NOW - HOUR), NOW)
    expect(next.deletedAtEpochMillis).toBe(NOW)
    expect(next.updatedAtEpochMillis).toBe(NOW)
    expect(isRecordDirty(next)).toBe(true)
  })

  it('leaves the rest of the row untouched', () => {
    const original = { ...row(NOW, NOW), id: 'endeavor-1', title: 'Pay rent' }
    expect(markRecordSoftDeleted(original, NOW).title).toBe('Pay rent')
  })
})

describe('liveRecords — acceptance criterion 2, in one predicate', () => {
  const rows = [row(NOW, NOW), row(NOW, NOW, NOW), row(NOW, null)]

  it('excludes soft-deleted rows from a normal query', () => {
    expect(liveRecords(rows)).toHaveLength(2)
  })

  it('retains the tombstone on disk — the row is filtered, never removed', () => {
    expect(rows).toHaveLength(3)
  })

  it('returns everything when nothing is deleted', () => {
    expect(liveRecords([row(NOW, NOW)])).toHaveLength(1)
  })

  it('returns nothing when everything is deleted', () => {
    expect(liveRecords([row(NOW, NOW, NOW)])).toHaveLength(0)
  })
})

describe('livingChildRecords — the child rows use a flag, not a tombstone', () => {
  const children = [
    { ...watermarks(NOW, NOW), pendingDeletion: false },
    { ...watermarks(NOW, NOW), pendingDeletion: true },
  ]

  it('excludes a row awaiting its remote DELETE', () => {
    expect(livingChildRecords(children)).toHaveLength(1)
  })

  it('keeps the pending row on disk so the delete can be retried', () => {
    expect(children).toHaveLength(2)
  })

  it('is a no-op when nothing is pending', () => {
    expect(livingChildRecords([children[0] as (typeof children)[0]])).toEqual([
      children[0],
    ])
  })
})

describe('the two push predicates, and the canon inconsistency between them', () => {
  const rows = [
    row(NOW, NOW), // clean
    row(NOW, null), // dirty, live
    row(NOW, null, NOW), // dirty, tombstoned
  ]

  it('pendingSyncRecords ports canon`s STATED predicate: live AND dirty', () => {
    expect(pendingSyncRecords(rows)).toEqual([rows[1]])
  })

  it('dirtyRecords includes the tombstone canon`s softDelete meant to push', () => {
    expect(dirtyRecords(rows)).toEqual([rows[1], rows[2]])
  })

  it('the two disagree on exactly the tombstone — the seam #31 must rule on', () => {
    expect(dirtyRecords(rows).length - pendingSyncRecords(rows).length).toBe(1)
  })
})

describe('pendingSyncChildRecords — pendingDeletion OR never pushed', () => {
  const children = [
    { ...watermarks(NOW, NOW), pendingDeletion: false, serverId: 'a' },
    { ...watermarks(NOW, null), pendingDeletion: false, serverId: null },
    { ...watermarks(NOW, NOW), pendingDeletion: true, serverId: 'c' },
  ]

  it('sends a row that has never been pushed', () => {
    expect(pendingSyncChildRecords(children)).toContain(children[1])
  })

  it('sends a row whose remote DELETE is still owed', () => {
    expect(pendingSyncChildRecords(children)).toContain(children[2])
  })

  it('leaves a synced, present row alone', () => {
    expect(pendingSyncChildRecords(children)).not.toContain(children[0])
  })
})

describe('lastWriteWins — and what a tie means', () => {
  it('the newer local edit wins over an older server copy', () => {
    const local = watermarks(NOW, null)
    const remote = watermarks(NOW - HOUR, NOW - HOUR)
    expect(lastWriteWins(local, remote)).toBe(local)
  })

  it('the newer server copy wins over an older local edit', () => {
    const local = watermarks(NOW - HOUR, null)
    const remote = watermarks(NOW, NOW)
    expect(lastWriteWins(local, remote)).toBe(remote)
  })

  it('a TIE resolves to the server — canon: cloud is authoritative after a pull', () => {
    const local = watermarks(NOW, null)
    const remote = watermarks(NOW, NOW)
    expect(lastWriteWins(local, remote)).toBe(remote)
  })
})
