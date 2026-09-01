import { EndeavorKind, EndeavorStatus, EndeavorTag } from '@kro/core'
import { endeavorMocks } from '@kro/core/mocks'
import { describe, expect, it } from 'vitest'
import {
  ENDEAVOR_SELECT_COLUMNS,
  type EndeavorRow,
  EndeavorRowMapper,
} from '../EndeavorRow'

const NOW = new Date('2026-08-31T10:00:00.000Z')

const row = (overrides: Partial<EndeavorRow> = {}): EndeavorRow => ({
  id: 'endeavor-1',
  title: 'Pay Mortgage',
  kind: EndeavorKind.task,
  status: EndeavorStatus.planned,
  isDraft: false,
  ...overrides,
})

describe('the selected columns', () => {
  it('names the two quoted camelCase columns the DDL declares, not snake_case guesses', () => {
    expect(ENDEAVOR_SELECT_COLUMNS).toContain('isDraft')
    expect(ENDEAVOR_SELECT_COLUMNS).toContain('repeatConfig')
  })

  it('never selects a column the table does not have', () => {
    // Canon's own comment: `public.endeavors` has no `completed` and no `owner`.
    expect(ENDEAVOR_SELECT_COLUMNS).not.toContain('completed')
    expect(ENDEAVOR_SELECT_COLUMNS.split(',')).not.toContain('owner')
  })

  it('selects the Kro-enhanced columns the later migrations added', () => {
    for (const column of [
      'value',
      'effort',
      'expiry',
      'associated_color',
      'session_points',
    ]) {
      expect(ENDEAVOR_SELECT_COLUMNS.split(',')).toContain(column)
    }
  })
})

describe('EndeavorRowMapper.toDomain', () => {
  it('reads a minimal row into a usable endeavor', () => {
    const endeavor = EndeavorRowMapper.toDomain(row())
    expect(endeavor?.id).toBe('endeavor-1')
    expect(endeavor?.kind).toBe(EndeavorKind.task)
    expect(endeavor?.status).toBe(EndeavorStatus.planned)
  })

  it('refuses a row whose kind names no case rather than defaulting it to task', () => {
    expect(EndeavorRowMapper.toDomain(row({ kind: 'quantum' }))).toBeNull()
  })

  it('refuses a row whose status names no case', () => {
    expect(EndeavorRowMapper.toDomain(row({ status: 'vaporised' }))).toBeNull()
  })

  it('drops an unrecognised tag letter rather than failing the whole row', () => {
    const endeavor = EndeavorRowMapper.toDomain(
      row({ tags: [EndeavorTag.onDesk, 'Z'] }),
    )
    expect(endeavor?.tags).toEqual([EndeavorTag.onDesk])
  })

  it('distinguishes an absent tag column (never tagged) from an empty one (all removed)', () => {
    expect(EndeavorRowMapper.toDomain(row({ tags: null }))?.tags).toBeNull()
    expect(EndeavorRowMapper.toDomain(row({ tags: [] }))?.tags).toEqual([])
  })

  it('reads a malformed repeatConfig as no recurrence rather than throwing', () => {
    const endeavor = EndeavorRowMapper.toDomain(
      row({ repeatConfig: { base: { type: 'fortnightly' } } }),
    )
    expect(endeavor?.repeatConfig).toBeNull()
  })

  it('skips an undecodable shadow entry and keeps the decodable ones', () => {
    const endeavor = EndeavorRowMapper.toDomain(
      row({
        shadows: [
          {
            originalTitle: 'x',
            sourceIdentifier: 's',
            kind: 'task',
            source: 'apple',
          },
          { nonsense: true },
        ],
      }),
    )
    expect(endeavor?.shadows).toHaveLength(1)
  })

  it('reads an unparseable timestamp as absent rather than as an Invalid Date', () => {
    const endeavor = EndeavorRowMapper.toDomain(row({ due: 'tomorrow-ish' }))
    expect(endeavor?.due).toBeNull()
  })

  it('leaves hostedBy empty — the cloud says nothing about hosting', () => {
    expect(EndeavorRowMapper.toDomain(row())?.hostedBy).toEqual([])
  })

  it('leaves completed and owner null — neither has a column', () => {
    const endeavor = EndeavorRowMapper.toDomain(row())
    expect(endeavor?.completed).toBeNull()
    expect(endeavor?.owner).toBeNull()
  })
})

describe('EndeavorRowMapper.fromDomain', () => {
  it('carries the owner_id every endeavors RLS policy requires', () => {
    const written = EndeavorRowMapper.fromDomain(endeavorMocks.plannedTask, {
      ownerId: 42,
      now: NOW,
    })
    expect(written.owner_id).toBe(42)
  })

  it('writes an explicit null for a cleared optional, so removing a due date clears the column', () => {
    const cleared = { ...endeavorMocks.plannedTask, due: null, expiry: null }
    const written = EndeavorRowMapper.fromDomain(cleared, {
      ownerId: 1,
      now: NOW,
    })
    expect(written.due).toBeNull()
    expect(written.expiry).toBeNull()
    // Present as keys, not merely absent: an omitted key leaves the column alone.
    expect(Object.hasOwn(written, 'due')).toBe(true)
    expect(Object.hasOwn(written, 'expiry')).toBe(true)
  })

  it("lets an assigned list override projectId, matching canon's encode", () => {
    const written = EndeavorRowMapper.fromDomain(
      { ...endeavorMocks.plannedTask, projectId: 'stale-id' },
      { ownerId: 1, now: NOW },
    )
    expect(written.project_id).toBe(endeavorMocks.plannedTask.list?.id)
  })

  it('falls back to now for created_at, because the column is not null', () => {
    const written = EndeavorRowMapper.fromDomain(
      { ...endeavorMocks.plannedTask, createdAt: null },
      { ownerId: 1, now: NOW },
    )
    expect(written.created_at).toBe(NOW.toISOString())
  })

  it('serialises tags as their raw letters', () => {
    const written = EndeavorRowMapper.fromDomain(
      {
        ...endeavorMocks.plannedTask,
        tags: [EndeavorTag.onDesk, EndeavorTag.session],
      },
      { ownerId: 1, now: NOW },
    )
    expect(written.tags).toEqual(['O', 'S'])
  })

  it('never writes a completed or owner column, which do not exist', () => {
    const written = EndeavorRowMapper.fromDomain(endeavorMocks.plannedTask, {
      ownerId: 1,
      now: NOW,
    })
    expect(Object.hasOwn(written, 'completed')).toBe(false)
    expect(Object.hasOwn(written, 'owner')).toBe(false)
  })
})

describe('the round trip', () => {
  it('preserves identity, title, kind and status through write then read', () => {
    for (const endeavor of [
      endeavorMocks.plannedTask,
      endeavorMocks.todayEvent,
      endeavorMocks.weekdayHabit,
      endeavorMocks.bareDraft,
      endeavorMocks.overdueTouristReminder,
      endeavorMocks.completedWithPerformances,
    ]) {
      const back = EndeavorRowMapper.toDomain(
        EndeavorRowMapper.fromDomain(endeavor, { ownerId: 1, now: NOW }),
      )
      expect(back?.id).toBe(endeavor.id)
      expect(back?.title).toBe(endeavor.title)
      expect(back?.kind).toBe(endeavor.kind)
      expect(back?.status).toBe(endeavor.status)
    }
  })

  it('preserves the Kro-enhanced ratings, which the cloud does carry columns for', () => {
    const back = EndeavorRowMapper.toDomain(
      EndeavorRowMapper.fromDomain(endeavorMocks.plannedTask, {
        ownerId: 1,
        now: NOW,
      }),
    )
    expect(back?.value).toBe(endeavorMocks.plannedTask.value)
    expect(back?.effort).toBe(endeavorMocks.plannedTask.effort)
    expect(back?.sessionPoints).toBe(endeavorMocks.plannedTask.sessionPoints)
  })

  it('loses completed, because there is no column for it — stated, not silently assumed', () => {
    const withCompletion = { ...endeavorMocks.plannedTask, completed: NOW }
    const back = EndeavorRowMapper.toDomain(
      EndeavorRowMapper.fromDomain(withCompletion, { ownerId: 1, now: NOW }),
    )
    expect(back?.completed).toBeNull()
  })
})
