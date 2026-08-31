import { describe, expect, it } from 'vitest'
import { makeDefer } from '../../domain/endeavor/Defer'
import { allDeferMocks } from '../../domain/endeavor/__mocks__/EndeavorRelations.mocks'
import { MOCK_NOW } from '../../domain/endeavor/__mocks__/Endeavor.mocks'
import {
  deferFromRecord,
  deferRecordFromDefer,
  deferRecordKey,
} from '../DeferRecord'
import { epochMillisFromDate } from '../EpochMillis'
import { isRecordDirty } from '../SyncBookkeeping'

const NOW_MILLIS = epochMillisFromDate(MOCK_NOW)

const recordFor = (
  value: (typeof allDeferMocks)[number],
  overrides: Parameters<typeof deferRecordFromDefer>[1] = {
    endeavorId: 'endeavor-1',
    now: MOCK_NOW,
    nowMillis: NOW_MILLIS,
  },
) => deferRecordFromDefer(value, overrides)

describe('defer round-trip — every #7 fixture, both directions', () => {
  it.each(allDeferMocks.map((mock, index) => [index, mock] as const))(
    'restores fixture %i field for field',
    (_index, value) => {
      expect(deferFromRecord(recordFor(value))).toEqual(value)
    },
  )

  it('carries a reason through, and a null reason as null', () => {
    const withReason = makeDefer({
      made: MOCK_NOW,
      reason: 'Office closed',
      target: MOCK_NOW,
    })
    expect(deferFromRecord(recordFor(withReason)).reason).toBe('Office closed')
    expect(
      deferFromRecord(
        recordFor(makeDefer({ made: MOCK_NOW, target: MOCK_NOW })),
      ).reason,
    ).toBeNull()
  })

  it('hydrates a legacy row with NO target as `target ?? made`, per canon', () => {
    const legacy = {
      ...recordFor(makeDefer({ made: MOCK_NOW, target: MOCK_NOW })),
      target: null,
    }
    expect(deferFromRecord(legacy).target).toEqual(legacy.made)
  })
})

describe('deferRecordFromDefer — the watermarks a write stamps', () => {
  const value = makeDefer({ made: MOCK_NOW, target: MOCK_NOW })

  it('leaves a local write unsynced, therefore dirty', () => {
    const record = recordFor(value)
    expect(record.serverId).toBeNull()
    expect(isRecordDirty(record)).toBe(true)
  })

  it('is clean once a serverId and a confirmation are stamped', () => {
    const record = deferRecordFromDefer(value, {
      endeavorId: 'endeavor-1',
      now: MOCK_NOW,
      nowMillis: NOW_MILLIS,
      serverId: 'defer-1',
      lastSyncedAtEpochMillis: NOW_MILLIS,
    })
    expect(isRecordDirty(record)).toBe(false)
  })

  it('defaults pendingDeletion to false — a new row is not a removal', () => {
    expect(recordFor(value).pendingDeletion).toBe(false)
  })
})

describe('deferRecordKey — canon`s upsert match tuple, as a key', () => {
  const base = makeDefer({
    made: new Date(2026, 0, 10, 9, 0, 0),
    reason: 'Office closed',
    target: new Date(2026, 0, 12, 9, 0, 0),
  })

  it('gives one key to two rows differing ONLY in reason — so put updates', () => {
    const first = recordFor(base)
    const second = recordFor({ ...base, reason: 'Courier delayed' })
    expect(deferRecordKey(first)).toBe(deferRecordKey(second))
  })

  it('gives different keys to two deferrals made at different moments', () => {
    const later = recordFor({ ...base, made: new Date(2026, 0, 11, 9, 0, 0) })
    expect(deferRecordKey(recordFor(base))).not.toBe(deferRecordKey(later))
  })

  it('gives different keys to two deferrals pointing at different targets', () => {
    const elsewhere = recordFor({
      ...base,
      target: new Date(2026, 0, 13, 9, 0, 0),
    })
    expect(deferRecordKey(recordFor(base))).not.toBe(deferRecordKey(elsewhere))
  })

  it('separates the same deferral on two different endeavors', () => {
    const other = deferRecordFromDefer(base, {
      endeavorId: 'endeavor-2',
      now: MOCK_NOW,
      nowMillis: NOW_MILLIS,
    })
    expect(deferRecordKey(recordFor(base))).not.toBe(deferRecordKey(other))
  })

  it('does not collide when an endeavor id contains the separator character', () => {
    // An id mirrored from an external provider is opaque. A `join('|')` key
    // would let these two rows overwrite each other.
    const left = deferRecordFromDefer(base, {
      endeavorId: 'a",1,null]',
      now: MOCK_NOW,
      nowMillis: NOW_MILLIS,
    })
    const right = deferRecordFromDefer(base, {
      endeavorId: 'a',
      now: MOCK_NOW,
      nowMillis: NOW_MILLIS,
    })
    expect(deferRecordKey(left)).not.toBe(deferRecordKey(right))
  })

  it('is stable across two calls on the same row', () => {
    const record = recordFor(base)
    expect(deferRecordKey(record)).toBe(deferRecordKey(record))
  })
})
