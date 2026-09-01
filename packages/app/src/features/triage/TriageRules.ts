/**
 * The Triage form's pure rules — the port of canon's `TriageFeature.State`
 * helpers, `TriageShifters.swift`, `TriageSelectors.swift` and the arithmetic
 * `KroUI/Triage/TriageView.swift` keeps in its private view structs.
 *
 * Everything here is a **pure function of its arguments**. No clock, no store,
 * no service: `now` always arrives as a parameter, exactly as `CaptureRules`
 * does, so "picking Schedule seeds a week out" is a plain unit test rather than
 * a mocked global (`UZF-10`, `UZF-11`).
 *
 * ## Why arithmetic that canon keeps in the View lives here
 *
 * Canon puts the reward stepper's ±5/±10 rule, the duration chip labels and the
 * expiry preset maths inside private SwiftUI structs, because SwiftUI's view
 * layer is the only consumer. The epic's contract for this stack is the
 * opposite — *"every rule a pure reducer/shifter; UI carries zero arithmetic"*
 * — so each of those moves down here and #26 renders the result. The rules are
 * canon's, unchanged; only their address is different.
 *
 * ## The one shape canon's reducer allows and its View never sends
 *
 * `userDidSelectDuration` takes an `Int?` and assigns it straight through, so
 * the *reducer* can revert a duration to undefined. Its only call site —
 * `DurationPicker` — offers no Skip chip and only ever calls `onSelect(mins)`
 * with a real chip value, and both the doc's *Core concepts* and its *Layout*
 * section state the rule as irreversible ("once the user picks a chip the value
 * can be changed to another chip but not reverted to undefined... There is no
 * 'Skip' affordance"). `triageDurationSelection` binds the shipped behaviour;
 * the divergence from the reducer's *signature* is recorded in the PR.
 */
import {
  EisenhowerQuadrant,
  assertNever,
  endeavorShareText,
  quadrantImportantSibling,
  quadrantIsImportant,
} from '@kro/core'

// ---------------------------------------------------------------------------
// Reward points — the inline stepper
// ---------------------------------------------------------------------------

/** `rewardPoints: Int = 10` — the State's own default. */
export const TRIAGE_DEFAULT_REWARD_POINTS = 10
/** `NumericStepper.lowerBound`. */
export const MINIMUM_TRIAGE_REWARD_POINTS = 1
/** `NumericStepper.upperBound`. */
export const MAXIMUM_TRIAGE_REWARD_POINTS = 999
/** The value at which the stepper's grain widens. */
export const TRIAGE_REWARD_STEP_THRESHOLD = 50

/**
 * `NumericStepper.step(at:)` — *"Increments by 5 when the count is below 50 and
 * by 10 above"*.
 *
 * The step is read from the **current** value on both directions, which is why
 * 50 decrements to 40 (step 10) rather than to 45: the control asks what grain
 * *this* number sits on, not what grain the destination will sit on.
 */
export const triageRewardStep = (current: number): number =>
  current >= TRIAGE_REWARD_STEP_THRESHOLD ? 10 : 5

/** Canon's clamp — 1…999, applied wherever the value is set. */
export const clampTriageRewardPoints = (points: number): number =>
  Math.min(
    MAXIMUM_TRIAGE_REWARD_POINTS,
    Math.max(MINIMUM_TRIAGE_REWARD_POINTS, Math.trunc(points)),
  )

/** The stepper's minus control: `max(lowerBound, points - step(at: points))`. */
export const triageRewardDecremented = (current: number): number =>
  Math.max(MINIMUM_TRIAGE_REWARD_POINTS, current - triageRewardStep(current))

/** The stepper's plus control: `min(upperBound, points + step(at: points))`. */
export const triageRewardIncremented = (current: number): number =>
  Math.min(MAXIMUM_TRIAGE_REWARD_POINTS, current + triageRewardStep(current))

// ---------------------------------------------------------------------------
// The two 1–5 ratings
// ---------------------------------------------------------------------------

export const MINIMUM_TRIAGE_RATING = 1
export const MAXIMUM_TRIAGE_RATING = 5

/**
 * `value: Int? = 1` / `effort: Int? = 1` — *"the user always opens onto a
 * non-empty rating rather than an empty row"*. Both ratings stay **clearable**
 * (tapping the lit icon sets `nil`); this is only the seed.
 */
export const TRIAGE_DEFAULT_RATING = 1

/** `ValueSection.labels` — the rocket descriptors, in order. */
export const triageValueLabels: readonly string[] = [
  'Trivial',
  'Minor',
  'Meaningful',
  'Major',
  'Life-changing',
]

/** `EffortSection.labels` — the fire descriptors, in order. */
export const triageEffortLabels: readonly string[] = [
  'Autopilot',
  'Easy',
  'Cumbersome',
  'Hard',
  'Grueling',
]

const labelForRating = (
  labels: readonly string[],
  rating: number | null,
): string | null => {
  if (rating === null) return null
  return labels[rating - 1] ?? null
}

/** The descriptor shown in the leading half of the Value row. */
export const triageValueLabel = (rating: number | null): string | null =>
  labelForRating(triageValueLabels, rating)

/** The descriptor shown in the leading half of the Effort row. */
export const triageEffortLabel = (rating: number | null): string | null =>
  labelForRating(triageEffortLabels, rating)

/**
 * `RatingRow`'s tap rule: *"Tapping the current rating clears it."* Tapping any
 * other step selects it.
 */
export const triageRatingSelection = (
  current: number | null,
  tapped: number,
): number | null => (current === tapped ? null : tapped)

// ---------------------------------------------------------------------------
// Value ↔ importance — the one-way link
// ---------------------------------------------------------------------------

/** *"Setting value to 3 rockets or more"* — the promotion threshold. */
export const IMPORTANT_VALUE_THRESHOLD = 3

/**
 * The quadrant a new value rating implies — `applyValueChange`'s promotion
 * half.
 *
 * *"Promotion preserves the urgency axis the user already chose (Delegate →
 * Prioritize, Archive → Schedule) and defaults to Schedule when no quadrant was
 * picked yet."* Below the threshold, and for a quadrant already in the
 * Important row, the current quadrant comes back unchanged — **the reverse
 * direction is never enforced**: *"lowering value below 3 doesn't change the
 * quadrant."*
 */
export const quadrantPromotedByValue = (
  current: EisenhowerQuadrant | null,
  value: number | null,
): EisenhowerQuadrant | null => {
  if (value === null || value < IMPORTANT_VALUE_THRESHOLD) return current
  if (current === null) return EisenhowerQuadrant.decide
  if (quadrantIsImportant(current)) return current
  return quadrantImportantSibling(current)
}

/**
 * The value a newly picked quadrant implies — `applyQuadrantSelected`'s
 * `if quadrant.isImportant, (self.value ?? 0) < 3 { self.value = 3 }`.
 *
 * Note `(value ?? 0)`: a **cleared** rating counts as 0 and is therefore bumped
 * to 3 by an Important quadrant, rather than being left cleared. And note what
 * this never does — *"picking a Not-Important quadrant doesn't pull value
 * down"*, so `delegate` and `delete` return the rating untouched, cleared
 * included.
 */
export const valueBumpedByQuadrant = (
  quadrant: EisenhowerQuadrant,
  value: number | null,
): number | null => {
  if (!quadrantIsImportant(quadrant)) return value
  return (value ?? 0) < IMPORTANT_VALUE_THRESHOLD
    ? IMPORTANT_VALUE_THRESHOLD
    : value
}

// ---------------------------------------------------------------------------
// Effort × reward
// ---------------------------------------------------------------------------

/**
 * `applyEffortChange`'s multiplier — *"increasing the effort rating multiplies
 * the current reward by the same ratio (2 fires → 4 fires doubles reward; 2
 * fires → 3 fires is 1.5×). Decreasing effort leaves reward untouched."*
 *
 * Four guards, all canon's, and each one is a real branch:
 *
 * - the **new** rating must exist and be ≥ 1 — clearing effort scales nothing;
 * - the **previous** rating must exist and be ≥ 1 — there is no ratio to take
 *   against a cleared rating, so 1 → 5 from cleared leaves reward alone;
 * - the change must be an **increase** — equal or lower leaves reward alone,
 *   *"so users can lower without losing earned points"*.
 *
 * The rounding is `Int((Double(reward) * ratio).rounded())`, i.e. half away
 * from zero; `Math.round` rounds half toward `+∞`, which agrees for every
 * reachable value because rewards are ≥ 1 and ratios are > 1.
 */
export const rewardScaledForEffortChange = (params: {
  readonly rewardPoints: number
  readonly previousEffort: number | null
  readonly nextEffort: number | null
}): number => {
  const { rewardPoints, previousEffort, nextEffort } = params
  if (nextEffort === null || nextEffort < MINIMUM_TRIAGE_RATING) {
    return rewardPoints
  }
  if (previousEffort === null || previousEffort < MINIMUM_TRIAGE_RATING) {
    return rewardPoints
  }
  if (nextEffort <= previousEffort) return rewardPoints
  const ratio = nextEffort / previousEffort
  return clampTriageRewardPoints(Math.round(rewardPoints * ratio))
}

// ---------------------------------------------------------------------------
// Duration chips
// ---------------------------------------------------------------------------

/** `durationChipLabel(minutes:)`, verbatim — three special cases, then "N min". */
export const triageDurationChipLabel = (minutes: number): string => {
  switch (minutes) {
    case 1:
      return 'A minute'
    case 120:
      return '2 hours'
    case 180:
      return '3 hours'
    default:
      return `${minutes} min`
  }
}

/**
 * The irreversibility rule: **a `null` selection is always a no-op**.
 *
 * Before any pick the value is already `null`, so a `null` changes nothing;
 * after a pick, reverting to undefined is exactly what the doc forbids. Stating
 * it as one predicate means the Shifter cannot forget it and the reducer arm
 * has no second path to the same field.
 *
 * A non-positive minute count is refused for the same reason a duration of zero
 * is not a chip: it would make the gap search below match every gap.
 */
export const triageDurationSelection = (
  current: number | null,
  picked: number | null,
): number | null => {
  if (picked === null) return current
  if (!Number.isFinite(picked) || picked <= 0) return current
  return Math.trunc(picked)
}

/** `selectedDurationMinutes.map { TimeInterval($0 * 60) }` — chips are minutes. */
export const triageDurationSeconds = (minutes: number | null): number | null =>
  minutes === null ? null : minutes * 60

// ---------------------------------------------------------------------------
// The bottom action row
// ---------------------------------------------------------------------------

/** `TriageSecondaryAction` — the quadrant-specific button beside Complete Only. */
export const TriageSecondaryAction = {
  startNow: 'startNow',
  share: 'share',
  archive: 'archive',
} as const

export type TriageSecondaryAction =
  (typeof TriageSecondaryAction)[keyof typeof TriageSecondaryAction]

/**
 * `secondaryActionSelector` — Prioritize offers Start Now, Delegate offers
 * Share, Archive offers Archive, and **Schedule offers nothing**: *"Complete
 * Only alone (no secondary)"*.
 */
export const triageSecondaryAction = (
  quadrant: EisenhowerQuadrant | null,
): TriageSecondaryAction | null => {
  if (quadrant === null) return null
  switch (quadrant) {
    case EisenhowerQuadrant.prioritize:
      return TriageSecondaryAction.startNow
    case EisenhowerQuadrant.delegate:
      return TriageSecondaryAction.share
    case EisenhowerQuadrant.delete:
      return TriageSecondaryAction.archive
    case EisenhowerQuadrant.decide:
      return null
    default:
      return assertNever(quadrant)
  }
}

/**
 * `primaryActionLabelSelector` — the full label while the row is one button
 * wide, shortened once a sibling has to fit beside it.
 */
export const triagePrimaryActionLabel = (
  quadrant: EisenhowerQuadrant | null,
): string => (quadrant === null ? 'Complete Triage' : 'Complete Only')

/**
 * `TriageFeature.shareText(for:)` — the Kro-branded blurb, verbatim.
 *
 * The sentence itself moved into `@kro/core` (KC-IS-#71 item 18), because
 * Find's `share` row operation hands off the same one and a feature may not
 * import a sibling feature's module. This is the name Triage calls it by.
 */
export const triageShareText = endeavorShareText

// ---------------------------------------------------------------------------
// The confirm gate
// ---------------------------------------------------------------------------

/**
 * What is standing between the form and a confirmation.
 *
 * Canon computes only a boolean (`canConfirmSelector`), because a disabled
 * SwiftUI button carries no explanation. The epic's a11y contract requires the
 * opposite — *"disabled submit controls name what blocks them"* — so the
 * boolean is derived from a **named reason** here rather than the other way
 * round, exactly as `CaptureBlocker` is.
 */
export const TriageBlocker = {
  missingQuadrant: 'missingQuadrant',
  missingScheduledDate: 'missingScheduledDate',
} as const

export type TriageBlocker = (typeof TriageBlocker)[keyof typeof TriageBlocker]

/** The gate's inputs — the two fields `canConfirmSelector` reads, and no more. */
export interface TriageGateInputs {
  readonly quadrant: EisenhowerQuadrant | null
  readonly dueDate: Date | null
}

/**
 * The one blocker to report, or `null` when Complete is enabled.
 *
 * Order matters: with no quadrant the screen has *"nothing meaningful to
 * confirm yet"*, so that is reported first even though a date is also missing.
 * **Archive is the exemption** — *"the one quadrant where Complete Only does
 * not require a scheduled date"*.
 */
export const triageBlocker = (
  inputs: TriageGateInputs,
): TriageBlocker | null => {
  if (inputs.quadrant === null) return TriageBlocker.missingQuadrant
  if (inputs.quadrant === EisenhowerQuadrant.delete) return null
  return inputs.dueDate === null ? TriageBlocker.missingScheduledDate : null
}

/** The copy a disabled Complete announces. */
export const triageBlockerReason = (blocker: TriageBlocker): string => {
  switch (blocker) {
    case TriageBlocker.missingQuadrant:
      return 'Pick a quadrant to complete this triage.'
    case TriageBlocker.missingScheduledDate:
      return 'Add a scheduled date to complete this triage.'
    default:
      return assertNever(blocker)
  }
}

/** The reason string for a form, or `null` when nothing blocks confirmation. */
export const triageBlockedReason = (
  inputs: TriageGateInputs,
): string | null => {
  const blocker = triageBlocker(inputs)
  return blocker === null ? null : triageBlockerReason(blocker)
}

/** `canConfirmSelector` — quadrant always, plus a date for every quadrant but Archive. */
export const canConfirmTriage = (inputs: TriageGateInputs): boolean =>
  triageBlocker(inputs) === null

// ---------------------------------------------------------------------------
// The decision
// ---------------------------------------------------------------------------

/**
 * `TriageDecision` — *"the bundle of choices returned to the parent on
 * confirmation"*, field for field with `KroCore/Domain/Triage/TriageDecision`.
 *
 * Every optional means the same thing it means in canon: **`null` leaves the
 * endeavor's existing value untouched**, it does not clear it. That is why the
 * ratings are `number | null` rather than defaulted here — a user who clears
 * the Value rocket sends `null`, and canon's `applyTriageDecision` then leaves
 * whatever the endeavor already had. The port keeps that (and names it in the
 * PR, because it means Triage can never *clear* a rating, only raise one).
 */
export interface TriageDecision {
  readonly endeavorId: string
  readonly quadrant: EisenhowerQuadrant
  /** Seconds. `null` keeps the endeavor's current duration. */
  readonly durationSeconds: number | null
  readonly dueDate: Date | null
  readonly rewardPoints: number | null
  readonly value: number | null
  readonly effort: number | null
  readonly expiryDate: Date | null
}

/** Everything `currentDecisionSelector` reads off the form. */
export interface TriageDecisionInputs extends TriageGateInputs {
  readonly endeavorId: string
  readonly durationMinutes: number | null
  readonly rewardPoints: number
  readonly value: number | null
  readonly effort: number | null
  readonly expiry: Date | null
}

/**
 * `currentDecisionSelector` — the decision, or `null` when the gate is closed.
 *
 * One builder for all four button arms, as canon has it: *"All four button-tap
 * reducer arms use this so the decision payload is built in one place."*
 */
export const triageDecisionFrom = (
  inputs: TriageDecisionInputs,
): TriageDecision | null => {
  if (!canConfirmTriage(inputs) || inputs.quadrant === null) return null
  return {
    endeavorId: inputs.endeavorId,
    quadrant: inputs.quadrant,
    durationSeconds: triageDurationSeconds(inputs.durationMinutes),
    dueDate: inputs.dueDate,
    rewardPoints: inputs.rewardPoints,
    value: inputs.value,
    effort: inputs.effort,
    expiryDate: inputs.expiry,
  }
}

/**
 * Whether a secondary action may fire for this decision — canon guards each
 * arm on the quadrant as well as on the decision (`state.selectedQuadrant ==
 * .prioritize`, `== .delegate`, `== .delete`), so a Share dispatched on a
 * Prioritize triage is a no-op rather than a mis-labelled share.
 */
export const triageSecondaryActionMatches = (
  action: TriageSecondaryAction,
  quadrant: EisenhowerQuadrant | null,
): boolean => triageSecondaryAction(quadrant) === action
