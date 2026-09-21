import { describe, expect, it } from 'vitest'
import { endeavorMocks } from '../../domain/endeavor/__mocks__/Endeavor.mocks'
import type { EndeavorRecord } from '../EndeavorRecord'
import {
  type OwnedEndeavorPushOutcome,
  type PersistOwnedEndeavorDeps,
  persistOwnedEndeavor,
} from '../OwnedEndeavorWrite'
import type { UserProfileRecord } from '../UserProfileRecord'

const NOW = new Date('2026-08-31T10:00:00.000Z')

const profile = (id: string): UserProfileRecord => ({
  id,
  name: 'Ada',
  username: null,
  emailsCsv: 'ada@example.com',
  birthDate: null,
  nationality: null,
  loginKind: 'google',
  connectedServicesCsv: 'google',
  avatarUrl: null,
  createdAt: NOW,
  updatedAtEpochMillis: 0,
})

const fakes = (options: {
  readonly profile: UserProfileRecord | null
  readonly rows?: readonly EndeavorRecord[]
  readonly push?: OwnedEndeavorPushOutcome
  readonly pushThrows?: boolean
}) => {
  const rows = new Map((options.rows ?? []).map((r) => [r.id, r]))
  const pushes: string[] = []
  const deps: PersistOwnedEndeavorDeps = {
    localStore: {
      endeavors: {
        get: async (id) => rows.get(id) ?? null,
        put: async (record) => {
          rows.set(record.id, record)
        },
      } as PersistOwnedEndeavorDeps['localStore']['endeavors'],
      userProfiles: {
        current: async () => options.profile,
      } as PersistOwnedEndeavorDeps['localStore']['userProfiles'],
    },
    endeavorSync: {
      pushOne: async ({ endeavor }) => {
        if (options.pushThrows) throw new Error('boom')
        pushes.push(endeavor.id)
        return options.push ?? 'succeeded'
      },
    },
  }
  return { deps, rows, pushes }
}

const ownerless = { ...endeavorMocks.plannedTask, owner: null }

describe('persistOwnedEndeavor', () => {
  it('stamps the cached profile as owner on a new endeavor and pushes it (a signed-in user captures a task)', async () => {
    const f = fakes({ profile: profile('owner-1') })

    const report = await persistOwnedEndeavor(f.deps, ownerless, {
      now: NOW,
      hosting: 'cloud',
    })

    expect(f.rows.get(ownerless.id)?.ownerUserId).toBe('owner-1')
    expect(report).toEqual({ ownerUserId: 'owner-1', push: 'succeeded' })
    expect(f.pushes).toEqual([ownerless.id])
  })

  it('keeps the recorded owner and watermark on an edit (a pulled cloud row renamed on the web)', async () => {
    const seeded = fakes({ profile: profile('owner-1') })
    await persistOwnedEndeavor(seeded.deps, ownerless, { now: NOW })
    const arrived = seeded.rows.get(ownerless.id)
    if (arrived === undefined) throw new Error('row missing')
    const f = fakes({
      profile: profile('owner-1'),
      rows: [
        {
          ...arrived,
          ownerUserId: 'someone-else',
          lastSyncedAtEpochMillis: 42,
        },
      ],
    })

    await persistOwnedEndeavor(
      f.deps,
      { ...ownerless, title: 'Renamed' },
      { now: NOW },
    )

    const stored = f.rows.get(ownerless.id)
    expect(stored?.ownerUserId).toBe('someone-else')
    expect(stored?.lastSyncedAtEpochMillis).toBe(42)
    expect(stored?.title).toBe('Renamed')
  })

  it('writes an anonymous row and pushes nothing on a signed-out device', async () => {
    const f = fakes({ profile: null })

    const report = await persistOwnedEndeavor(f.deps, ownerless, { now: NOW })

    expect(f.rows.get(ownerless.id)?.ownerUserId).toBeNull()
    expect(report).toEqual({ ownerUserId: null, push: 'unavailable' })
    expect(f.pushes).toEqual([])
  })

  it('prefers the owner the endeavor itself names over the cached profile', async () => {
    const f = fakes({ profile: profile('owner-1') })

    await persistOwnedEndeavor(f.deps, endeavorMocks.plannedTask, { now: NOW })

    expect(f.rows.get(endeavorMocks.plannedTask.id)?.ownerUserId).toBe(
      'user-ada',
    )
  })

  it('turns a throwing push port into a failed push and still keeps the row', async () => {
    const f = fakes({ profile: profile('owner-1'), pushThrows: true })

    const report = await persistOwnedEndeavor(f.deps, ownerless, {
      now: NOW,
      hosting: 'cloud',
    })

    expect(report.push).toBe('failed')
    expect(f.rows.has(ownerless.id)).toBe(true)
  })

  it('writes a new On Device endeavor anonymous and unpushed even while signed in (the picker chose local)', async () => {
    const f = fakes({ profile: profile('owner-1') })

    const report = await persistOwnedEndeavor(f.deps, ownerless, {
      now: NOW,
      hosting: 'local',
    })

    expect(f.rows.get(ownerless.id)?.ownerUserId).toBeNull()
    expect(report).toEqual({ ownerUserId: null, push: 'unavailable' })
    expect(f.pushes).toEqual([])
  })

  it('never re-hosts an existing anonymous row on an edit while signed in (a local endeavor stays local)', async () => {
    const seeded = fakes({ profile: null })
    await persistOwnedEndeavor(seeded.deps, ownerless, { now: NOW })
    const local = seeded.rows.get(ownerless.id)
    if (local === undefined) throw new Error('row missing')
    const f = fakes({ profile: profile('owner-1'), rows: [local] })

    const report = await persistOwnedEndeavor(
      f.deps,
      { ...ownerless, title: 'Renamed' },
      { now: NOW },
    )

    expect(f.rows.get(ownerless.id)?.ownerUserId).toBeNull()
    expect(report.push).toBe('unavailable')
    expect(f.pushes).toEqual([])
  })

  it('keeps an existing anonymous row anonymous even when the edited value carries an owner (the factory must not re-derive it)', async () => {
    const seeded = fakes({ profile: null })
    await persistOwnedEndeavor(seeded.deps, ownerless, { now: NOW })
    const local = seeded.rows.get(ownerless.id)
    if (local === undefined) throw new Error('row missing')
    const f = fakes({ profile: profile('owner-1'), rows: [local] })

    await persistOwnedEndeavor(f.deps, endeavorMocks.plannedTask, { now: NOW })

    expect(f.rows.get(endeavorMocks.plannedTask.id)?.ownerUserId).toBeNull()
    expect(f.pushes).toEqual([])
  })
})
