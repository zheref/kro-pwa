/**
 * The endeavor sync engine, and the KC-IS-#31 tombstone ruling in evidence.
 *
 * Every test here runs against the **stubbed** transport, which records every
 * call it receives. That is what turns "with the flag off, zero network calls"
 * from a claim into an assertion: `transport.calls()` is empty, and there is no
 * code path from the stub to a socket.
 */
import {
  type EndeavorRecord,
  FeatureFlagState,
  FeatureFlags,
  dirtyRecords,
  endeavorRecordFromEndeavor,
  epochMillisFromDate,
  makeFeatureFlagAssignment,
  makeHardcodedFeatureFlagService,
  pendingSyncRecords,
} from '@kro/core'
import { endeavorMocks } from '@kro/core/mocks'
import { describe, expect, it } from 'vitest'
import { TriagePushTransport } from '../../../features/triage/TriageSave'
import { makeInMemoryLocalStore } from '../../localStore/InMemoryLocalStore'
import {
  type StubbedEndeavorCloudTransport,
  type StubbedEndeavorCloudTransportOptions,
  makeStubbedEndeavorCloudTransport,
} from '../EndeavorCloudTransport'
import { EndeavorRowMapper } from '../EndeavorRow'
import {
  makeEndeavorSyncService,
  makeStubbedEndeavorSyncService,
  supabaseHostingGate,
} from '../EndeavorSyncService'

const NOW = new Date('2026-08-31T10:00:00.000Z')
const OWNER = 'user-ada'

const recordFor = (
  endeavor = endeavorMocks.plannedTask,
  overrides: Partial<EndeavorRecord> = {},
): EndeavorRecord => ({
  ...endeavorRecordFromEndeavor(endeavor, { now: NOW, ownerUserId: OWNER }),
  ...overrides,
})

/** A row the cloud has already confirmed — clean, so no push is owed. */
const cleanRecord = (id: string): EndeavorRecord =>
  recordFor(
    { ...endeavorMocks.plannedTask, id },
    {
      id,
      updatedAtEpochMillis: 1_000,
      lastSyncedAtEpochMillis: 2_000,
    },
  )

/** A row written locally and never confirmed. */
const dirtyRecord = (id: string): EndeavorRecord =>
  recordFor(
    { ...endeavorMocks.plannedTask, id },
    { id, updatedAtEpochMillis: 3_000, lastSyncedAtEpochMillis: null },
  )

/** A row the user deleted, whose tombstone has not been pushed yet. */
const tombstonedRecord = (id: string): EndeavorRecord =>
  recordFor(
    { ...endeavorMocks.plannedTask, id },
    {
      id,
      updatedAtEpochMillis: 4_000,
      lastSyncedAtEpochMillis: null,
      deletedAtEpochMillis: 4_000,
    },
  )

const profile = {
  id: OWNER,
  name: 'Ada Lovelace',
  username: null,
  emailsCsv: 'ada@example.com',
  birthDate: null,
  nationality: null,
  loginKind: 'email_password',
  connectedServicesCsv: null,
  avatarUrl: null,
  createdAt: NOW,
  updatedAtEpochMillis: epochMillisFromDate(NOW),
}

interface Harness {
  readonly service: ReturnType<typeof makeEndeavorSyncService>
  readonly transport: StubbedEndeavorCloudTransport
  readonly localStore: ReturnType<typeof makeInMemoryLocalStore>
}

interface HarnessOptions
  extends Pick<StubbedEndeavorCloudTransportOptions, 'rows' | 'failures'> {
  readonly endeavors?: readonly EndeavorRecord[]
  /** Defaults to signed in as `OWNER`. */
  readonly signedIn?: boolean
  /** Defaults to the shipping configuration: `supabaseHosting` off. */
  readonly cloudEnabled?: boolean
}

const harness = (options: HarnessOptions): Harness => {
  const localStore = makeInMemoryLocalStore({
    endeavors: options.endeavors ?? [],
    userProfiles: options.signedIn === false ? [] : [profile],
  })
  const transport = makeStubbedEndeavorCloudTransport({
    rows: options.rows,
    failures: options.failures,
  })
  const flags = makeHardcodedFeatureFlagService({
    overrides:
      options.cloudEnabled === true
        ? [
            makeFeatureFlagAssignment(
              FeatureFlags.supabaseHosting,
              FeatureFlagState.enabled,
            ),
          ]
        : [],
  })
  return {
    localStore,
    transport,
    service: makeEndeavorSyncService({
      localStore,
      transport,
      isCloudEnabled: supabaseHostingGate(flags),
    }),
  }
}

// ---------------------------------------------------------------------------
// The flag gate — acceptance criterion 4, second half
// ---------------------------------------------------------------------------

describe('the supabaseHosting gate', () => {
  it('makes zero network calls with the flag off, even with dirty rows waiting (the shipping configuration)', async () => {
    const { service, transport } = harness({
      endeavors: [dirtyRecord('a'), tombstonedRecord('b')],
    })

    const report = await service.synchronize({ now: NOW })

    expect(report.status).toBe('disabled')
    expect(transport.calls()).toEqual([])
  })

  it('is off by default under statusQuo, matching canon (no override needed to stay quiet)', async () => {
    const flags = makeHardcodedFeatureFlagService()
    expect(supabaseHostingGate(flags)()).toBe(false)
  })

  it('makes zero network calls when nobody is signed in, even with the flag forced on', async () => {
    const { service, transport } = harness({
      endeavors: [dirtyRecord('a')],
      cloudEnabled: true,
      signedIn: false,
    })

    const report = await service.synchronize({ now: NOW })

    expect(report.status).toBe('signedOut')
    expect(transport.calls()).toEqual([])
  })

  it('does not resolve an owner when there is nothing dirty to push', async () => {
    const { service, transport } = harness({
      endeavors: [cleanRecord('a')],
      cloudEnabled: true,
    })

    await service.push({ now: NOW })

    expect(transport.calls().map((call) => call.kind)).not.toContain('resolveOwnerId')
  })
})

// ---------------------------------------------------------------------------
// THE RULING: tombstones are in the push set
// ---------------------------------------------------------------------------

describe('the tombstone ruling (KC-IS-#31, routed from KC-PR-#48)', () => {
  it('differs from the canon predicate by exactly the tombstone — the two halves KC-IS-#10 shipped', () => {
    const rows = [cleanRecord('clean'), dirtyRecord('dirty'), tombstonedRecord('gone')]

    const canonPredicate = pendingSyncRecords(rows).map((row) => row.id)
    const rulingPredicate = dirtyRecords(rows).map((row) => row.id)

    expect(canonPredicate).toEqual(['dirty'])
    expect(rulingPredicate).toEqual(['dirty', 'gone'])
    // The whole question, as one assertion: the sets differ by the tombstone.
    expect(
      rulingPredicate.filter((id) => !canonPredicate.includes(id)),
    ).toEqual(['gone'])
  })

  it('pushes a tombstone as a DELETE — the schema has no deleted_at column to carry one', async () => {
    const { service, transport } = harness({
      endeavors: [tombstonedRecord('gone')],
      rows: [{ id: 'gone', title: 'Pay Mortgage', kind: 'task', status: 'planned' }],
      cloudEnabled: true,
    })

    const report = await service.push({ now: NOW })

    expect(report.deleted).toEqual(['gone'])
    expect(report.pushed).toEqual([])
    expect(transport.calls()).toContainEqual({ kind: 'deleteEndeavor', id: 'gone' })
    expect(transport.rows()).toEqual([])
  })

  it('stamps the tombstone synced so it is pushed once and never again', async () => {
    const { service, transport, localStore } = harness({
      endeavors: [tombstonedRecord('gone')],
      cloudEnabled: true,
    })

    await service.push({ now: NOW })
    const afterFirst = transport.calls().length
    await service.push({ now: NOW })

    const stored = (await localStore.endeavors.allIncludingRemoved())[0]
    // The row is still on disk with its tombstone, but it is clean now.
    expect(stored?.deletedAtEpochMillis).not.toBeNull()
    expect(stored?.lastSyncedAtEpochMillis).toBe(epochMillisFromDate(NOW))
    expect(transport.calls().length).toBe(afterFirst)
  })

  it('does not resurrect a deleted row, because the push runs before the pull', async () => {
    // The cloud still holds the row the user just deleted locally. A pull-first
    // sweep would clear the tombstone and hand it back.
    const { service, localStore } = harness({
      endeavors: [tombstonedRecord('gone')],
      rows: [
        {
          id: 'gone',
          title: 'Pay Mortgage',
          kind: 'task',
          status: 'planned',
          isDraft: false,
        },
      ],
      cloudEnabled: true,
    })

    const report = await service.synchronize({ now: NOW })

    expect(report.deleted).toEqual(['gone'])
    expect(report.pulled).toEqual([])
    expect(await localStore.endeavors.all()).toEqual([])
  })

  it('pushes an ordinary dirty row as an upsert and marks it synced', async () => {
    const { service, transport, localStore } = harness({
      endeavors: [dirtyRecord('live')],
      cloudEnabled: true,
    })

    const report = await service.push({ now: NOW })

    expect(report.pushed).toEqual(['live'])
    expect(report.deleted).toEqual([])
    expect(transport.rows().map((row) => row.id)).toEqual(['live'])
    const stored = await localStore.endeavors.get('live')
    expect(stored?.lastSyncedAtEpochMillis).toBe(epochMillisFromDate(NOW))
  })
})

// ---------------------------------------------------------------------------
// Push behaviour
// ---------------------------------------------------------------------------

describe('push', () => {
  it('carries an owner_id, because every endeavors RLS policy requires one', async () => {
    const { service, transport } = harness({
      endeavors: [dirtyRecord('live')],
      cloudEnabled: true,
    })

    await service.push({ now: NOW })

    expect(transport.calls()).toContainEqual({
      kind: 'resolveOwnerId',
      userId: OWNER,
    })
  })

  it('never pushes another account rows, or anonymous ones', async () => {
    const foreign = recordFor(
      { ...endeavorMocks.plannedTask, id: 'foreign' },
      { id: 'foreign', ownerUserId: 'someone-else', lastSyncedAtEpochMillis: null },
    )
    const anonymous = recordFor(
      { ...endeavorMocks.plannedTask, id: 'anon' },
      { id: 'anon', ownerUserId: null, lastSyncedAtEpochMillis: null },
    )
    const { service, transport } = harness({
      endeavors: [foreign, anonymous, dirtyRecord('mine')],
      cloudEnabled: true,
    })

    const report = await service.push({ now: NOW })

    expect(report.pushed).toEqual(['mine'])
    expect(transport.rows().map((row) => row.id)).toEqual(['mine'])
  })

  it('defers one failing row and still pushes the rest (canon swallows per-row errors)', async () => {
    const { service, localStore } = harness({
      endeavors: [tombstonedRecord('gone'), dirtyRecord('live')],
      cloudEnabled: true,
      failures: { deleteEndeavor: new Error('row locked') },
    })

    const report = await service.push({ now: NOW })

    expect(report.deferred).toEqual(['gone'])
    expect(report.pushed).toEqual(['live'])
    // The deferred row stays dirty, so the next sweep retries it.
    const stored = (await localStore.endeavors.allIncludingRemoved()).find(
      (row) => row.id === 'gone',
    )
    expect(stored?.lastSyncedAtEpochMillis).toBeNull()
  })

  it('reports an unresolvable owner rather than pushing rows with a null owner_id', async () => {
    const { service } = harness({
      endeavors: [dirtyRecord('live')],
      cloudEnabled: true,
      failures: { resolveOwnerId: new Error('permission denied for table owners') },
    })

    await expect(service.push({ now: NOW })).rejects.toMatchObject({
      kind: 'ownerUnresolved',
    })
  })
})

// ---------------------------------------------------------------------------
// Pull behaviour and last-write-wins
// ---------------------------------------------------------------------------

describe('pull', () => {
  const cloudRow = (id: string, updatedAt: string) => ({
    id,
    title: 'From the cloud',
    kind: 'task',
    status: 'planned',
    isDraft: false,
    updated_at: updatedAt,
    created_at: '2026-01-01T00:00:00.000Z',
  })

  it('writes a cloud row this device has never seen', async () => {
    const { service, localStore } = harness({
      rows: [cloudRow('fresh', '2026-08-31T09:00:00.000Z')],
      cloudEnabled: true,
    })

    const report = await service.pull({ now: NOW })

    expect(report.pulled).toEqual(['fresh'])
    const stored = await localStore.endeavors.get('fresh')
    expect(stored?.title).toBe('From the cloud')
    expect(stored?.ownerUserId).toBe(OWNER)
    expect(stored?.lastSyncedAtEpochMillis).toBe(epochMillisFromDate(NOW))
  })

  it('overwrites a local row the cloud has written more recently', async () => {
    const stale = recordFor(
      { ...endeavorMocks.plannedTask, id: 'contested', title: 'Local title' },
      {
        id: 'contested',
        title: 'Local title',
        updatedAtEpochMillis: new Date('2026-08-30T00:00:00.000Z').getTime(),
        lastSyncedAtEpochMillis: new Date('2026-08-30T00:00:00.000Z').getTime(),
      },
    )
    const { service, localStore } = harness({
      endeavors: [stale],
      rows: [cloudRow('contested', '2026-08-31T09:00:00.000Z')],
      cloudEnabled: true,
    })

    const report = await service.pull({ now: NOW })

    expect(report.pulled).toEqual(['contested'])
    expect(report.localWins).toEqual([])
    expect((await localStore.endeavors.get('contested'))?.title).toBe('From the cloud')
  })

  it('keeps a local row that is strictly newer, so an unpushed offline edit survives', async () => {
    const ahead = recordFor(
      { ...endeavorMocks.plannedTask, id: 'contested', title: 'Edited offline' },
      {
        id: 'contested',
        title: 'Edited offline',
        updatedAtEpochMillis: new Date('2026-08-31T09:30:00.000Z').getTime(),
        lastSyncedAtEpochMillis: null,
      },
    )
    const { service, localStore } = harness({
      endeavors: [ahead],
      rows: [cloudRow('contested', '2026-08-31T09:00:00.000Z')],
      cloudEnabled: true,
    })

    const report = await service.pull({ now: NOW })

    expect(report.localWins).toEqual(['contested'])
    expect((await localStore.endeavors.get('contested'))?.title).toBe('Edited offline')
  })

  it('resolves a tie to the cloud, matching lastWriteWins', async () => {
    const at = '2026-08-31T09:00:00.000Z'
    const tied = recordFor(
      { ...endeavorMocks.plannedTask, id: 'contested', title: 'Local title' },
      {
        id: 'contested',
        title: 'Local title',
        updatedAtEpochMillis: new Date(at).getTime(),
        lastSyncedAtEpochMillis: null,
      },
    )
    const { service, localStore } = harness({
      endeavors: [tied],
      rows: [cloudRow('contested', at)],
      cloudEnabled: true,
    })

    await service.pull({ now: NOW })

    expect((await localStore.endeavors.get('contested'))?.title).toBe('From the cloud')
  })

  it('skips a cloud row whose kind it cannot decode rather than storing a guess', async () => {
    const { service, localStore } = harness({
      rows: [{ id: 'alien', title: 'x', kind: 'quantum', status: 'planned' }],
      cloudEnabled: true,
    })

    const report = await service.pull({ now: NOW })

    expect(report.skipped).toEqual(['alien'])
    expect(await localStore.endeavors.all()).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// pushOne — the transport leg Triage binds to
// ---------------------------------------------------------------------------

describe('pushOne', () => {
  it('is exactly TriagePushTransport, so the Triage binding needs no translation', () => {
    const engineOutcomes = ['unavailable', 'succeeded', 'failed'].sort()
    const triageOutcomes = Object.values(TriagePushTransport).sort()
    expect(engineOutcomes).toEqual(triageOutcomes)
  })

  it('answers unavailable with the flag off — the shipping behaviour Triage had before', async () => {
    const { service, transport } = harness({})
    expect(
      await service.pushOne({ endeavor: endeavorMocks.plannedTask, now: NOW }),
    ).toBe(TriagePushTransport.unavailable)
    expect(transport.calls()).toEqual([])
  })

  it('answers unavailable when nobody is signed in', async () => {
    const { service } = harness({ cloudEnabled: true, signedIn: false })
    expect(
      await service.pushOne({ endeavor: endeavorMocks.plannedTask, now: NOW }),
    ).toBe(TriagePushTransport.unavailable)
  })

  it('answers succeeded and marks the row synced when the cloud accepts it', async () => {
    const { service, transport } = harness({
      endeavors: [dirtyRecord(endeavorMocks.plannedTask.id)],
      cloudEnabled: true,
    })

    expect(
      await service.pushOne({ endeavor: endeavorMocks.plannedTask, now: NOW }),
    ).toBe(TriagePushTransport.succeeded)
    expect(transport.rows().map((row) => row.id)).toEqual([
      endeavorMocks.plannedTask.id,
    ])
  })

  it('answers failed rather than throwing, because the local save already succeeded', async () => {
    const { service } = harness({
      cloudEnabled: true,
      failures: { upsertEndeavor: new Error('service unavailable') },
    })

    expect(
      await service.pushOne({ endeavor: endeavorMocks.plannedTask, now: NOW }),
    ).toBe(TriagePushTransport.failed)
  })
})

// ---------------------------------------------------------------------------
// The stub
// ---------------------------------------------------------------------------

describe('the stubbed engine', () => {
  it('reports disabled by default, which is what a correctly configured build does', async () => {
    const stub = makeStubbedEndeavorSyncService()
    expect((await stub.synchronize({ now: NOW })).status).toBe('disabled')
    expect(await stub.pushOne({ endeavor: endeavorMocks.plannedTask, now: NOW })).toBe(
      'unavailable',
    )
  })

  it('records which operations were asked of it', async () => {
    const stub = makeStubbedEndeavorSyncService()
    await stub.push({ now: NOW })
    await stub.pull({ now: NOW })
    expect(stub.operations()).toEqual(['push', 'pull'])
  })

  it('can be scripted to report a completed sweep', async () => {
    const stub = makeStubbedEndeavorSyncService({
      report: {
        status: 'synchronized',
        pushed: ['a'],
        deleted: ['b'],
        deferred: [],
        pulled: ['c'],
        localWins: [],
        skipped: [],
      },
    })
    const report = await stub.synchronize({ now: NOW })
    expect(report.deleted).toEqual(['b'])
  })
})

// ---------------------------------------------------------------------------
// The mapper's round trip, through the engine's own path
// ---------------------------------------------------------------------------

describe('the row mapper on the engine path', () => {
  it('round-trips an endeavor through the write row and back', () => {
    const written = EndeavorRowMapper.fromDomain(endeavorMocks.plannedTask, {
      ownerId: 7,
      now: NOW,
    })
    const back = EndeavorRowMapper.toDomain(written)
    expect(back?.id).toBe(endeavorMocks.plannedTask.id)
    expect(back?.title).toBe(endeavorMocks.plannedTask.title)
    expect(back?.status).toBe(endeavorMocks.plannedTask.status)
  })
})
