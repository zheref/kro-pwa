/**
 * The Duration profile — the port of canon's `EndeavorDurationFeature`,
 * `EndeavorDurationSelectors` and `EndeavorDurationShifters`.
 *
 * Three optional bounds the user authors — preferred, minimum, maximum — over
 * one number the app **observes**: the empirical duration, computed from the
 * endeavor's completed focus sessions.
 *
 * ## Observed focus time is read-only, and that is the point
 *
 * `empiricalDuration` (#8, `@kro/core`) is the mean of the qualifying
 * performances. It seeds the drafts so a user who has never authored a
 * preference still sees a sensible number, but **enabling** a bound is an
 * explicit act — canon's own note: *"Empirical history prefills the draft
 * without silently turning the learned value into an authored preference. The
 * user must explicitly enable Preferred to freeze that recommendation."* So the
 * observation is never written back, and nothing here can write it.
 *
 * Everything in this file is pure. Nothing formats — the surface turns seconds
 * into "25 min", because this tier has no locale.
 */
import {
  EMPIRICAL_SAMPLE_MINIMUM,
  type Endeavor,
  type TimeIntervalSeconds,
  empiricalDuration,
  empiricalDurationPerformances,
  minutesInSeconds,
} from '@kro/core'

/** Canon's fallback seed when nothing is authored and nothing is observed. */
export const DEFAULT_DURATION_SEED: TimeIntervalSeconds = minutesInSeconds(25)

/** Which of the three bounds a toggle or an adjustment is about. */
export const DurationBound = {
  preferred: 'preferred',
  minimum: 'minimum',
  maximum: 'maximum',
} as const

export type DurationBound = (typeof DurationBound)[keyof typeof DurationBound]

/** Every bound, in canon's display order. */
export const durationBounds: readonly DurationBound[] = [
  DurationBound.preferred,
  DurationBound.minimum,
  DurationBound.maximum,
]

/**
 * The three drafts and their switches.
 *
 * A draft survives its switch being turned off, so toggling a bound off and
 * back on restores the number the user had dialled rather than resetting it —
 * canon keeps the draft and the switch as separate fields for exactly that.
 */
export interface EndeavorDurationDraft {
  readonly preferredSeconds: TimeIntervalSeconds
  readonly minimumSeconds: TimeIntervalSeconds
  readonly maximumSeconds: TimeIntervalSeconds
  readonly isPreferredEnabled: boolean
  readonly isMinimumEnabled: boolean
  readonly isMaximumEnabled: boolean
}

/**
 * Canon's `EndeavorDurationFeature.State.init`, value for value.
 *
 * The seed ladder is `duration ?? empirical ?? 25 min` for preferred, and
 * `<own bound> ?? duration ?? empirical ?? seed` for the two others — so a
 * profile with only a preferred value opens with all three dials agreeing
 * instead of two of them sitting at zero.
 */
export const durationDraftFor = (endeavor: Endeavor): EndeavorDurationDraft => {
  const observed = empiricalDuration(endeavor)
  const seed = endeavor.duration ?? observed ?? DEFAULT_DURATION_SEED
  return {
    preferredSeconds: seed,
    minimumSeconds:
      endeavor.minimumDuration ?? endeavor.duration ?? observed ?? seed,
    maximumSeconds:
      endeavor.maximumDuration ?? endeavor.duration ?? observed ?? seed,
    isPreferredEnabled: endeavor.duration !== null,
    isMinimumEnabled: endeavor.minimumDuration !== null,
    isMaximumEnabled: endeavor.maximumDuration !== null,
  }
}

/** One bound's switch flipped. The draft number is untouched. */
export const draftWithBoundToggled = (
  draft: EndeavorDurationDraft,
  bound: DurationBound,
  isEnabled: boolean,
): EndeavorDurationDraft => {
  switch (bound) {
    case DurationBound.minimum:
      return { ...draft, isMinimumEnabled: isEnabled }
    case DurationBound.maximum:
      return { ...draft, isMaximumEnabled: isEnabled }
    default:
      return { ...draft, isPreferredEnabled: isEnabled }
  }
}

/** One bound's number dialled. Its switch is untouched. */
export const draftWithBoundAdjusted = (
  draft: EndeavorDurationDraft,
  bound: DurationBound,
  seconds: TimeIntervalSeconds,
): EndeavorDurationDraft => {
  switch (bound) {
    case DurationBound.minimum:
      return { ...draft, minimumSeconds: seconds }
    case DurationBound.maximum:
      return { ...draft, maximumSeconds: seconds }
    default:
      return { ...draft, preferredSeconds: seconds }
  }
}

/**
 * The draft as the three nullable columns the domain stores: a disabled bound
 * writes `null`, which is what "the user has authored no preference" means.
 */
export const durationProfileOf = (
  draft: EndeavorDurationDraft,
): {
  readonly preferred: TimeIntervalSeconds | null
  readonly minimum: TimeIntervalSeconds | null
  readonly maximum: TimeIntervalSeconds | null
} => ({
  preferred: draft.isPreferredEnabled ? draft.preferredSeconds : null,
  minimum: draft.isMinimumEnabled ? draft.minimumSeconds : null,
  maximum: draft.isMaximumEnabled ? draft.maximumSeconds : null,
})

/**
 * Canon's one validation rule: an enabled minimum above an enabled maximum.
 * `null` when the profile is fine.
 */
export const durationValidationMessage = (
  draft: EndeavorDurationDraft,
): string | null =>
  draft.isMinimumEnabled &&
  draft.isMaximumEnabled &&
  draft.minimumSeconds > draft.maximumSeconds
    ? 'Minimum duration must not exceed maximum duration.'
    : null

/**
 * The read-only "Observed focus time" card.
 *
 * `seconds` is `null` below the sample minimum — the card then says how many
 * sessions are still needed rather than showing an average of one data point.
 */
export interface ObservedFocusTime {
  /** The empirical average, or `null` while the sample is too small. */
  readonly seconds: TimeIntervalSeconds | null
  /** How many performances qualified — canon's `empiricalSampleCount`. */
  readonly sampleCount: number
  /** The minimum sample the recommendation unlocks at. */
  readonly requiredSampleCount: number
}

/**
 * Compute the observed focus time from the endeavor's performances.
 *
 * Both halves come from `@kro/core`: which performances qualify (whole
 * sessions, non-zero, completed or finished — never an aborted attempt) and how
 * they average. Recomputing either here would let the Duration surface and the
 * session recommendation disagree about the same endeavor.
 */
export const observedFocusTime = (endeavor: Endeavor): ObservedFocusTime => ({
  seconds: empiricalDuration(endeavor),
  sampleCount: empiricalDurationPerformances(endeavor).length,
  requiredSampleCount: EMPIRICAL_SAMPLE_MINIMUM,
})
