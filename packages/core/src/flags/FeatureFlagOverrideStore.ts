/**
 * `FeatureFlagOverrideStore` and `Flags.applyPersistedOverrides` — canon
 * `KroCore/Domain/FeatureFlags.swift`, "Persisted overrides" and "Runtime
 * override control".
 *
 * Debug-only persistence for runtime flag overrides, one boolean per flag name
 * under the **`debug.ff.`** prefix. Absence of a key means no override, so the
 * baseline applies.
 *
 * ## Why the prefix is not `kro:`
 *
 * Canon states the reason outright: `debug.ff.` is *"deliberately NOT the
 * `kro:` preferences namespace, so a sign-out `Preferences.clearAll()` never
 * wipes a tester's flag overrides."* That is the whole of the
 * "override survives sign-out" acceptance criterion, and it is a **property of
 * the two prefixes**, not of any sign-out code path: `isPreferenceStorageKey`
 * returns `false` for every key this module writes, so the wipe cannot reach
 * them however it is implemented. `__tests__/FeatureFlagOverrideStore.test.ts`
 * asserts exactly that, against the real wipe predicate rather than a re-stated
 * one.
 *
 * The two namespaces share one `KeyValueStore` (canon shares one
 * `UserDefaults`), which is why the port takes prefixed keys and offers `keys()`
 * instead of a `clear()` that could not tell them apart.
 */
import type { KeyValueStore } from '../settings/KeyValueStore'
import type { FeatureFlag } from './FeatureFlag'
import { featureFlagNamed } from './FeatureFlag'
import type { FeatureFlagAssignment } from './FeatureFlagAssignment'
import { disabledAssignment, enabledAssignment } from './FeatureFlagAssignment'
import type { FeatureFlagService } from './FeatureFlagService'

/** `FeatureFlagOverrideStore.keyPrefix`. */
export const FEATURE_FLAG_OVERRIDE_PREFIX = 'debug.ff.'

/** `static func key(_:)` — the storage key for a flag name. */
export const featureFlagOverrideKey = (name: string): string =>
  FEATURE_FLAG_OVERRIDE_PREFIX + name

/** Whether a storage key holds a flag override. The mirror of the wipe predicate. */
export const isFeatureFlagOverrideKey = (storageKey: string): boolean =>
  storageKey.startsWith(FEATURE_FLAG_OVERRIDE_PREFIX)

/** One persisted override — canon's `(name, isEnabled)` tuple. */
export interface FeatureFlagOverride {
  readonly name: string
  readonly isEnabled: boolean
}

export interface FeatureFlagOverrideStore {
  /** `static func set(name:isEnabled:)`. */
  set(name: string, isEnabled: boolean): void
  /** `static func remove(name:)`. */
  remove(name: string): void
  /** `static func removeAll()` — every `debug.ff.*` key, and nothing else. */
  removeAll(): void
  /** `static func isOverridden(name:)`. */
  isOverridden(name: string): boolean
  /** `static func all()` — every persisted override, **name-sorted**. */
  all(): readonly FeatureFlagOverride[]
}

/** Builds an override store over any `KeyValueStore`. */
export const makeFeatureFlagOverrideStore = (
  store: KeyValueStore,
): FeatureFlagOverrideStore => ({
  set: (name, isEnabled) => {
    store.set(featureFlagOverrideKey(name), isEnabled)
  },

  remove: (name) => {
    store.remove(featureFlagOverrideKey(name))
  },

  removeAll: () => {
    for (const key of store.keys()) {
      if (isFeatureFlagOverrideKey(key)) store.remove(key)
    }
  },

  isOverridden: (name) => store.get(featureFlagOverrideKey(name)) !== null,

  all: () =>
    store
      .keys()
      .filter(isFeatureFlagOverrideKey)
      .slice()
      .sort()
      .map((key) => ({
        name: key.slice(FEATURE_FLAG_OVERRIDE_PREFIX.length),
        // Canon reads through `defaults.bool(forKey:)`, which coerces a
        // non-Bool to `false`. Same here: a corrupted value is an override to
        // `false`, never a crash and never a silent "no override".
        isEnabled: store.get(key) === true,
      })),
})

/**
 * `overrides.map { FeatureFlagAssignment(...) }` — persisted overrides as the
 * assignment layer a service is constructed with. An override naming a flag
 * nothing declares is **skipped**, matching canon's `guard let flag = …`.
 */
export const overridesAsAssignments = (
  overrides: readonly FeatureFlagOverride[],
): readonly FeatureFlagAssignment[] => {
  const assignments: FeatureFlagAssignment[] = []
  for (const override of overrides) {
    const flag = featureFlagNamed(override.name)
    if (flag === null) continue
    assignments.push(
      override.isEnabled ? enabledAssignment(flag) : disabledAssignment(flag),
    )
  }
  return assignments
}

/**
 * `Flags.applyPersistedOverrides()` — applies every persisted override onto an
 * already-built service. Call once at launch, after the service is created and
 * before any surface reads a flag, so a tester's toggles survive a reload.
 *
 * Prefer passing `overridesAsAssignments(store.all())` as the service's
 * `overrides` at construction where you can: layering them in the constructor
 * keeps the baseline visible underneath in `assignments()`, whereas `change`
 * rewrites it in place. Canon has both paths for the same reason.
 */
export const applyPersistedOverrides = (
  service: FeatureFlagService,
  overrides: readonly FeatureFlagOverride[],
): void => {
  for (const assignment of overridesAsAssignments(overrides)) {
    service.change(assignment.flag, assignment.state)
  }
}

/**
 * `Flags.setOverride(_:named:enabled:)` — sets a runtime override and persists
 * it. The flag's `name` is the persisted key, so nothing else needs passing.
 */
export const setFeatureFlagOverride = (
  service: FeatureFlagService,
  store: FeatureFlagOverrideStore,
  flag: FeatureFlag,
  isEnabled: boolean,
): void => {
  service.change(
    flag,
    isEnabled ? enabledAssignment(flag).state : disabledAssignment(flag).state,
  )
  store.set(flag.name, isEnabled)
}
