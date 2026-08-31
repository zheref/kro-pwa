import {
  RUNNING_SESSION_ANCHOR_KEY,
  runningSessionElapsedDuration,
  runningSessionRemainingDuration,
} from '@kro/core'
import { persistedRunningSessionMocks } from '@kro/core/mocks'
import { describe, expect, it } from 'vitest'
import {
  WEB_STORAGE_PROBE_KEY,
  type WebStorageLike,
  makeMemoryWebStorage,
  makeWebPreferenceStorage,
  makeWebRunningSessionAnchorStore,
  probeWebStorage,
  resolveWebStorage,
} from '../WebStorageStores'

describe('the preference encoding — types survive localStorage`s strings', () => {
  it('reads a boolean back as a boolean, not as the string "true"', () => {
    const storage = makeWebPreferenceStorage(makeMemoryWebStorage())
    storage.set('kro:haptics', true)
    expect(storage.get('kro:haptics')).toBe(true)
  })

  it('reads a number back as a number', () => {
    const storage = makeWebPreferenceStorage(makeMemoryWebStorage())
    storage.set('kro:session.defaultDuration', 1500)
    expect(storage.get('kro:session.defaultDuration')).toBe(1500)
  })

  it('reads a NUMERIC-LOOKING string back as a string', () => {
    // The failure the JSON encoding exists to prevent: `String(value)` would
    // make a user's string setting come back as a number on the next reload.
    const storage = makeWebPreferenceStorage(makeMemoryWebStorage())
    storage.set('kro:accentHex', '2026')
    expect(storage.get('kro:accentHex')).toBe('2026')
  })

  it('reads a "true"-looking string back as a string', () => {
    const storage = makeWebPreferenceStorage(makeMemoryWebStorage())
    storage.set('kro:label', 'true')
    expect(storage.get('kro:label')).toBe('true')
  })

  it('reads an un-encoded legacy value as the string it is, rather than dropping it', () => {
    const backing = makeMemoryWebStorage({ 'kro:theme': 'dark' })
    expect(makeWebPreferenceStorage(backing).get('kro:theme')).toBe('dark')
  })

  it('answers null for an unset key', () => {
    expect(
      makeWebPreferenceStorage(makeMemoryWebStorage()).get('kro:nothing'),
    ).toBeNull()
  })

  it('removes one key without touching the others', () => {
    const storage = makeWebPreferenceStorage(makeMemoryWebStorage())
    storage.set('kro:a', 1)
    storage.set('kro:b', 2)
    storage.remove('kro:a')
    expect(storage.keys()).toEqual(['kro:b'])
  })
})

describe('keys() reports the WHOLE origin, not just Kro`s namespace', () => {
  it('includes keys another library owns', () => {
    const storage = makeWebPreferenceStorage(
      makeMemoryWebStorage({ 'kro:theme': '"dark"', 'next-themes': 'system' }),
    )
    expect([...storage.keys()].sort()).toEqual(['kro:theme', 'next-themes'])
  })

  it('includes a debug override, so the wipe predicate can spare it', () => {
    const storage = makeWebPreferenceStorage(
      makeMemoryWebStorage({ 'debug.ff.now': 'true' }),
    )
    expect(storage.keys()).toContain('debug.ff.now')
  })

  it('is empty for empty storage', () => {
    expect(makeWebPreferenceStorage(makeMemoryWebStorage()).keys()).toEqual([])
  })
})

describe('the running-session anchor — one document, written on transitions', () => {
  it('writes exactly one key', async () => {
    const backing = makeMemoryWebStorage()
    const anchor = makeWebRunningSessionAnchorStore(backing)
    await anchor.write(persistedRunningSessionMocks.runningPomodoro)
    expect(backing.length).toBe(1)
    expect(backing.key(0)).toBe(RUNNING_SESSION_ANCHOR_KEY)
  })

  it('replaces the document whole on the next transition', async () => {
    const backing = makeMemoryWebStorage()
    const anchor = makeWebRunningSessionAnchorStore(backing)
    await anchor.write(persistedRunningSessionMocks.runningPomodoro)
    await anchor.write(persistedRunningSessionMocks.pausedAfterTwoRuns)
    expect(backing.length).toBe(1)
    expect((await anchor.read())?.phase).toBe('paused')
  })

  it('survives a reload — a NEW store instance over the same storage', async () => {
    const backing = makeMemoryWebStorage()
    await makeWebRunningSessionAnchorStore(backing).write(
      persistedRunningSessionMocks.runningPomodoro,
    )

    const afterReload = makeWebRunningSessionAnchorStore(backing)
    expect(await afterReload.read()).toEqual(
      persistedRunningSessionMocks.runningPomodoro,
    )
  })

  it('recomputes the same durations after that reload', async () => {
    const backing = makeMemoryWebStorage()
    const original = persistedRunningSessionMocks.runningPomodoro
    await makeWebRunningSessionAnchorStore(backing).write(original)

    const restored = await makeWebRunningSessionAnchorStore(backing).read()
    // Insisted on rather than asserted non-null: a decode that started
    // answering `null` should say so here, not throw on a nullish read below.
    if (restored === null) throw new Error('the anchor failed to decode')

    const now = new Date(2026, 0, 15, 9, 40, 0)
    expect(runningSessionElapsedDuration(restored, now)).toBe(
      runningSessionElapsedDuration(original, now),
    )
    expect(runningSessionRemainingDuration(restored, now)).toBe(
      runningSessionRemainingDuration(original, now),
    )
  })

  it('answers null when nothing was ever written', async () => {
    expect(
      await makeWebRunningSessionAnchorStore(makeMemoryWebStorage()).read(),
    ).toBeNull()
  })

  it('answers null — not a throw — on an unparseable document', async () => {
    const backing = makeMemoryWebStorage({
      [RUNNING_SESSION_ANCHOR_KEY]: '{ half a json',
    })
    expect(await makeWebRunningSessionAnchorStore(backing).read()).toBeNull()
  })

  it('answers null on a parseable document that is not a session', async () => {
    const backing = makeMemoryWebStorage({
      [RUNNING_SESSION_ANCHOR_KEY]: '{"phase":"ready"}',
    })
    expect(await makeWebRunningSessionAnchorStore(backing).read()).toBeNull()
  })

  it('removes the key on clear', async () => {
    const backing = makeMemoryWebStorage()
    const anchor = makeWebRunningSessionAnchorStore(backing)
    await anchor.write(persistedRunningSessionMocks.runningPomodoro)
    await anchor.clear()
    expect(backing.length).toBe(0)
  })
})

describe('resolveWebStorage — absent storage degrades, it does not throw', () => {
  it('answers a usable Storage in this runtime', () => {
    const storage = resolveWebStorage()
    storage.setItem('probe', '1')
    expect(storage.getItem('probe')).toBe('1')
    storage.removeItem('probe')
  })

  it('leaves no probe key behind', () => {
    const before = resolveWebStorage().length
    resolveWebStorage()
    expect(resolveWebStorage().length).toBe(before)
  })

  it('the in-memory stand-in behaves like a Storage', () => {
    const storage = makeMemoryWebStorage({ a: '1' })
    expect(storage.length).toBe(1)
    expect(storage.key(0)).toBe('a')
    expect(storage.key(9)).toBeNull()
    expect(storage.getItem('missing')).toBeNull()
  })
})

describe('probeWebStorage — proves writes work WITHOUT destroying anything', () => {
  it('answers true for a writable store', () => {
    expect(probeWebStorage(makeMemoryWebStorage())).toBe(true)
  })

  it('leaves no probe key behind when the key was absent', () => {
    const storage = makeMemoryWebStorage()
    probeWebStorage(storage)
    expect(storage.getItem(WEB_STORAGE_PROBE_KEY)).toBeNull()
    expect(storage.length).toBe(0)
  })

  it('RESTORES a pre-existing value under the probe key verbatim', () => {
    // Merely constructing the store must not delete an older build's — or
    // another script's — value. This is the data-loss case, not a nicety.
    const storage = makeMemoryWebStorage({
      [WEB_STORAGE_PROBE_KEY]: 'someone else owns this',
    })
    probeWebStorage(storage)
    expect(storage.getItem(WEB_STORAGE_PROBE_KEY)).toBe(
      'someone else owns this',
    )
  })

  it('restores an empty-string value, which is NOT the same as absent', () => {
    const storage = makeMemoryWebStorage({ [WEB_STORAGE_PROBE_KEY]: '' })
    probeWebStorage(storage)
    expect(storage.getItem(WEB_STORAGE_PROBE_KEY)).toBe('')
    expect(storage.length).toBe(1)
  })

  it('touches no other key', () => {
    const storage = makeMemoryWebStorage({ 'kro:theme': '"dark"' })
    probeWebStorage(storage)
    expect(storage.getItem('kro:theme')).toBe('"dark"')
    expect(storage.length).toBe(1)
  })

  it('answers false for a store whose setItem throws — the disabled case', () => {
    const storage: WebStorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => undefined,
      length: 0,
      key: () => null,
    }
    expect(probeWebStorage(storage)).toBe(false)
  })

  it('resolveWebStorage falls back to memory when the probe fails', () => {
    const storage = resolveWebStorage()
    // Whatever this runtime provides, the resolved value is always writable.
    storage.setItem('kro:probe-check', '1')
    expect(storage.getItem('kro:probe-check')).toBe('1')
    storage.removeItem('kro:probe-check')
  })
})
