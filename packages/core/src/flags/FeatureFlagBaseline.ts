/**
 * `FeatureFlagBaseline` — canon `KroCore/Domain/FeatureFlags.swift`.
 *
 * What every declared flag resolves to *before* any override is applied. Canon
 * picks between the two with a **compile-time** switch: the `Kro (All Flags)`
 * scheme defines `KRO_FLAGS_ALL_ENABLED`, everything else resolves
 * `.statusQuo`, and a separate `#if DEBUG` adds `developmentActions` on top of
 * the status-quo branch.
 *
 * Neither switch has a platform-free equivalent — `@kro/core` has no build
 * configuration, no `process.env` (it compiles with `types: []`) and no
 * `import.meta`. So both become **caller-supplied arguments**, the same call
 * #7/#8/#9 made for the clock: the composition root in `apps/web` reads
 * `NODE_ENV` / a Vite define once and passes the answer down. The domain tier
 * stays deterministic, and a test pins a baseline by passing one rather than by
 * rebuilding — which is precisely what canon's own
 * `FeatureFlagDefaults.baseline` settable var exists to allow.
 */
import type { FeatureFlagAssignment } from './FeatureFlagAssignment'
import { enabledAssignment } from './FeatureFlagAssignment'
import { allEnabledSet, statusQuoSet } from './FeatureFlagAssignments'
import { FeatureFlags } from './FeatureFlag'

export const FeatureFlagBaseline = {
  /**
   * Every flag in `allKnownFlags` starts enabled. `statusQuoSet` is not
   * consulted at all — per-flag defaults do not apply.
   */
  allEnabled: 'allEnabled',
  /** Every flag starts at its `statusQuoSet` assignment (ship behaviour). */
  statusQuo: 'statusQuo',
} as const

export type FeatureFlagBaseline =
  (typeof FeatureFlagBaseline)[keyof typeof FeatureFlagBaseline]

/**
 * The assignment layer a baseline contributes, before overrides.
 *
 * `developmentActionsEnabled` stands in for canon's `#if DEBUG`, and — exactly
 * as canon documents — it applies **only** to the `statusQuo` branch: the
 * `allEnabled` branch already seeds `developmentActions` from `allKnownFlags`,
 * and appending it a second time would leave two entries for one flag.
 */
export const baselineAssignments = (
  baseline: FeatureFlagBaseline,
  options: { readonly developmentActionsEnabled?: boolean } = {},
): readonly FeatureFlagAssignment[] => {
  if (baseline === FeatureFlagBaseline.allEnabled) return allEnabledSet
  return options.developmentActionsEnabled === true
    ? [...statusQuoSet, enabledAssignment(FeatureFlags.developmentActions)]
    : statusQuoSet
}
