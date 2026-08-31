/**
 * The sign-out wipe — acceptance criterion 3, and the one operation that spans
 * every store.
 *
 * Canon, `docs/Features/Preferences.md` § *Account lifecycle*:
 *
 * > *To prevent one person's settings from bleeding into another's on a shared
 * > device, **signing out clears all device-stored preferences**: the next
 * > account that signs in starts from defaults rather than inheriting the
 * > previous user's choices.*
 *
 * and, from `FeatureFlagOverrideStore`, the deliberate exception:
 *
 * > *`debug.ff.` is **deliberately NOT** the `kro:` preferences namespace, so a
 * > sign-out `Preferences.clearAll()` never wipes a tester's flag overrides.*
 *
 * ## Three properties this implementation holds
 *
 * **1. It never enumerates a fixed list of keys.** A key written by an older
 * build, whose setting no longer exists, is still that account's data. The wipe
 * is a prefix predicate over the keys that are actually present, so a stale key
 * is removed rather than outliving the account that wrote it.
 *
 * **2. It never calls a bulk `clear()` on the key-value store.** `localStorage`
 * is shared with everything else on the origin — the theme library, the debug
 * overrides, whatever ships next. Clearing it would take all of that with it.
 * The stores that Kro owns outright *are* cleared wholesale, because they hold
 * nothing but Kro's rows.
 *
 * **3. The anchor goes too, without a special case.** The running session names
 * an endeavor by id, so it is account data. It lives under `kro:` for exactly
 * that reason, which means the preference sweep already removes it — no extra
 * branch, and no way for a future edit to forget it. `clear()` is still called
 * on the anchor store so a non-`localStorage` binding (the in-memory stub, or a
 * future IndexedDB one) is covered by the same operation.
 *
 * ## What it deliberately does NOT do
 *
 * It does not sign anything out, revoke a token, or touch the network. It is
 * the storage half of sign-out and nothing else; the auth flow (#31) calls it.
 * Keeping it that narrow is what lets it be tested exhaustively against both
 * store implementations without a session.
 */
import {
  type LocalStore,
  type SignOutWipeReport,
  isPreferenceStorageKey,
  wipePreferences,
} from '@kro/core'
import { KroObjectStore } from './KroDatabase'

/**
 * Empty every Kro-owned object store, remove every `kro:` preference, and leave
 * `debug.ff.*` — and anything another library owns — untouched.
 *
 * `isPreferenceKey` defaults to KC-IS-#11's `isPreferenceStorageKey` and stays
 * a parameter so a test can prove the wipe honours *whatever* predicate it is
 * given — the difference between testing this operation and testing the
 * constant it happens to import.
 */
export const signOutWipe = async (
  store: LocalStore,
  isPreferenceKey: (storageKey: string) => boolean = isPreferenceStorageKey,
): Promise<SignOutWipeReport> => {
  const preservedKeys = store.preferences
    .keys()
    .filter((key) => !isPreferenceKey(key))

  const preferenceKeys = wipePreferences(store.preferences, isPreferenceKey)

  /**
   * Each entry names the store it clears, so `clearedStores` is a record of
   * what this function **did** rather than a copy of what the schema declares.
   *
   * An earlier cut returned `kroObjectStores` directly, with a comment claiming
   * that a store added to the schema but not cleared here would "show up as a
   * discrepancy". Nothing compared the two, so it would have shown up as a
   * report cheerfully asserting that data which quietly survived had been
   * wiped — the worst possible failure in a log line whose entire job is to
   * answer *what was removed*. The completeness claim now lives where it can
   * actually fail: `__tests__/signOutWipe.test.ts` asserts this list equals
   * `kroObjectStores`, so omitting a `clear()` breaks a test instead of a
   * promise.
   */
  const clearing: readonly (readonly [KroObjectStore, Promise<void>])[] = [
    [KroObjectStore.endeavors, store.endeavors.clear()],
    [KroObjectStore.projects, store.projects.clear()],
    [KroObjectStore.defers, store.defers.clear()],
    [KroObjectStore.performances, store.performances.clear()],
    [KroObjectStore.userProfiles, store.userProfiles.clear()],
    [KroObjectStore.lensSnapshots, store.lensSnapshots.clearAll()],
  ]

  await Promise.all([
    ...clearing.map(([, done]) => done),
    // Not an object store — the anchor is one `localStorage` document. The
    // preference sweep above already removed it (it lives under `kro:`); this
    // covers a binding that keeps it elsewhere, such as the in-memory stub.
    store.runningSessionAnchor.clear(),
  ])

  return {
    preferenceKeys,
    preservedKeys,
    clearedStores: clearing.map(([name]) => name),
  }
}
