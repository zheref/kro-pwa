/**
 * `FeatureFlagAssignment` fixtures (`RC-13`).
 *
 * Three convenient, one neutral, three inconvenient — the inconvenient ones are
 * the layering hazards: an override that contradicts the baseline, a duplicated
 * flag whose *last* entry must win, and an override naming a flag nothing
 * declares.
 */
import { FeatureFlags } from '../FeatureFlag'
import type { FeatureFlagAssignment } from '../FeatureFlagAssignment'
import {
  disabledAssignment,
  enabledAssignment,
  makeFeatureFlagAssignment,
  FeatureFlagState,
} from '../FeatureFlagAssignment'

export const featureFlagAssignmentMocks = {
  // ---------------------------------------------------------------- convenient

  /** A shipped-on flag, assigned as `statusQuoSet` assigns it. */
  sessionEnabled: enabledAssignment(FeatureFlags.session),

  /** A dark-launched flag, assigned as `statusQuoSet` assigns it. */
  endeavorDetailDisabled: disabledAssignment(FeatureFlags.endeavorDetail),

  /** A kill-switch flag that ships on. */
  doActivityRingsEnabled: enabledAssignment(FeatureFlags.doActivityRings),

  // ------------------------------------------------------------------- neutral

  /**
   * `developmentActions` — the one flag with no `statusQuoSet` assignment that
   * a build may still switch on, so it is neither a baseline entry nor a
   * user-facing toggle.
   */
  developmentActionsEnabled: enabledAssignment(FeatureFlags.developmentActions),

  // -------------------------------------------------------------- inconvenient

  /**
   * An override that **contradicts the baseline**: `sessionBreak` is disabled
   * in `statusQuoSet`. Appended last, it must win.
   */
  sessionBreakOverrideOn: enabledAssignment(FeatureFlags.sessionBreak),

  /**
   * The opposite override for a flag the baseline enables — the direction that
   * catches a resolver written as "any enabled entry wins".
   */
  sessionOverrideOff: disabledAssignment(FeatureFlags.session),

  /**
   * An assignment for a flag `statusQuoSet` never mentions (`matrix`), which is
   * the only way an unassigned flag ever resolves to anything.
   */
  matrixOverrideOn: makeFeatureFlagAssignment(
    FeatureFlags.matrix,
    FeatureFlagState.enabled,
  ),
} satisfies Record<string, FeatureFlagAssignment>

/** Every fixture, for suites asserting a property across the whole spread. */
export const allFeatureFlagAssignmentMocks: readonly FeatureFlagAssignment[] =
  Object.values(featureFlagAssignmentMocks)
