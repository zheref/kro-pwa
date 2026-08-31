import { describe, expect, it } from 'vitest'
import { makeStubbedSupabaseClientProvider } from '../../supabase/SupabaseClientProvider'
import {
  ENDEAVORS_TABLE,
  OWNERS_TABLE,
  makeLiveEndeavorCloudTransport,
  makeStubbedEndeavorCloudTransport,
  stubbedEndeavorCloudTransport,
} from '../EndeavorCloudTransport'
import type { EndeavorWriteRow } from '../EndeavorRow'

const writeRow = (id: string): EndeavorWriteRow => ({
  id,
  title: 'Pay Mortgage',
  kind: 'task',
  status: 'planned',
  isDraft: false,
  owner_id: 7,
  start: null,
  due: null,
  duration: null,
  minimum_duration: null,
  maximum_duration: null,
  repeatConfig: null,
  tags: null,
  shadows: null,
  project_id: null,
  created_at: '2026-08-31T10:00:00.000Z',
  updated_at: null,
  value: null,
  effort: null,
  expiry: null,
  associated_color: null,
  session_points: null,
})

describe('the tables this repo is a client of', () => {
  it('names the two tables the KroApple schema declares, verbatim', () => {
    expect(ENDEAVORS_TABLE).toBe('endeavors')
    expect(OWNERS_TABLE).toBe('owners')
  })
})

describe('the stubbed transport as an in-memory Kro Cloud', () => {
  it('starts empty and has been called zero times — the "zero network" baseline', async () => {
    const transport = makeStubbedEndeavorCloudTransport()
    expect(transport.calls()).toEqual([])
    expect(transport.rows()).toEqual([])
  })

  it('records every call, in order, so an assertion can read the record', async () => {
    const transport = makeStubbedEndeavorCloudTransport()

    await transport.resolveOwnerId('u-1')
    await transport.upsertEndeavor(writeRow('a'))
    await transport.deleteEndeavor('a')
    await transport.fetchEndeavors()

    expect(transport.calls()).toEqual([
      { kind: 'resolveOwnerId', userId: 'u-1' },
      { kind: 'upsertEndeavor', id: 'a' },
      { kind: 'deleteEndeavor', id: 'a' },
      { kind: 'fetchEndeavors' },
    ])
  })

  it('applies an upsert so a later fetch sees it', async () => {
    const transport = makeStubbedEndeavorCloudTransport()
    await transport.upsertEndeavor(writeRow('a'))
    expect((await transport.fetchEndeavors()).map((row) => row.id)).toEqual(['a'])
  })

  it('drops owner_id on the way back, the way a pull select would', async () => {
    const transport = makeStubbedEndeavorCloudTransport()
    await transport.upsertEndeavor(writeRow('a'))
    const [stored] = await transport.fetchEndeavors()
    expect(Object.hasOwn(stored ?? {}, 'owner_id')).toBe(false)
  })

  it('applies a delete, which is how a tombstone reaches this schema', async () => {
    const transport = makeStubbedEndeavorCloudTransport({
      rows: [{ id: 'a', title: 'x', kind: 'task', status: 'planned' }],
    })
    await transport.deleteEndeavor('a')
    expect(await transport.fetchEndeavors()).toEqual([])
  })

  it('answers a configurable owner id', async () => {
    const transport = makeStubbedEndeavorCloudTransport({ ownerId: 99 })
    expect(await transport.resolveOwnerId('u-1')).toBe(99)
  })

  it('can be scripted to fail one operation, and still records the attempt', async () => {
    const transport = makeStubbedEndeavorCloudTransport({
      failures: { upsertEndeavor: new Error('row locked') },
    })
    await expect(transport.upsertEndeavor(writeRow('a'))).rejects.toThrow('row locked')
    expect(transport.calls()).toEqual([{ kind: 'upsertEndeavor', id: 'a' }])
  })

  it('exposes a default stub that has never been called', () => {
    expect(stubbedEndeavorCloudTransport).toBeDefined()
  })
})

describe('the live transport with no project configured', () => {
  const transport = makeLiveEndeavorCloudTransport(makeStubbedSupabaseClientProvider())

  it('reports the engine cleanly unavailable on a fetch rather than crashing a sweep', async () => {
    await expect(transport.fetchEndeavors()).rejects.toMatchObject({
      kind: 'unavailable',
    })
  })

  it('reports the same on an upsert', async () => {
    await expect(transport.upsertEndeavor(writeRow('a'))).rejects.toMatchObject({
      kind: 'unavailable',
    })
  })

  it('reports the same on a delete and on an owner resolution', async () => {
    await expect(transport.deleteEndeavor('a')).rejects.toMatchObject({
      kind: 'unavailable',
    })
    await expect(transport.resolveOwnerId('u-1')).rejects.toMatchObject({
      kind: 'unavailable',
    })
  })
})
