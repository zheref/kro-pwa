/**
 * `SessionLaunchRecommendation` and the duration learning behind it — canon
 * `KroCore/Model/Session/Index.swift` (the type) and
 * `KroCore/Model/Endeavor/Endeavor+Computed.swift` (`empiricalDurationPerformances`,
 * `empiricalDuration`, `sessionLaunchRecommendation`).
 *
 * #7 ported `Endeavor+Computed.swift` and deliberately left these three
 * behind — "session math, explicitly #8" — so they land here, as functions
 * over an `Endeavor` rather than methods on it. `domain/session` depends on
 * `domain/endeavor`; nothing points back, so there is no cycle.
 *
 * ## The priority, in one place (`docs/Features/Session.md` § Launch recommendation)
 *
 * 1. a **user-authored preferred** duration → Countdown at that duration;
 * 2. else, with duration learning on, **≥3 qualifying** completed focus
 *    performances → Countdown at their rounded mean, inside the bounds;
 * 3. else **Stopwatch**, when stopwatch is available;
 * 4. else the configured default as a **Countdown fallback**.
 *
 * The rule the ordering encodes — and the one easiest to lose in a rewrite —
 * is that **an empirical duration stays "learned" forever until the user
 * explicitly promotes it to Preferred**. Nothing here writes `endeavor.duration`;
 * step 2 is recomputed from history on every launch, so it keeps adapting.
 * Promotion is a user action (#21), and its only effect is that step 1 starts
 * matching.
 */
import type { Endeavor } from '../endeavor/Endeavor'
import { type Perform, PerformResolution } from '../endeavor/Perform'
import {
  SECONDS_PER_MINUTE,
  type TimeIntervalSeconds,
} from '../shared/TimeInterval'
import { FocusTimerMode } from './FocusTimerMode'

/** Canon requires this many qualifying samples before it will recommend one. */
export const EMPIRICAL_SAMPLE_MINIMUM = 3

/** Canon's `max(60, …)` floor on a learned duration. */
export const EMPIRICAL_DURATION_FLOOR: TimeIntervalSeconds = SECONDS_PER_MINUTE

/** `SessionLaunchRecommendation.Source`. */
export type SessionLaunchSource =
  /** The user authored a duration on the endeavor. */
  | { readonly kind: 'preferred' }
  /** Learned from history; `sampleCount` is how many performances taught it. */
  | { readonly kind: 'empirical'; readonly sampleCount: number }
  /** Nothing to go on, and stopwatch is offered. */
  | { readonly kind: 'stopwatch' }
  /** Nothing to go on and stopwatch is unavailable — the configured default. */
  | { readonly kind: 'fallback' }

/** Constructors, so a call site never hand-assembles the literal (`RC-8`). */
export const SessionLaunchSources = {
  preferred: (): SessionLaunchSource => ({ kind: 'preferred' }),
  empirical: (sampleCount: number): SessionLaunchSource => ({
    kind: 'empirical',
    sampleCount,
  }),
  stopwatch: (): SessionLaunchSource => ({ kind: 'stopwatch' }),
  fallback: (): SessionLaunchSource => ({ kind: 'fallback' }),
}

/**
 * The resolved setup a session entry point opens with.
 *
 * `targetDuration` stays populated under `stopwatch` on purpose — canon's own
 * doc comment says so: the setup sheet can switch back to countdown without
 * losing the user's configured fallback.
 */
export interface SessionLaunchRecommendation {
  readonly mode: FocusTimerMode
  readonly targetDuration: TimeIntervalSeconds
  readonly source: SessionLaunchSource
}

export const makeSessionLaunchRecommendation = (params: {
  readonly mode: FocusTimerMode
  readonly targetDuration: TimeIntervalSeconds
  readonly source: SessionLaunchSource
}): SessionLaunchRecommendation => ({
  mode: params.mode,
  targetDuration: params.targetDuration,
  source: params.source,
})

/**
 * `empiricalDurationPerformances` — whole-session observations eligible to
 * teach Kro how long this endeavor takes.
 *
 * Three conditions, all required. `wasCompletedInSession` excludes quick
 * completes (marking a task done without a session) and isolated fragments;
 * `duration > 0` excludes zero-length records; and only `complete` or
 * `finished` qualify, which is what keeps **aborted** attempts — including
 * every below-threshold finish-early — out of the sample.
 */
export const empiricalDurationPerformances = (
  endeavor: Endeavor,
): readonly Perform[] =>
  endeavor.performances.filter(
    (performance) =>
      performance.wasCompletedInSession &&
      performance.duration > 0 &&
      (performance.resolution === PerformResolution.complete ||
        performance.resolution === PerformResolution.finished),
  )

/**
 * `empiricalDuration` — the arithmetic mean of the qualifying sample, rounded
 * to the nearest whole minute, floored at one minute and then constrained by
 * the endeavor's optional bounds. `null` below `EMPIRICAL_SAMPLE_MINIMUM`.
 *
 * Order matters and is canon's: floor first, then `minimumDuration`, then
 * `maximumDuration`. A `maximumDuration` below the `minimumDuration` therefore
 * wins — ported as-is rather than "fixed", because a repair here would make
 * the two platforms disagree on the same stored pair.
 *
 * Swift's `.rounded()` is half-away-from-zero and `Math.round` is half-up;
 * they agree for every non-negative value, and a duration is non-negative.
 */
export const empiricalDuration = (
  endeavor: Endeavor,
): TimeIntervalSeconds | null => {
  const samples = empiricalDurationPerformances(endeavor)
  if (samples.length < EMPIRICAL_SAMPLE_MINIMUM) return null

  const total = samples.reduce(
    (sum, performance) => sum + performance.duration,
    0,
  )
  const mean = total / samples.length
  let resolved = Math.max(
    EMPIRICAL_DURATION_FLOOR,
    Math.round(mean / SECONDS_PER_MINUTE) * SECONDS_PER_MINUTE,
  )
  if (endeavor.minimumDuration !== null) {
    resolved = Math.max(resolved, endeavor.minimumDuration)
  }
  if (endeavor.maximumDuration !== null) {
    resolved = Math.min(resolved, endeavor.maximumDuration)
  }
  return resolved
}

/**
 * `sessionLaunchRecommendation(isStopwatchAvailable:isDurationLearningEnabled:fallbackDuration:)`
 * — the central launch policy every session entry point shares.
 *
 * `isDurationLearningEnabled` defaults to `true`, as canon's parameter does;
 * turning it off skips step 2 entirely, so an endeavor with plenty of history
 * still opens as a Stopwatch.
 */
export const sessionLaunchRecommendation = (
  endeavor: Endeavor,
  params: {
    readonly isStopwatchAvailable: boolean
    readonly isDurationLearningEnabled?: boolean
    readonly fallbackDuration: TimeIntervalSeconds
  },
): SessionLaunchRecommendation => {
  const isDurationLearningEnabled = params.isDurationLearningEnabled ?? true

  // 1 — a user-authored preferred duration always wins.
  if (endeavor.duration !== null && endeavor.duration > 0) {
    return makeSessionLaunchRecommendation({
      mode: FocusTimerMode.countdown,
      targetDuration: endeavor.duration,
      source: SessionLaunchSources.preferred(),
    })
  }

  // 2 — learned from history, and still learning: never written back.
  if (isDurationLearningEnabled) {
    const learned = empiricalDuration(endeavor)
    if (learned !== null) {
      return makeSessionLaunchRecommendation({
        mode: FocusTimerMode.countdown,
        targetDuration: learned,
        source: SessionLaunchSources.empirical(
          empiricalDurationPerformances(endeavor).length,
        ),
      })
    }
  }

  // 3 — nothing to go on: open-ended.
  if (params.isStopwatchAvailable) {
    return makeSessionLaunchRecommendation({
      mode: FocusTimerMode.stopwatch,
      targetDuration: params.fallbackDuration,
      source: SessionLaunchSources.stopwatch(),
    })
  }

  // 4 — stopwatch is off: the configured default, as a countdown.
  return makeSessionLaunchRecommendation({
    mode: FocusTimerMode.countdown,
    targetDuration: params.fallbackDuration,
    source: SessionLaunchSources.fallback(),
  })
}
