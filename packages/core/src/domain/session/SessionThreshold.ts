/**
 * The 30 %-of-target recording threshold — canon
 * `Kro/Application/Session/SessionSetupFeature.swift`, the
 * `.userDidTapFinishEarly` arm (the guard reads
 * `state.selectedMode == .countdown && elapsed < state.targetDuration * 0.3`).
 *
 * ## What the threshold decides
 *
 * A countdown finished early below 30 % of its target is **an aborted
 * attempt**, not a completed performance. Above it — or in stopwatch mode,
 * which has no target to fall short of — the session parks at `concluded` and
 * the user picks Complete / Start New / Break.
 *
 * ## A canon divergence, recorded rather than resolved silently
 *
 * `docs/Features/Performances.md` says a below-threshold finish and an abort
 * produce **no performance record at all** ("Aborted → Not recorded"). Both
 * `docs/Features/Session.md` and the shipped code say the opposite: *"Aborts
 * and below-threshold Countdown finishes are recorded as aborted attempts"*
 * (Session.md § Interactions → Performances), and `SessionSetupFeature`
 * dispatches `.taskMarkedComplete(resolution: .aborted, …)` on both paths,
 * which reaches `PerformanceService.recordSessionPerformance` and writes a
 * row. Epic #1 makes code the tie-breaker between two docs, so this port
 * follows the code: an aborted attempt **is** recorded, and earns zero points
 * under both formulas.
 *
 * The distinction is not cosmetic — `empiricalDurationPerformances` filters
 * aborted rows out of duration learning, so a recorded abort is exactly how
 * canon keeps a half-hearted attempt visible in history while keeping it out
 * of the recommendation. A "no record" reading would lose that.
 */
import type { TimeIntervalSeconds } from '../shared/TimeInterval'
import { PerformResolution } from '../endeavor/Perform'
import { FocusTimerMode } from './FocusTimerMode'

/** Canon's `0.3` literal. */
export const SESSION_ABORT_THRESHOLD_RATIO = 0.3

/** The elapsed seconds a countdown must reach to record as a real session. */
export const sessionRecordingThreshold = (
  targetDuration: TimeIntervalSeconds,
): TimeIntervalSeconds => targetDuration * SESSION_ABORT_THRESHOLD_RATIO

/**
 * Whether a finish-early counts as a completed performance rather than an
 * aborted attempt.
 *
 * The comparison is canon's `elapsed < target * 0.3`, negated — so **exactly**
 * 30 % passes and anything under it fails. A stopwatch session always passes:
 * canon's guard is `&&`-ed with `selectedMode == .countdown`, so the threshold
 * simply does not apply where there is no target.
 */
export const meetsPerformanceThreshold = (params: {
  readonly mode: FocusTimerMode
  readonly elapsedDuration: TimeIntervalSeconds
  readonly targetDuration: TimeIntervalSeconds
}): boolean => {
  if (params.mode !== FocusTimerMode.countdown) return true
  return (
    params.elapsedDuration >= sessionRecordingThreshold(params.targetDuration)
  )
}

/** The two shapes a finish-early can take. */
export type FinishEarlyOutcome =
  /**
   * Below threshold: the session closes immediately and records an aborted
   * attempt. The user is never offered Complete / Start New / Break.
   */
  | {
      readonly kind: 'belowThreshold'
      readonly resolution: typeof PerformResolution.aborted
    }
  /**
   * At or above threshold (or stopwatch): the session parks at `concluded`
   * carrying a `complete` resolution, and the user picks what happens next.
   */
  | {
      readonly kind: 'awaitingResolution'
      readonly resolution: typeof PerformResolution.complete
    }

/**
 * The `.userDidTapFinishEarly` decision, as a pure function.
 *
 * Note the resolution canon attaches to the *above*-threshold branch is
 * `.complete`, not `.finished` — at this moment the session has ended but the
 * task has not been marked done. `finished` is what the subsequent "Complete
 * Task" choice produces. `RewardCalculator` reads the two exactly that way.
 */
export const resolveFinishEarlyOutcome = (params: {
  readonly mode: FocusTimerMode
  readonly elapsedDuration: TimeIntervalSeconds
  readonly targetDuration: TimeIntervalSeconds
}): FinishEarlyOutcome =>
  meetsPerformanceThreshold(params)
    ? {
        kind: 'awaitingResolution',
        resolution: PerformResolution.complete,
      }
    : { kind: 'belowThreshold', resolution: PerformResolution.aborted }
