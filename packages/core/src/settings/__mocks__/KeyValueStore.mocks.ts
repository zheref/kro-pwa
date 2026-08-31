/**
 * An in-memory `KeyValueStore` — the stub half of the persistence port.
 *
 * The **live** half is #10's (IndexedDB / `localStorage`). This one exists so
 * every test and story in the repo can exercise `Preferences` and the flag
 * override store without a browser: it is the `stubbed…` companion `RC-33`
 * requires, kept in `__mocks__/` so it can never ride into a production bundle
 * (`RC-13`, and the `@kro/core/mocks` subpath rule).
 *
 * It is a factory, not a shared instance, for the same reason `makeStore` is:
 * one module-level store would leak written keys between test files.
 */
import type { KeyValueStore } from '../KeyValueStore'
import type { SettingValue } from '../SettingOption'

export interface InMemoryKeyValueStore extends KeyValueStore {
  /** Everything currently held, for an assertion that needs the whole map. */
  snapshot(): Readonly<Record<string, SettingValue>>
}

/**
 * Builds an in-memory store, optionally seeded. `seed` keys are **storage**
 * keys — already namespaced — so a test can seed a `kro:` preference and a
 * `debug.ff.` override into one store and watch a sign-out wipe spare the
 * second.
 */
export const makeInMemoryKeyValueStore = (
  seed: Readonly<Record<string, SettingValue>> = {},
): InMemoryKeyValueStore => {
  const entries = new Map<string, SettingValue>(Object.entries(seed))

  return {
    get: (key) => entries.get(key) ?? null,
    set: (key, value) => {
      entries.set(key, value)
    },
    remove: (key) => {
      entries.delete(key)
    },
    keys: () => [...entries.keys()],
    snapshot: () => Object.fromEntries(entries),
  }
}

/**
 * A store seeded with one preference and one flag override — the exact shape
 * the sign-out contract is about. Named rather than assembled inline so the two
 * suites that care assert against the same fixture.
 */
export const signOutContractStoreSeed: Readonly<Record<string, SettingValue>> =
  {
    'kro:session.defaultDuration': 45,
    'kro:general.haptics': false,
    'debug.ff.sessionBreak': true,
    'debug.ff.matrix': false,
  }
