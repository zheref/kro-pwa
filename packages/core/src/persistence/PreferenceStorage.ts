/**
 * `PreferenceStorage` — the namespaced key-value **port**, and the two
 * namespaces the sign-out wipe is defined over.
 *
 * Canon: `docs/Features/Preferences.md` § *Account lifecycle*, plus the
 * `preferencesNamespace` / `debug.ff.` prefixes in `KroCore`.
 *
 * ## Synchronous, deliberately
 *
 * Canon's store is `UserDefaults`, whose reads are synchronous, and UZF's
 * `Provider` contract (`RC-47`) is the artifact a reducer or a Selector may
 * read **directly** precisely because it cannot return a `Promise`. Preferences
 * sit on that path — the Do surface re-reads its threshold every render pass,
 * the session sheet re-reads its durations on open — so an async port would
 * push every one of those reads into a Producer and change the architecture
 * rather than the storage. The live binding is `localStorage`, which is
 * synchronous; an IndexedDB-backed variant would be a write-through cache
 * behind this same shape.
 *
 * ## The port is namespace-blind, on purpose
 *
 * `key` is the **storage** key — already prefixed by whoever is calling. That
 * is what lets one store serve two namespaces with two different wipe rules,
 * which is exactly the sign-out contract: `kro:` is wiped, `debug.ff.` is not.
 * A `clear()` on the port would be unable to tell them apart, which is why
 * there is `keys()` instead and every bulk operation is built from `keys()` +
 * a prefix predicate.
 *
 * ## Handoff to KC-IS-#11 (open at this branch's rebase point)
 *
 * KC-IS-#11 (settings schema + flag registry, PR KC-PR-#46, **not merged** when
 * this was written) owns the *reading* side of preferences and declares the
 * same port under the name `KeyValueStore`, in
 * `packages/core/src/settings/KeyValueStore.ts`, with the same four methods
 * over the same value type (`SettingValue = boolean | string | number`). That
 * is not an accident and not a duplicate implementation: #11's file says in so
 * many words that "the IndexedDB / `localStorage` binding that satisfies it is
 * #10's".
 *
 * So the two are **structurally identical by construction** — the live binding
 * in `packages/app/src/services/localStore` satisfies both with no adapter, and
 * `makeFeatureFlagOverrideStore(store)` from #11 accepts it directly. The names
 * differ only so the two barrels can export both without a `TS2308` collision
 * while #11 is in flight.
 *
 * When #11 merges, the collapse is mechanical and belongs to whichever child
 * lands second:
 *
 * - `PreferenceStorage` becomes an alias of `KeyValueStore`;
 * - `KRO_PREFERENCE_NAMESPACE` / `isKroPreferenceKey` become re-exports of
 *   #11's `PREFERENCES_NAMESPACE` / `isPreferenceStorageKey`;
 * - `DEBUG_FLAG_OVERRIDE_NAMESPACE` / `isDebugFlagOverrideKey` become
 *   re-exports of #11's `FEATURE_FLAG_OVERRIDE_PREFIX` /
 *   `isFeatureFlagOverrideKey`;
 * - the sign-out wipe changes by one import line and nothing else, because it
 *   already takes its predicates as arguments (`preferenceWipeKeys` below).
 *
 * `__tests__/PreferenceStorage.test.ts` pins both literal prefixes against the
 * strings canon uses, so if either side ever changes one the other's test
 * fails rather than the two silently diverging.
 */

/** The primitives a preference may hold — #11's `SettingValue`, exactly. */
export type PreferenceValue = boolean | string | number

/**
 * The narrow KV port. Structurally `KeyValueStore` from KC-IS-#11; see the file
 * header for the handoff.
 */
export interface PreferenceStorage {
  /** The stored value, or `null` when the key is unset. */
  get(key: string): PreferenceValue | null
  set(key: string, value: PreferenceValue): void
  remove(key: string): void
  /**
   * Every key currently present. Both bulk operations — the sign-out wipe and
   * the flag-override reset — are built from this plus a prefix predicate, so
   * the port needs no `clear()` that could not spare the other namespace.
   */
  keys(): readonly string[]
}

/**
 * The namespace on every persisted preference key — canon's
 * `preferencesNamespace`, preserved verbatim so a value written by any Kro
 * client keeps resolving.
 */
export const KRO_PREFERENCE_NAMESPACE = 'kro:'

/**
 * The namespace on every persisted debug feature-flag override — canon's
 * `FeatureFlagOverrideStore.keyPrefix`.
 *
 * Canon states the reason it is *not* `kro:` outright: it is *"deliberately NOT
 * the `kro:` preferences namespace, so a sign-out `Preferences.clearAll()`
 * never wipes a tester's flag overrides."* The survival of an override across
 * sign-out is therefore a **property of the two prefixes**, not of any wipe
 * code path — no implementation of the wipe can reach these keys, however it is
 * written.
 */
export const DEBUG_FLAG_OVERRIDE_NAMESPACE = 'debug.ff.'

/** The storage key for a preference key. Canon's `namespacedKey(_:)`. */
export const kroPreferenceKey = (key: string): string =>
  KRO_PREFERENCE_NAMESPACE + key

/** The storage key for a flag override. Canon's `static func key(_:)`. */
export const debugFlagOverrideKey = (flagName: string): string =>
  DEBUG_FLAG_OVERRIDE_NAMESPACE + flagName

/**
 * The **sign-out wipe predicate**: whether a storage key belongs to the
 * preferences namespace and is therefore cleared on sign-out.
 *
 * This is the whole of canon's rule (*"signing out clears all device-stored
 * preferences"*, `docs/Features/Preferences.md` § Account lifecycle), and it is
 * a *predicate over keys* rather than a loop over the declared options on
 * purpose: a key written by an older build, whose option has since been
 * removed, must still be wiped — otherwise it outlives the account that wrote
 * it, on a device the next person signs in to.
 */
export const isKroPreferenceKey = (storageKey: string): boolean =>
  storageKey.startsWith(KRO_PREFERENCE_NAMESPACE)

/** The mirror: whether a storage key holds a debug flag override. */
export const isDebugFlagOverrideKey = (storageKey: string): boolean =>
  storageKey.startsWith(DEBUG_FLAG_OVERRIDE_NAMESPACE)

/**
 * The keys a sign-out removes, computed from what is actually stored.
 *
 * `isPreferenceKey` is a parameter rather than a hard-coded call so that the
 * KC-IS-#11 handoff is a one-line substitution (pass `isPreferenceStorageKey`)
 * and so that a test can prove the wipe respects *whatever* predicate it is
 * given rather than only this one.
 */
export const preferenceWipeKeys = (
  storage: PreferenceStorage,
  isPreferenceKey: (storageKey: string) => boolean = isKroPreferenceKey,
): readonly string[] => storage.keys().filter(isPreferenceKey)

/**
 * Remove every preference key, sparing everything else — the storage half of
 * the sign-out contract.
 *
 * Note what it does **not** do: it never enumerates a fixed list of keys, and
 * it never calls a bulk `clear()`. Both would be shorter; both would either
 * miss a stale key or take the debug overrides with them.
 */
export const wipePreferences = (
  storage: PreferenceStorage,
  isPreferenceKey: (storageKey: string) => boolean = isKroPreferenceKey,
): readonly string[] => {
  const removed = preferenceWipeKeys(storage, isPreferenceKey)
  for (const key of removed) storage.remove(key)
  return removed
}
