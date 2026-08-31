import { endeavorRecordMocks } from '@kro/core/mocks'
import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it, vi } from 'vitest'
import { makeLiveLocalStore, memoizeDatabase } from '../liveLocalStore'
import { makeMemoryWebStorage } from '../WebStorageStores'

describe('memoizeDatabase — one handle, and a retry after a failure', () => {
  it('opens once for a burst of concurrent callers', async () => {
    const open = vi.fn(async () => ({}) as IDBDatabase)
    const provider = memoizeDatabase(open)
    await Promise.all([provider(), provider(), provider()])
    expect(open).toHaveBeenCalledTimes(1)
  })

  it('re-uses the same handle across sequential calls', async () => {
    const handle = {} as IDBDatabase
    const provider = memoizeDatabase(async () => handle)
    expect(await provider()).toBe(await provider())
  })

  it('does NOT cache a failure — one bad open must not poison the session', async () => {
    let attempt = 0
    const provider = memoizeDatabase(async () => {
      attempt += 1
      if (attempt === 1) throw new Error('another tab holds v1')
      return {} as IDBDatabase
    })

    await expect(provider()).rejects.toThrow('another tab holds v1')
    await expect(provider()).resolves.toBeDefined()
    expect(attempt).toBe(2)
  })

  it('surfaces the original failure rather than a wrapped one', async () => {
    const boom = new Error('quota')
    const provider = memoizeDatabase(async () => {
      throw boom
    })
    await expect(provider()).rejects.toBe(boom)
  })
})

describe('makeLiveLocalStore — the factory opens nothing', () => {
  it('builds without touching the database', () => {
    const factory = new IDBFactory()
    const open = vi.spyOn(factory, 'open')
    makeLiveLocalStore({
      indexedDB: factory,
      webStorage: makeMemoryWebStorage(),
      databaseName: 'kro-lazy-1',
    })
    expect(open).not.toHaveBeenCalled()
  })

  it('opens on the first operation that needs the database', async () => {
    const factory = new IDBFactory()
    const store = makeLiveLocalStore({
      indexedDB: factory,
      webStorage: makeMemoryWebStorage(),
      databaseName: 'kro-lazy-2',
    })
    const open = vi.spyOn(factory, 'open')
    await store.endeavors.all()
    expect(open).toHaveBeenCalledTimes(1)
  })

  it('shares one database across the six IndexedDB-backed stores', async () => {
    const factory = new IDBFactory()
    const store = makeLiveLocalStore({
      indexedDB: factory,
      webStorage: makeMemoryWebStorage(),
      databaseName: 'kro-lazy-3',
    })
    const open = vi.spyOn(factory, 'open')
    await Promise.all([
      store.endeavors.all(),
      store.projects.all(),
      store.defers.all(),
      store.performances.all(),
      store.userProfiles.current(),
      store.lensSnapshots.read('do'),
    ])
    expect(open).toHaveBeenCalledTimes(1)
  })

  it('wires all eight ports', async () => {
    const store = makeLiveLocalStore({
      indexedDB: new IDBFactory(),
      webStorage: makeMemoryWebStorage(),
      databaseName: 'kro-lazy-4',
    })
    await store.endeavors.put(endeavorRecordMocks.plannedTask)
    expect(await store.endeavors.all()).toHaveLength(1)
    store.preferences.set('kro:theme', 'dark')
    expect(store.preferences.get('kro:theme')).toBe('dark')
    expect(await store.runningSessionAnchor.read()).toBeNull()
  })

  it('does not reach `localStorage` for the six IndexedDB stores', async () => {
    const backing = makeMemoryWebStorage()
    const store = makeLiveLocalStore({
      indexedDB: new IDBFactory(),
      webStorage: backing,
      databaseName: 'kro-lazy-5',
    })
    await store.endeavors.put(endeavorRecordMocks.plannedTask)
    expect(backing.length).toBe(0)
  })
})
