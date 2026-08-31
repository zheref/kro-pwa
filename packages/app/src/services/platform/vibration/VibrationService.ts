/**
 * Haptic feedback — the web counterpart of canon's **single** haptic site.
 *
 * Canon fires exactly one kind of haptic, in one file:
 * `KroUI/Plan/TimelineDayView.swift` calls
 * `UIImpactFeedbackGenerator(style: .medium).impactOccurred()` when a hold on
 * the timeline arms quick-create or edit mode — and its own comment states the
 * rule that keeps it single: *"The haptic is the hold's confirmation, so it
 * fires only for a hold; a double-tap already confirms itself visually and
 * needs no buzz."* Everything else in canon (taps, drags, completions) is
 * silent.
 *
 * So this Service is deliberately narrow. It exposes a generic `vibrate` —
 * the platform primitive — and one named constant for the site canon actually
 * has, `TIMELINE_HOLD_VIBRATION_MS`. A second haptic site is a product
 * decision, not a service change.
 *
 * `navigator.vibrate` is absent on iOS Safari and on desktop, which is the
 * majority of Kro Web's surface. That is not a failure: the call returns
 * `false` and nothing else changes, matching canon's own `#if os(iOS)` guard
 * around the generator.
 */
import fixtures from './vibration.fixtures.json'

/**
 * A single ~20 ms pulse — the closest web equivalent of UIKit's `.medium`
 * impact, which is a short single thud rather than a pattern.
 */
export const TIMELINE_HOLD_VIBRATION_MS = 20

export interface VibrationService {
  isSupported(): boolean
  /**
   * Fires the pattern. `false` when the platform has no vibrator or the call
   * was refused — never a throw, so a caller needs no `try`.
   */
  vibrate(pattern: number | readonly number[]): boolean
  /**
   * Canon's one haptic: the timeline hold's confirmation. Named rather than
   * left to callers passing `20` so the *site* is the vocabulary and a second
   * one has to be added here, in the open, rather than invented at a call site.
   */
  vibrateForTimelineHold(): boolean
}

/** The one `navigator` member this service touches. */
export interface VibrationNavigatorLike {
  vibrate(pattern: number | number[]): boolean
}

export interface LiveVibrationServiceOptions {
  readonly navigator?: VibrationNavigatorLike | null
}

const defaultNavigator = (): VibrationNavigatorLike | null => {
  if (typeof navigator === 'undefined') return null
  const candidate = navigator as Navigator & {
    vibrate?: (pattern: number | number[]) => boolean
  }
  if (typeof candidate.vibrate !== 'function') return null
  return { vibrate: (pattern) => candidate.vibrate?.(pattern) ?? false }
}

export const makeLiveVibrationService = (
  options: LiveVibrationServiceOptions = {},
): VibrationService => {
  const nav =
    options.navigator === undefined ? defaultNavigator() : options.navigator

  return {
    isSupported: () => nav !== null,
    vibrate: (pattern) => {
      if (!nav) return false
      try {
        return nav.vibrate(typeof pattern === 'number' ? pattern : [...pattern])
      } catch {
        // A refused vibration is not worth a log, let alone a failure: the
        // whole feature is a 20 ms confirmation of a gesture that already
        // confirmed itself visually.
        return false
      }
    },
    // `this`, so a suite that spreads the binding to override `vibrate` sees
    // its override honoured here too.
    vibrateForTimelineHold(this: VibrationService) {
      return this.vibrate(TIMELINE_HOLD_VIBRATION_MS)
    },
  }
}

// ---------------------------------------------------------------------------
// The stub
// ---------------------------------------------------------------------------

export interface StubbedVibrationServiceOptions {
  readonly supported?: boolean
}

export interface StubbedVibrationService extends VibrationService {
  /** Every pattern actually fired, in order. */
  recordedPatterns(): readonly (number | readonly number[])[]
}

const fixtureSupported = fixtures.supported as boolean

export const makeStubbedVibrationService = (
  options: StubbedVibrationServiceOptions = {},
): StubbedVibrationService => {
  const supported = options.supported ?? fixtureSupported
  const patterns: (number | readonly number[])[] = []

  return {
    isSupported: () => supported,
    vibrate: (pattern) => {
      if (!supported) return false
      patterns.push(pattern)
      return true
    },
    vibrateForTimelineHold(this: VibrationService) {
      return this.vibrate(TIMELINE_HOLD_VIBRATION_MS)
    },
    recordedPatterns: () => patterns,
  }
}

export const liveVibrationService: VibrationService = makeLiveVibrationService()

export const stubbedVibrationService: VibrationService =
  makeStubbedVibrationService()
