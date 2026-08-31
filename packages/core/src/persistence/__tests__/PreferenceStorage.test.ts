import { describe, expect, it } from 'vitest'
import {
  DEBUG_FLAG_OVERRIDE_NAMESPACE,
  KRO_PREFERENCE_NAMESPACE,
  type PreferenceStorage,
  type PreferenceValue,
  debugFlagOverrideKey,
  isDebugFlagOverrideKey,
  isKroPreferenceKey,
  kroPreferenceKey,
  preferenceWipeKeys,
  wipePreferences,
} from '../PreferenceStorage'

/** A minimal in-memory double — the port is four methods over a Map. */
const makeStorage = (
  seed: Record<string, PreferenceValue> = {},
): PreferenceStorage => {
  const entries = new Map<string, PreferenceValue>(Object.entries(seed))
  return {
    get: (key) => entries.get(key) ?? null,
    set: (key, value) => {
      entries.set(key, value)
    },
    remove: (key) => {
      entries.delete(key)
    },
    keys: () => [...entries.keys()],
  }
}

describe('the two namespaces, pinned against canon`s literals', () => {
  it('preferences live under `kro:`', () => {
    expect(KRO_PREFERENCE_NAMESPACE).toBe('kro:')
  })

  it('debug flag overrides live under `debug.ff.`', () => {
    expect(DEBUG_FLAG_OVERRIDE_NAMESPACE).toBe('debug.ff.')
  })

  it('the two are disjoint — no key can belong to both', () => {
    expect(
      DEBUG_FLAG_OVERRIDE_NAMESPACE.startsWith(KRO_PREFERENCE_NAMESPACE),
    ).toBe(false)
    expect(
      KRO_PREFERENCE_NAMESPACE.startsWith(DEBUG_FLAG_OVERRIDE_NAMESPACE),
    ).toBe(false)
  })

  it('prefixes a preference key', () => {
    expect(kroPreferenceKey('theme')).toBe('kro:theme')
  })

  it('prefixes a flag-override key', () => {
    expect(debugFlagOverrideKey('now')).toBe('debug.ff.now')
  })
})

describe('the wipe predicate — a prefix test, not a list of known options', () => {
  it('matches a current preference key', () => {
    expect(isKroPreferenceKey(kroPreferenceKey('theme'))).toBe(true)
  })

  it('matches a key written by an OLDER build whose option is now gone', () => {
    // A loop over the declared options would miss this, and it would outlive
    // the account that wrote it on a shared device.
    expect(isKroPreferenceKey('kro:legacy.removedInV2')).toBe(true)
  })

  it('does NOT match a debug flag override', () => {
    expect(isKroPreferenceKey(debugFlagOverrideKey('now'))).toBe(false)
  })

  it('does not match an unrelated key another library owns', () => {
    expect(isKroPreferenceKey('theme')).toBe(false)
    expect(isKroPreferenceKey('next-themes')).toBe(false)
  })

  it('the override predicate is the mirror image', () => {
    expect(isDebugFlagOverrideKey(debugFlagOverrideKey('now'))).toBe(true)
    expect(isDebugFlagOverrideKey(kroPreferenceKey('theme'))).toBe(false)
  })
})

describe('wipePreferences — acceptance criterion 3, at the storage tier', () => {
  const seeded = () =>
    makeStorage({
      'kro:theme': 'dark',
      'kro:session.defaultDuration': 1500,
      'kro:legacy.removedInV2': true,
      'debug.ff.now': true,
      'debug.ff.habits': false,
      'next-themes': 'system',
    })

  it('removes every `kro:` key', () => {
    const storage = seeded()
    wipePreferences(storage)
    expect(storage.keys().filter(isKroPreferenceKey)).toEqual([])
  })

  it('PRESERVES every `debug.ff.*` override', () => {
    const storage = seeded()
    wipePreferences(storage)
    expect(storage.get('debug.ff.now')).toBe(true)
    expect(storage.get('debug.ff.habits')).toBe(false)
  })

  it('leaves keys belonging to other libraries alone', () => {
    const storage = seeded()
    wipePreferences(storage)
    expect(storage.get('next-themes')).toBe('system')
  })

  it('reports exactly what it removed, so a caller can log it', () => {
    expect([...wipePreferences(seeded())].sort()).toEqual([
      'kro:legacy.removedInV2',
      'kro:session.defaultDuration',
      'kro:theme',
    ])
  })

  it('is idempotent — a second sign-out removes nothing', () => {
    const storage = seeded()
    wipePreferences(storage)
    expect(wipePreferences(storage)).toEqual([])
  })

  it('is a no-op on empty storage', () => {
    expect(wipePreferences(makeStorage())).toEqual([])
  })

  it('honours an INJECTED predicate — the KC-IS-#11 handoff seam', () => {
    const storage = seeded()
    const removed = wipePreferences(storage, (key) =>
      key.startsWith('next-themes'),
    )
    expect(removed).toEqual(['next-themes'])
    expect(storage.get('kro:theme')).toBe('dark')
  })

  it('computes the key list without removing anything', () => {
    const storage = seeded()
    expect(preferenceWipeKeys(storage)).toHaveLength(3)
    expect(storage.get('kro:theme')).toBe('dark')
  })
})
