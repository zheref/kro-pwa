/**
 * The narrow key-value **port** every persisted preference and every debug
 * feature-flag override reads and writes through.
 *
 * This issue owns the *interface*, not an implementation: the IndexedDB /
 * `localStorage` binding that satisfies it is #10's, and nothing here touches a
 * storage API — `@kro/core` is platform-free.
 *
 * **Synchronous on purpose.** Canon's store is `UserDefaults`, whose reads are
 * synchronous, and UZF's own `Provider` contract (`RC-47`) is the artifact a
 * reducer or Selector may read directly *because* it cannot return a `Promise`.
 * Preferences are read on that path — the Do screen re-reads its threshold on
 * every render pass, the session screen its durations on open — so an async
 * port would push every one of those reads into a Producer and out of the
 * reducer, changing the architecture rather than the storage. #10's live
 * binding therefore hydrates once and serves reads from memory; an
 * IndexedDB-backed variant is a write-through cache behind this same shape.
 *
 * **Nothing here is namespaced.** `key` is the *storage* key — already prefixed
 * by whoever is calling. `Preferences` applies the `kro:` namespace; the flag
 * override store applies `debug.ff.`. Keeping the port ignorant of both is what
 * lets one store serve two namespaces with two different wipe rules, which is
 * exactly the sign-out contract (`isPreferenceStorageKey` matches one and not
 * the other).
 */
import type { SettingValue } from './SettingOption'

export interface KeyValueStore {
  /** The stored value, or `null` when the key is unset. */
  get(key: string): SettingValue | null
  set(key: string, value: SettingValue): void
  remove(key: string): void
  /**
   * Every key currently present. The two `removeAll`-shaped operations
   * (preferences wipe on sign-out, flag-override reset) are built from this
   * plus a prefix predicate, so the port needs no `clear` of its own — a bare
   * `clear` would be unable to spare the other namespace.
   */
  keys(): readonly string[]
}

/**
 * The namespace prefix on every persisted preference key — canon's
 * `preferencesNamespace`, preserved verbatim so a value written by any Kro
 * client keeps resolving.
 */
export const PREFERENCES_NAMESPACE = 'kro:'

/** `namespacedKey(_:)` — the storage key for a preference key. */
export const preferenceStorageKey = (key: string): string =>
  PREFERENCES_NAMESPACE + key

/**
 * The **sign-out wipe predicate**: whether a storage key belongs to the
 * preferences namespace and is therefore cleared when the user signs out.
 *
 * This is the whole of canon's "signing out clears all device-stored
 * preferences" rule (`docs/Features/Preferences.md` § Account lifecycle,
 * SEC-8 / CWE-668), and it is deliberately a *predicate over keys* rather than
 * a loop over `allPreferenceOptions`: a key written by an older build whose
 * option has since been removed must still be wiped, or it outlives the account
 * that wrote it.
 *
 * It is also what makes a debug flag override survive sign-out — `debug.ff.*`
 * is a different prefix, so this returns `false` for it. Canon states that
 * intent directly ("deliberately NOT the `kro:` preferences namespace, so a
 * sign-out `Preferences.clearAll()` never wipes a tester's flag overrides").
 */
export const isPreferenceStorageKey = (storageKey: string): boolean =>
  storageKey.startsWith(PREFERENCES_NAMESPACE)
