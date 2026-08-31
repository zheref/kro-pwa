import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '../../../library/result'
import { endeavorFromRecord } from '../../EndeavorRecord'
import { isQuickCompleteRecord } from '../../PerformanceRecord'
import {
  allEndeavorRecordMocks,
  deferRecordMocks,
  endeavorRecordMocks,
  performanceRecordMocks,
  projectRecordMocks,
  userProfileRecordMocks,
} from '../PersistenceRecords.mocks'
import {
  isRecordDirty,
  isRecordSoftDeleted,
  liveRecords,
  livingChildRecords,
  pendingSyncRecords,
} from '../../SyncBookkeeping'

describe('the endeavor-row spread — RC-13`s convenient / neutral / inconvenient', () => {
  it('ships at least seven variants', () => {
    expect(allEndeavorRecordMocks.length).toBeGreaterThanOrEqual(7)
  })

  it('gives every fixture a distinct id, so a store keyed by id holds them all', () => {
    const ids = new Set(allEndeavorRecordMocks.map((record) => record.id))
    expect(ids.size).toBe(allEndeavorRecordMocks.length)
  })

  it('includes a clean, synced row', () => {
    expect(isRecordDirty(endeavorRecordMocks.syncedEvent)).toBe(false)
  })

  it('includes a never-synced row, which is dirty by definition', () => {
    expect(isRecordDirty(endeavorRecordMocks.plannedTask)).toBe(true)
  })

  it('includes a STALE row — dirty by watermark, not by a null confirmation', () => {
    expect(
      endeavorRecordMocks.staleTourist.lastSyncedAtEpochMillis,
    ).not.toBeNull()
    expect(isRecordDirty(endeavorRecordMocks.staleTourist)).toBe(true)
  })

  it('includes exactly one tombstone, which the live query drops', () => {
    expect(allEndeavorRecordMocks.filter(isRecordSoftDeleted)).toHaveLength(1)
    expect(liveRecords(allEndeavorRecordMocks)).toHaveLength(
      allEndeavorRecordMocks.length - 1,
    )
  })

  it('includes a row that fails to decode — the one a sweep must skip', () => {
    expect(isErr(endeavorFromRecord(endeavorRecordMocks.unknownKind))).toBe(
      true,
    )
  })

  it('leaves every OTHER fixture decodable', () => {
    const decodable = allEndeavorRecordMocks.filter((record) =>
      isOk(endeavorFromRecord(record)),
    )
    expect(decodable).toHaveLength(allEndeavorRecordMocks.length - 1)
  })

  it('is derived from #7`s fixtures, so ids match the domain spread', () => {
    expect(endeavorRecordMocks.plannedTask.id).toBe('endeavor-planned-task')
    expect(endeavorRecordMocks.plannedTask.title).toBe('Pay Mortgage')
  })

  it('carries an owned row and an anonymous one', () => {
    expect(endeavorRecordMocks.plannedTask.ownerUserId).toBe('user-ada')
    expect(endeavorRecordMocks.bareDraft.ownerUserId).toBeNull()
  })

  it('answers a pending-sync set that excludes the tombstone', () => {
    const pending = pendingSyncRecords(allEndeavorRecordMocks)
    expect(pending.some(isRecordSoftDeleted)).toBe(false)
  })
})

describe('the child-row spreads', () => {
  const defers = Object.values(deferRecordMocks)
  const performances = Object.values(performanceRecordMocks)

  it('the defer spread covers never-synced, synced, pending and legacy', () => {
    expect(defers).toHaveLength(4)
  })

  it('exactly one defer is awaiting its remote DELETE', () => {
    expect(livingChildRecords(defers)).toHaveLength(defers.length - 1)
  })

  it('the legacy defer has no target — the state only the row can hold', () => {
    expect(deferRecordMocks.noTarget.target).toBeNull()
  })

  it('the performance spread covers both quick-complete encodings', () => {
    expect(isQuickCompleteRecord(performanceRecordMocks.webQuickComplete)).toBe(
      true,
    )
    expect(
      isQuickCompleteRecord(performanceRecordMocks.appleQuickComplete),
    ).toBe(true)
  })

  it('the fragment-bearing performance really carries fragments', () => {
    expect(performanceRecordMocks.withFragments.sessionFragmentsJson).not.toBe(
      '[]',
    )
  })

  it('exactly one performance is awaiting its remote DELETE', () => {
    expect(livingChildRecords(performances)).toHaveLength(
      performances.length - 1,
    )
  })
})

describe('the project and profile spreads', () => {
  it('covers a user owner, a group owner and a tombstone', () => {
    expect(projectRecordMocks.finances.ownerUserId).toBe('user-ada')
    expect(projectRecordMocks.shared.ownerGroupId).toBe('group-home')
    expect(isRecordSoftDeleted(projectRecordMocks.archived)).toBe(true)
  })

  it('covers a current profile and a legacy one with no loginKind', () => {
    expect(userProfileRecordMocks.typical.loginKind).not.toBeNull()
    expect(userProfileRecordMocks.legacyNoLoginKind.loginKind).toBeNull()
  })

  it('gives the two profiles distinct ids', () => {
    expect(userProfileRecordMocks.typical.id).not.toBe(
      userProfileRecordMocks.legacyNoLoginKind.id,
    )
  })
})
