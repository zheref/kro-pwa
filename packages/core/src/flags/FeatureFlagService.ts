/**
 * `FeatureFlagService` — the BankaiCore protocol KroApple's
 * `HardcodedFeatureFlagService` implements, ported surface for surface
 * (`UZF-22`: one central registry, one resolver).
 *
 * The whole mechanism is **layering plus last-match-wins**: the constructor
 * lays down the baseline's assignments, appends the overrides, and every read
 * walks the list backwards. That is why `change` rewrites the **last** matching
 * entry rather than the first — canon's own comment flags this as a fixed bug:
 * "rewriting the first match would leave the winning entry untouched, so the
 * change would not take effect on a service built with overrides".
 *
 * The service is a `Provider` in UZF terms (`RC-47`) — synchronous, cheap, and
 * therefore readable straight from a reducer or a Selector. It holds mutable
 * state, which is why it is built by a factory rather than exported as a
 * module-level singleton: canon's `Flags.shared` is a global `var`, and a
 * global here would make every test in the suite share one service (the exact
 * `makeStore` reasoning in `RC-22`). `apps/web` builds one per browser session
 * and hands it down.
 */
import type { FeatureFlag } from './FeatureFlag'
import { isSameFeatureFlag } from './FeatureFlag'
import type {
  FeatureFlagAssignment,
  FeatureFlagState,
} from './FeatureFlagAssignment'
import {
  FeatureFlagState as FlagState,
  makeFeatureFlagAssignment,
  resolveAssignedState,
} from './FeatureFlagAssignment'
import type { FeatureFlagBaseline } from './FeatureFlagBaseline'
import {
  FeatureFlagBaseline as Baseline,
  baselineAssignments,
} from './FeatureFlagBaseline'

export interface FeatureFlagService {
  /**
   * `func state(for:) -> FeatureFlagState?` — the resolved state, or `null`
   * when no layer assigns the flag.
   */
  state(flag: FeatureFlag): FeatureFlagState | null
  /**
   * `func enabledResolver(_:) -> () -> Bool` — a closure a surface can hold and
   * re-read. Ported because canon's call sites hold it; an unassigned flag
   * resolves `false`.
   */
  enabledResolver(flag: FeatureFlag): () => boolean
  /** `state(for:) == .enabled` — the resolver, evaluated now. */
  isEnabled(flag: FeatureFlag): boolean
  /** `mutating func change(ff:to:)` — sets a runtime override. */
  change(flag: FeatureFlag, state: FeatureFlagState): void
  /** The current layered assignment list. Exposed for the Debug flag list. */
  assignments(): readonly FeatureFlagAssignment[]
}

export interface FeatureFlagServiceOptions {
  /** Appended last, so they win over the baseline. */
  readonly overrides?: readonly FeatureFlagAssignment[]
  /** What every flag starts at before overrides. Defaults to `statusQuo`. */
  readonly baseline?: FeatureFlagBaseline
  /** Canon's `#if DEBUG` for `developmentActions`, supplied by the caller. */
  readonly developmentActionsEnabled?: boolean
}

/**
 * `HardcodedFeatureFlagService.init(overrides:baseline:)`.
 *
 * The default baseline is `statusQuo`, matching canon's shipping behaviour:
 * a build that forgets to pass one can never accidentally light up unfinished
 * work.
 */
export const makeHardcodedFeatureFlagService = (
  options: FeatureFlagServiceOptions = {},
): FeatureFlagService => {
  const assignments: FeatureFlagAssignment[] = [
    ...baselineAssignments(options.baseline ?? Baseline.statusQuo, {
      developmentActionsEnabled: options.developmentActionsEnabled,
    }),
    ...(options.overrides ?? []),
  ]

  const state = (flag: FeatureFlag): FeatureFlagState | null =>
    resolveAssignedState(assignments, flag)

  const isEnabled = (flag: FeatureFlag): boolean =>
    state(flag) === FlagState.enabled

  return {
    state,
    isEnabled,
    enabledResolver: (flag) => () => isEnabled(flag),
    change: (flag, nextState) => {
      for (let index = assignments.length - 1; index >= 0; index -= 1) {
        const assignment = assignments[index]
        if (
          assignment !== undefined &&
          isSameFeatureFlag(assignment.flag, flag)
        ) {
          assignments[index] = makeFeatureFlagAssignment(flag, nextState)
          return
        }
      }
      assignments.push(makeFeatureFlagAssignment(flag, nextState))
    },
    assignments: () => [...assignments],
  }
}
