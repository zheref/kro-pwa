/**
 * The sign-out wipe, at the storage tier — canon
 * `docs/Features/Preferences.md` § *Account lifecycle*:
 *
 * > *To prevent one person's settings from bleeding into another's on a shared
 * > device, **signing out clears all device-stored preferences**: the next
 * > account that signs in starts from defaults rather than inheriting the
 * > previous user's choices.*
 *
 * ## The port and the predicate are KC-IS-#11's, not this issue's
 *
 * An earlier cut of this branch declared its own `PreferenceStorage` port and
 * its own `kro:` / `debug.ff.` predicates, because KC-IS-#11 had not merged
 * when the work started. It has now (KC-PR-#46), so those declarations are
 * **gone** rather than aliased: two names for one rule is how the two drift.
 *
 * What lives where, after the collapse:
 *
 * | Thing | Owner |
 * |---|---|
 * | `KeyValueStore` — the synchronous namespaced KV port | `settings/KeyValueStore.ts` (#11) |
 * | `PREFERENCES_NAMESPACE` / `isPreferenceStorageKey` | same (#11) |
 * | `FEATURE_FLAG_OVERRIDE_PREFIX` / `isFeatureFlagOverrideKey` | `flags/FeatureFlagOverrideStore.ts` (#11) |
 * | the **live** `localStorage` binding | `@kro/app` `services/localStore` (this issue) |
 * | the **wipe operation** below | this issue |
 *
 * #11's own file says as much — *"the IndexedDB / `localStorage` binding that
 * satisfies it is #10's"* — so this is the two halves meeting, not a merge
 * artefact.
 *
 * ## Two properties the wipe holds
 *
 * **It never enumerates a fixed list of keys.** A key written by an older
 * build, whose setting no longer exists, is still that account's data. The wipe
 * is a *predicate over the keys that are actually present*, so a stale key is
 * removed rather than outliving the account that wrote it. That is exactly why
 * #11 declared `isPreferenceStorageKey` as a predicate rather than a loop over
 * `allPreferenceOptions`.
 *
 * **It never calls a bulk `clear()`.** The port deliberately has none: one
 * store serves two namespaces with two different rules, and a `clear()` could
 * not tell them apart. Sparing `debug.ff.*` is therefore a property of the two
 * prefixes, not of this code — canon: *"deliberately NOT the `kro:` preferences
 * namespace, so a sign-out `Preferences.clearAll()` never wipes a tester's flag
 * overrides."*
 */
import type { KeyValueStore } from '../settings/KeyValueStore'
import { isPreferenceStorageKey } from '../settings/KeyValueStore'

/**
 * The keys a sign-out removes, computed from what is actually stored.
 *
 * `isPreferenceKey` is a parameter, defaulting to #11's predicate, so a test
 * can prove the wipe honours *whatever* predicate it is given rather than only
 * the one it happens to import — the difference between testing the operation
 * and testing the constant.
 */
export const preferenceWipeKeys = (
  storage: KeyValueStore,
  isPreferenceKey: (storageKey: string) => boolean = isPreferenceStorageKey,
): readonly string[] => storage.keys().filter(isPreferenceKey)

/**
 * Remove every preference key, sparing everything else. Returns what it
 * removed, so a caller can log it and a test can assert on more than
 * "did not throw".
 */
export const wipePreferences = (
  storage: KeyValueStore,
  isPreferenceKey: (storageKey: string) => boolean = isPreferenceStorageKey,
): readonly string[] => {
  const removed = preferenceWipeKeys(storage, isPreferenceKey)
  for (const key of removed) storage.remove(key)
  return removed
}
