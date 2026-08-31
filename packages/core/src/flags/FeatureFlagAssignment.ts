/**
 * `FeatureFlagState` and `FeatureFlagAssignment` — the BankaiCore types
 * KroApple's `FeatureFlags.swift` builds on, ported as the pair they are.
 *
 * An *assignment* is one flag pinned to one state. A service holds an ordered
 * **list** of them — baseline first, overrides appended — and resolves a flag
 * by taking the **last** entry that names it. That ordering is the whole
 * override mechanism, which is why the assignment list is a `readonly
 * FeatureFlagAssignment[]` and never a `Map`: a map would collapse the layers
 * and lose the record of what the baseline said before an override landed.
 */
import type { FeatureFlag } from './FeatureFlag'
import { isSameFeatureFlag } from './FeatureFlag'

export const FeatureFlagState = {
  enabled: 'enabled',
  disabled: 'disabled',
} as const

export type FeatureFlagState =
  (typeof FeatureFlagState)[keyof typeof FeatureFlagState]

export interface FeatureFlagAssignment {
  readonly flag: FeatureFlag
  readonly state: FeatureFlagState
}

/** `FeatureFlagAssignment(flag:state:)`. */
export const makeFeatureFlagAssignment = (
  flag: FeatureFlag,
  state: FeatureFlagState,
): FeatureFlagAssignment => ({ flag, state })

/** `.init(flag: x, state: .enabled)`. */
export const enabledAssignment = (flag: FeatureFlag): FeatureFlagAssignment =>
  makeFeatureFlagAssignment(flag, FeatureFlagState.enabled)

/** `.init(flag: x, state: .disabled)`. */
export const disabledAssignment = (flag: FeatureFlag): FeatureFlagAssignment =>
  makeFeatureFlagAssignment(flag, FeatureFlagState.disabled)

/** `state == .enabled`. Kept as a function so no call site re-spells it. */
export const isAssignmentEnabled = (
  assignment: FeatureFlagAssignment,
): boolean => assignment.state === FeatureFlagState.enabled

/**
 * `flagAssignments.last { $0.flag == featureFlag }?.state` — **last match
 * wins**, which is what makes an appended override beat the baseline.
 *
 * `null` when no layer names the flag: canon's `state(for:)` returns
 * `FeatureFlagState?`, and an unassigned flag (matrix, board, blueprints,
 * developmentActions under `statusQuo`) genuinely has no state. Collapsing
 * that to `disabled` here would be wrong — `enabledResolver` does the
 * collapsing, and only for the "is it on?" question.
 */
export const resolveAssignedState = (
  assignments: readonly FeatureFlagAssignment[],
  flag: FeatureFlag,
): FeatureFlagState | null => {
  for (let index = assignments.length - 1; index >= 0; index -= 1) {
    const assignment = assignments[index]
    if (assignment !== undefined && isSameFeatureFlag(assignment.flag, flag)) {
      return assignment.state
    }
  }
  return null
}
