import { endeavorMocks } from '@kro/core/mocks'
import { describe, expect, it } from 'vitest'
import {
  type InMemoryLocalStoreSeed,
  makeInMemoryLocalStore,
} from '../InMemoryLocalStore'
import { makeStubbedEndeavorSyncService } from '../../sync/EndeavorSyncService'
import { persistOwnedEndeavor } from '@kro/core'

const NOW = new Date('2026-08-31T10:00:00.000Z')
const OWNER = 'owner-1'

const signedInSeed: InMemoryLocalStoreSeed = {
  userProfiles: [
    {
      id: OWNER,
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
    },
  ],
}

const harness = (
  seed: InMemoryLocalStoreSeed = {},
  pushOneOutcome?: 'succeeded' | 'failed' | 'unavailable',
) => {
  const localStore = makeInMemoryLocalStore(seed)
  const endeavorSync = makeStubbedEndeavorSyncService({ pushOneOutcome })
  return { localStore, endeavorSync, deps: { localStore, endeavorSync } }
}

describe('persistOwnedEndeavor', () => {
  it('stamps the signed-in profile as owner on a brand-new endeavor and pushes it cloud-first', async () => {
    const h = harness(signedInSeed, 'succeeded')

    const report = await persistOwnedEndeavor(
      h.deps,
      { ...endeavorMocks.plannedTask, owner: null },
      { now: NOW, hosting: 'cloud' },
    )

    const stored = await h.localStore.endeavors.get(
      endeavorMocks.plannedTask.id,
    )
    expect(stored?.ownerUserId).toBe(OWNER)
    expect(report).toEqual({ ownerUserId: OWNER, push: 'succeeded' })
    expect(h.endeavorSync.operations()).toEqual(['pushOne'])
  })

  it('keeps the owner an edited endeavor already carries (a pulled cloud row edited on the web)', async () => {
    const h = harness(signedInSeed, 'succeeded')
    // A row that arrived from the cloud under another owner, already synced.
    await persistOwnedEndeavor(
      {
        localStore: h.localStore,
        endeavorSync: makeStubbedEndeavorSyncService(),
      },
      endeavorMocks.plannedTask,
      { now: NOW },
    )
    const arrived = await h.localStore.endeavors.get(
      endeavorMocks.plannedTask.id,
    )
    if (arrived === null) throw new Error('row missing')
    await h.localStore.endeavors.put({
      ...arrived,
      ownerUserId: 'someone-else',
      lastSyncedAtEpochMillis: 42,
    })

    await persistOwnedEndeavor(
      h.deps,
      { ...endeavorMocks.plannedTask, title: 'Renamed' },
      { now: NOW },
    )

    const stored = await h.localStore.endeavors.get(
      endeavorMocks.plannedTask.id,
    )
    expect(stored?.ownerUserId).toBe('someone-else')
    expect(stored?.lastSyncedAtEpochMillis).toBe(42)
    expect(stored?.title).toBe('Renamed')
  })

  it('writes an anonymous row and pushes nothing on a signed-out device', async () => {
    const h = harness({ userProfiles: [] }, 'succeeded')

    const report = await persistOwnedEndeavor(
      h.deps,
      { ...endeavorMocks.plannedTask, owner: null },
      { now: NOW },
    )

    expect(
      (await h.localStore.endeavors.get(endeavorMocks.plannedTask.id))
        ?.ownerUserId,
    ).toBeNull()
    expect(report).toEqual({ ownerUserId: null, push: 'unavailable' })
    expect(h.endeavorSync.operations()).toEqual([])
  })

  it('honours the owner the endeavor itself names over the cached profile (a row pulled for this account)', async () => {
    const h = harness(signedInSeed, 'succeeded')

    await persistOwnedEndeavor(h.deps, endeavorMocks.plannedTask, { now: NOW })

    expect(
      (await h.localStore.endeavors.get(endeavorMocks.plannedTask.id))
        ?.ownerUserId,
    ).toBe('user-ada')
  })

  it('reports a failed push and keeps the row (the sweep retries it later) rather than failing the action', async () => {
    const h = harness(signedInSeed, 'failed')

    const report = await persistOwnedEndeavor(
      h.deps,
      endeavorMocks.plannedTask,
      {
        now: NOW,
      },
    )

    expect(report.push).toBe('failed')
    expect(
      await h.localStore.endeavors.get(endeavorMocks.plannedTask.id),
    ).not.toBeNull()
  })

  it('carries a resolved kind through to the record', async () => {
    const h = harness(signedInSeed, 'succeeded')

    await persistOwnedEndeavor(h.deps, endeavorMocks.plannedTask, {
      now: NOW,
      resolvedKind: 'reminder',
    })

    expect(
      (await h.localStore.endeavors.get(endeavorMocks.plannedTask.id))?.kind,
    ).toBe('reminder')
  })

  it('keeps an existing anonymous row anonymous even when the edited value names an owner', async () => {
    const h = harness(signedInSeed, 'succeeded')
    await persistOwnedEndeavor(
      {
        localStore: h.localStore,
        endeavorSync: makeStubbedEndeavorSyncService(),
      },
      { ...endeavorMocks.plannedTask, owner: null },
      { now: NOW, hosting: 'local' },
    )

    await persistOwnedEndeavor(h.deps, endeavorMocks.plannedTask, { now: NOW })

    expect(
      (await h.localStore.endeavors.get(endeavorMocks.plannedTask.id))
        ?.ownerUserId,
    ).toBeNull()
    expect(h.endeavorSync.operations()).toEqual([])
  })
})
