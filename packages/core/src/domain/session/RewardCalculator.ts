/**
 * Both reward formulas — canon `Kro/Domain/RewardCalculator.swift`, with the
 * behaviour tables in `docs/Features/Performances.md`.
 *
 * ## Read the resolutions the way canon means them
 *
 * `PerformResolution` is easy to read backwards, and every branch below turns
 * on getting it right:
 *
 * - **`finished`** — *the task was marked done.* Full or partial credit.
 * - **`complete`** — *the session ended; the task was not marked done.*
 *   Partial credit only if the timer actually ran out.
 * - **`aborted`** — abandoned, or a below-threshold finish-early. Zero, always.
 *
 * So "finished" is the **better** outcome of the two, despite reading like the
 * weaker one. `docs/Features/Performances.md`'s summary table is the check:
 * *timer finished + task completed → `finished` → 100 %*; *timer finished, not
 * completed → `complete` → 30 %*.
 *
 * ## Numeric fidelity
 *
 * Canon truncates the sliding scale (`Int(Double)` rounds toward zero) and
 * **rounds** the legacy formula (`.rounded()`, half away from zero). The two
 * differ, and both are ported as they are — `Math.trunc` and `Math.round`
 * respectively. Every operand here is non-negative, which is where
 * `Math.round` and Swift's half-away-from-zero agree.
 */
import { assertNever } from '../../library/assertNever'
import type { Endeavor } from '../endeavor/Endeavor'
import {
  type PerformResolution,
  PerformResolution as Resolution,
} from '../endeavor/Perform'
import {
  SECONDS_PER_MINUTE,
  type TimeIntervalSeconds,
  secondsBetween,
} from '../shared/TimeInterval'
import { PointsFormula } from './PointsFormula'

/**
 * `baseRewardFor(endeavor:)`.
 *
 * Canon returns a flat 30 and carries two `TODO`s: read `sessionPoints` when
 * the field exists, then derive from priority/urgency. The field **does** now
 * exist on `Endeavor` (#7 ported `sessionPoints`), but canon's branch that
 * would read it is still commented out, so the shipped answer is 30 for every
 * endeavor. Ported as shipped: honouring `sessionPoints` here would make web
 * and iOS award different points for the same endeavor, which is a product
 * decision (and a KroApple change) rather than a porting one.
 */
export const DEFAULT_BASE_REWARD_POINTS = 30

export const baseRewardFor = (_endeavor: Endeavor): number =>
  DEFAULT_BASE_REWARD_POINTS

/**
 * `calculatePoints` — the **sliding scale**, canon's default formula.
 *
 * | Outcome | Task done? | Elapsed | Resolution | Award |
 * |---|---|---|---|---|
 * | Timer finished | no | ≥ target | `complete` | 30 % of base |
 * | Timer finished | yes | ≥ target | `finished` | 100 % of base |
 * | Finished early | yes | < target | `finished` | (elapsed/target) × base |
 * | Finished early | no | < target | `complete` | 0 |
 * | Quick complete | yes | 0, target 0 | `finished` | 100 % of base |
 * | Aborted | — | any | `aborted` | 0 |
 *
 * Two guards come first, both canon's: a non-positive `basePoints` and a
 * negative `elapsedDuration` each award zero before any branch runs.
 *
 * The `finished` arm caps at 100 % (`min(…, 1.0)`) so running over time never
 * pays more than finishing on time.
 */
export const calculateSlidingScalePoints = (params: {
  readonly basePoints: number
  readonly resolution: PerformResolution
  readonly targetDuration: TimeIntervalSeconds
  readonly elapsedDuration: TimeIntervalSeconds
}): number => {
  const { basePoints, resolution, targetDuration, elapsedDuration } = params
  if (basePoints <= 0) return 0
  if (elapsedDuration < 0) return 0

  switch (resolution) {
    case Resolution.finished: {
      // Quick complete: no session ran, so there is no proportion to take.
      if (targetDuration === 0) return basePoints
      const completion = Math.min(elapsedDuration / targetDuration, 1)
      return Math.trunc(basePoints * completion)
    }
    case Resolution.complete:
      // The session ran its course but the task stayed open: partial credit
      // only for going the distance.
      return elapsedDuration >= targetDuration
        ? Math.trunc(basePoints * 0.3)
        : 0
    case Resolution.aborted:
      return 0
    default:
      return assertNever(resolution)
  }
}

/**
 * `legacyPriorityMultiplier` — due-date urgency, using the same thresholds as
 * the app's urgency badge. No due date is neutral.
 */
export const legacyPriorityMultiplier = (
  endeavor: Endeavor,
  now: Date,
): number => {
  const due = endeavor.due
  if (due === null) return 1
  if (due.getTime() < now.getTime()) return 1.5
  if (secondsBetween(now, due) <= 2 * 60 * 60) return 1.25
  return 1
}

/**
 * `legacyPoints` — the alternative formula: `estimated_minutes × base_rate ×
 * priority_multiplier`, then a resolution factor.
 *
 * `base_rate` is 1 point per estimated minute; the multiplier is 1.5× overdue,
 * 1.25× due within ~2 h, 1× otherwise; the factor is 1.0 `finished`, 0.3
 * `complete`, 0 `aborted`. Unlike the sliding scale it **does not** vary with
 * how long the session ran — hence no `elapsedDuration` parameter — and an
 * endeavor with no estimate scores zero.
 */
export const calculateLegacyPoints = (params: {
  readonly endeavor: Endeavor
  readonly resolution: PerformResolution
  readonly now: Date
}): number => {
  const { endeavor, resolution, now } = params
  const estimatedMinutes = (endeavor.duration ?? 0) / SECONDS_PER_MINUTE
  if (estimatedMinutes <= 0) return 0

  const baseRate = 1
  const raw =
    estimatedMinutes * baseRate * legacyPriorityMultiplier(endeavor, now)

  let resolutionFactor: number
  switch (resolution) {
    case Resolution.finished:
      resolutionFactor = 1
      break
    case Resolution.complete:
      resolutionFactor = 0.3
      break
    case Resolution.aborted:
      resolutionFactor = 0
      break
    default:
      return assertNever(resolution)
  }

  return Math.round(raw * resolutionFactor)
}

/**
 * `award(formula:…)` — the single entry point every award site calls, after
 * reading the user's `PointsFormula` preference.
 *
 * `now` is only consulted by the legacy path (for due-date urgency); the
 * sliding scale is time-free, deriving everything from the two durations it is
 * handed.
 */
export const awardRewardPoints = (params: {
  readonly formula: PointsFormula
  readonly endeavor: Endeavor
  readonly resolution: PerformResolution
  readonly targetDuration: TimeIntervalSeconds
  readonly elapsedDuration: TimeIntervalSeconds
  readonly now: Date
}): number => {
  switch (params.formula) {
    case PointsFormula.slidingScale:
      return calculateSlidingScalePoints({
        basePoints: baseRewardFor(params.endeavor),
        resolution: params.resolution,
        targetDuration: params.targetDuration,
        elapsedDuration: params.elapsedDuration,
      })
    case PointsFormula.legacy:
      return calculateLegacyPoints({
        endeavor: params.endeavor,
        resolution: params.resolution,
        now: params.now,
      })
    default:
      return assertNever(params.formula)
  }
}
