/**
 * `SessionLaunchRecommendation` fixtures — `RC-13`.
 *
 * One per source at minimum, because the source **is** the interesting axis:
 * the four cases are the four rungs of the launch priority, and a surface that
 * renders "learned from 4 sessions" differently from "your preferred duration"
 * needs all of them.
 */
import { hoursInSeconds, minutesInSeconds } from '../../shared/TimeInterval'
import { FocusTimerMode } from '../FocusTimerMode'
import {
  type SessionLaunchRecommendation,
  SessionLaunchSources,
  makeSessionLaunchRecommendation,
} from '../SessionLaunchRecommendation'

export const sessionLaunchRecommendationMocks = {
  // ---------------------------------------------------------------- convenient

  /** Rung 1: the user authored 45 minutes on the endeavor. */
  preferred: makeSessionLaunchRecommendation({
    mode: FocusTimerMode.countdown,
    targetDuration: minutesInSeconds(45),
    source: SessionLaunchSources.preferred(),
  }),

  /** Rung 2: learned from four qualifying performances. */
  empirical: makeSessionLaunchRecommendation({
    mode: FocusTimerMode.countdown,
    targetDuration: minutesInSeconds(28),
    source: SessionLaunchSources.empirical(4),
  }),

  /** Rung 3: nothing to go on, so open-ended. */
  stopwatch: makeSessionLaunchRecommendation({
    mode: FocusTimerMode.stopwatch,
    targetDuration: hoursInSeconds(3),
    source: SessionLaunchSources.stopwatch(),
  }),

  // ------------------------------------------------------------------- neutral

  /** Rung 4: stopwatch unavailable, so the configured default as a countdown. */
  fallback: makeSessionLaunchRecommendation({
    mode: FocusTimerMode.countdown,
    targetDuration: minutesInSeconds(25),
    source: SessionLaunchSources.fallback(),
  }),

  // -------------------------------------------------------------- inconvenient

  /**
   * Empirical at the bare minimum sample count. A copy reading "learned from
   * your last 3 sessions" has no plural fallback below this.
   */
  empiricalAtMinimumSamples: makeSessionLaunchRecommendation({
    mode: FocusTimerMode.countdown,
    targetDuration: minutesInSeconds(1),
    source: SessionLaunchSources.empirical(3),
  }),

  /**
   * Empirical from a very large history — a four-digit sample count, which a
   * fixed-width badge has to survive.
   */
  empiricalFromLongHistory: makeSessionLaunchRecommendation({
    mode: FocusTimerMode.countdown,
    targetDuration: minutesInSeconds(52),
    source: SessionLaunchSources.empirical(1284),
  }),

  /**
   * A **zero** target under stopwatch. Canon keeps `targetDuration` populated
   * under stopwatch so the sheet can toggle back to countdown without losing
   * it — this is what happens when there was nothing to keep.
   */
  stopwatchWithZeroTarget: makeSessionLaunchRecommendation({
    mode: FocusTimerMode.stopwatch,
    targetDuration: 0,
    source: SessionLaunchSources.stopwatch(),
  }),

  /** A 12-hour preferred duration — the far end of any dial. */
  preferredMarathon: makeSessionLaunchRecommendation({
    mode: FocusTimerMode.countdown,
    targetDuration: hoursInSeconds(12),
    source: SessionLaunchSources.preferred(),
  }),
} satisfies Record<string, SessionLaunchRecommendation>

/** Every fixture, for suites asserting a property across the whole spread. */
export const allSessionLaunchRecommendationMocks: readonly SessionLaunchRecommendation[] =
  Object.values(sessionLaunchRecommendationMocks)
