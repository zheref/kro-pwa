import { describe, expect, it } from 'vitest'
import {
  MOCK_NOW,
  allEndeavorMocks,
  endeavorMocks,
} from '../../domain/endeavor/__mocks__/Endeavor.mocks'
import { allPerformMocks } from '../../domain/endeavor/__mocks__/EndeavorRelations.mocks'
import { EndeavorKind } from '../../domain/endeavor/EndeavorKind'
import { EndeavorStatus } from '../../domain/endeavor/EndeavorStatus'
import { isErr, isOk } from '../../library/result'
import {
  endeavorFromRecord,
  endeavorRecordFromEndeavor,
  ownerFromRecord,
} from '../EndeavorRecord'
import { epochMillisFromDate } from '../EpochMillis'

const roundTrip = (endeavor: (typeof allEndeavorMocks)[number]) => {
  const record = endeavorRecordFromEndeavor(endeavor, { now: MOCK_NOW })
  const decoded = endeavorFromRecord(record, {
    defers: endeavor.defers,
    performances: endeavor.performances,
  })
  if (!decoded.ok) throw new Error(`round-trip failed: ${decoded.error.kind}`)
  return decoded.value
}

describe('endeavor round-trip — lossless over every column the row carries', () => {
  it.each(allEndeavorMocks.map((mock) => [mock.id, mock] as const))(
    'restores %s field for field, transient and uncarried fields aside',
    (_id, endeavor) => {
      const restored = roundTrip(endeavor)
      expect(restored).toEqual({
        ...endeavor,
        // Columns the row does not have — see the table in EndeavorRecord.ts.
        hostedBy: [],
        list: null,
        errorMessages: [],
        inActivity: false,
        // The one lossy encoding: `[]` and `null` share the "" column.
        tags:
          endeavor.tags === null || endeavor.tags.length === 0
            ? null
            : endeavor.tags,
        // The column is non-optional; canon fills it with `Date()`.
        createdAt: endeavor.createdAt ?? MOCK_NOW,
      })
    },
  )

  it('carries every Kro-enhanced field through unchanged', () => {
    const restored = roundTrip(endeavorMocks.plannedTask)
    expect(restored.value).toBe(5)
    expect(restored.effort).toBe(3)
    expect(restored.expiry).toEqual(endeavorMocks.plannedTask.expiry)
    expect(restored.associatedColor).toBe('#4C6EF5')
    expect(restored.sessionPoints).toBe(25)
  })

  it('carries a recurrence rule through the JSON column', () => {
    expect(roundTrip(endeavorMocks.weekdayHabit).repeatConfig).toEqual(
      endeavorMocks.weekdayHabit.repeatConfig,
    )
  })

  it('carries a shadow, Apple priority 0 included', () => {
    const restored = roundTrip(endeavorMocks.overdueTouristReminder)
    expect(restored.shadows?.[0]?.appleReminderPriority).toBe(0)
  })

  it('carries an EMPTY shadow list distinguishably from no shadows', () => {
    const restored = roundTrip(endeavorMocks.completedWithPerformances)
    expect(restored.shadows).toEqual([])
    expect(roundTrip(endeavorMocks.plannedTask).shadows).toBeNull()
  })

  it('restores the relation rows the caller hydrates it with', () => {
    const endeavor = endeavorMocks.overdueTouristReminder
    const record = endeavorRecordFromEndeavor(endeavor, { now: MOCK_NOW })
    const decoded = endeavorFromRecord(record, {
      defers: endeavor.defers,
      performances: allPerformMocks,
    })
    expect(isOk(decoded) && decoded.value.defers).toEqual(endeavor.defers)
    expect(isOk(decoded) && decoded.value.performances).toEqual(allPerformMocks)
  })

  it('defaults to no relations when the caller supplies none', () => {
    const record = endeavorRecordFromEndeavor(endeavorMocks.plannedTask, {
      now: MOCK_NOW,
    })
    const decoded = endeavorFromRecord(record)
    expect(isOk(decoded) && decoded.value.defers).toEqual([])
  })
})

describe('endeavorRecordFromEndeavor — what the write direction stamps', () => {
  it('stamps the watermark from the `now` it was given, never from a clock', () => {
    const record = endeavorRecordFromEndeavor(endeavorMocks.plannedTask, {
      now: MOCK_NOW,
    })
    expect(record.updatedAtEpochMillis).toBe(epochMillisFromDate(MOCK_NOW))
  })

  it('leaves a new row unsynced and untombstoned, therefore dirty', () => {
    const record = endeavorRecordFromEndeavor(endeavorMocks.plannedTask, {
      now: MOCK_NOW,
    })
    expect(record.lastSyncedAtEpochMillis).toBeNull()
    expect(record.deletedAtEpochMillis).toBeNull()
  })

  it('stores the RESOLVED kind when the caller has one', () => {
    // Canon writes `endeavor.resolvedKind.rawValue`; resolution needs a
    // reconciliation context this tier must not reach for, so it is passed in.
    const record = endeavorRecordFromEndeavor(endeavorMocks.todayEvent, {
      now: MOCK_NOW,
      resolvedKind: EndeavorKind.habit,
    })
    expect(record.kind).toBe(EndeavorKind.habit)
  })

  it('falls back to the declared kind when no resolution is supplied', () => {
    const record = endeavorRecordFromEndeavor(endeavorMocks.todayEvent, {
      now: MOCK_NOW,
    })
    expect(record.kind).toBe(EndeavorKind.calendarEvent)
  })

  it('fills a missing createdAt with `now`, since the column is non-optional', () => {
    const record = endeavorRecordFromEndeavor(endeavorMocks.bareDraft, {
      now: MOCK_NOW,
    })
    expect(record.createdAt).toEqual(MOCK_NOW)
  })
})

describe('owner — reconstructed from the columns canon`s mapper forgets', () => {
  it('rebuilds a user owner from ownerUserId', () => {
    const record = endeavorRecordFromEndeavor(endeavorMocks.plannedTask, {
      now: MOCK_NOW,
      ownerUserId: 'user-ada',
    })
    expect(endeavorFromRecord(record)).toMatchObject({
      value: { owner: { type: 'user', userId: 'user-ada' } },
    })
  })

  it('rebuilds a group owner from ownerGroupId', () => {
    expect(
      ownerFromRecord({ ownerUserId: null, ownerGroupId: 'group-home' }),
    ).toEqual({ type: 'group', groupId: 'group-home' })
  })

  it('prefers the user column when both are set, matching the write direction', () => {
    expect(
      ownerFromRecord({ ownerUserId: 'user-ada', ownerGroupId: 'group-home' }),
    ).toEqual({ type: 'user', userId: 'user-ada' })
  })

  it('answers null for an anonymous row', () => {
    expect(
      ownerFromRecord({ ownerUserId: null, ownerGroupId: null }),
    ).toBeNull()
  })
})

describe('endeavorFromRecord — the only two failures, and everything that degrades', () => {
  const base = endeavorRecordFromEndeavor(endeavorMocks.plannedTask, {
    now: MOCK_NOW,
  })

  it('fails on a kind no case names — the row a sync sweep must skip', () => {
    const decoded = endeavorFromRecord({ ...base, kind: 'telepathy' })
    expect(isErr(decoded) && decoded.error.kind).toBe('malformedRecord')
  })

  it('fails on a status no case names', () => {
    const decoded = endeavorFromRecord({ ...base, status: 'vibing' })
    expect(isErr(decoded) && decoded.error.kind).toBe('malformedRecord')
  })

  it('names the offending row and value, so the skip is diagnosable', () => {
    const decoded = endeavorFromRecord({ ...base, kind: 'telepathy' })
    expect(isErr(decoded) && decoded.error.message).toContain('telepathy')
    expect(isErr(decoded) && decoded.error.message).toContain(base.id)
  })

  it('DEGRADES a malformed recurrence to no recurrence rather than failing', () => {
    const decoded = endeavorFromRecord({
      ...base,
      repeatConfigJson: '{"base":{"type":"lunar"}}',
    })
    expect(isOk(decoded) && decoded.value.repeatConfig).toBeNull()
  })

  it('DEGRADES an unreadable shadows column to no shadows', () => {
    const decoded = endeavorFromRecord({ ...base, shadowsJson: 'nonsense' })
    expect(isOk(decoded) && decoded.value.shadows).toBeNull()
  })

  it('DEGRADES an unknown tag letter by dropping it', () => {
    const decoded = endeavorFromRecord({ ...base, tagsCsv: 'O,Z' })
    expect(isOk(decoded) && decoded.value.tags).toEqual(['O'])
  })

  it('accepts every status the domain declares', () => {
    for (const status of Object.values(EndeavorStatus)) {
      expect(isOk(endeavorFromRecord({ ...base, status }))).toBe(true)
    }
  })

  it('accepts every kind the domain declares', () => {
    for (const kind of Object.values(EndeavorKind)) {
      expect(isOk(endeavorFromRecord({ ...base, kind }))).toBe(true)
    }
  })
})
