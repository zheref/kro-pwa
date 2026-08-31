/**
 * The Triage session's shape and its prefill — canon's
 * `TriageFeature.State` plus its `init(endeavor:…)` convenience initializer.
 *
 * Split out of `TriageFeature.ts` for the reason `RC-24` gives: the interface
 * plus its seed runs well past the ~40-line threshold at which canon's own rule
 * says a `<Name>State.ts` sibling earns its keep, and `PlanState.ts` set the
 * precedent in this repo.
 *
 * ## Why the form is a nested object rather than seven fields on the slice
 *
 * Every rule on this screen reads two or more of them together — the value↔
 * importance link reads value *and* quadrant, the effort×reward rule reads
 * effort *and* reward, the confirm gate reads quadrant *and* due date — so they
 * are one editing unit with invariants between them, which is exactly what
 * `UZF-10` says a Shifter exists to keep true. Nesting them also makes "the
 * screen is not mounted" a single `null` rather than seven fields that could
 * disagree about it.
 */
import type {
  EisenhowerQuadrant,
  EndeavorCitizenship,
  Endeavor,
} from '@kro/core'
import { defaultTriageExpiry } from './TriageExpiry'
import type { TriageDecision } from './TriageRules'
import {
  TRIAGE_DEFAULT_RATING,
  TRIAGE_DEFAULT_REWARD_POINTS,
} from './TriageRules'
import type { TriageBusyInterval } from './TriageScheduling'

/** Which stepper control was pressed. */
export type TriageRewardStepDirection = 'increment' | 'decrement'

/** The discriminants of `TriageOutcome`, named for the Shifter that raises them. */
export type TriageOutcomeKind =
  | 'dismissed'
  | 'completed'
  | 'startNow'
  | 'shared'
  | 'archived'
  | 'editRequested'

/**
 * What the shell must perform — canon's `TriageFeature.DelegateAction`.
 *
 * It lives here rather than in the slice so a Shifter can build one without
 * importing the slice that imports the Shifter.
 */
export type TriageOutcome =
  | { readonly kind: 'dismissed' }
  | { readonly kind: 'completed'; readonly decision: TriageDecision }
  | { readonly kind: 'startNow'; readonly decision: TriageDecision }
  | {
      readonly kind: 'shared'
      readonly decision: TriageDecision
      readonly text: string
    }
  | { readonly kind: 'archived'; readonly decision: TriageDecision }
  | { readonly kind: 'editRequested'; readonly endeavorId: string }

/**
 * Whether raising this outcome pops the Triage screen.
 *
 * Three of the six do **not**, and each for a stated reason:
 *
 * - `shared` — *"We do NOT dismiss the inbox sheet or pop the triage child
 *   here — when the user dismisses the share sheet the triage child pops"*, so
 *   the session ends at `onShareSheetDismissed` instead.
 * - `editRequested` — *"the Edit surface opens for the same endeavor, with
 *   Triage still mounted underneath… dismissing Edit returns the user to the
 *   still-untouched Triage screen."*
 *
 * The other four end the session immediately: canon's Inbox *"pops the screen
 * before delegating"*, and cancel discards.
 */
export const triageOutcomeEndsSession = (kind: TriageOutcomeKind): boolean =>
  kind !== 'shared' && kind !== 'editRequested'

/** The seven editable fields of the form, as one editing unit. */
export interface TriageForm {
  /** `nil` until the user taps a tile — *"the explicit user decision"*. */
  readonly quadrant: EisenhowerQuadrant | null
  readonly durationMinutes: number | null
  readonly dueDate: Date | null
  readonly expiry: Date | null
  readonly rewardPoints: number
  readonly value: number | null
  readonly effort: number | null
}

/** The open Triage screen. */
export interface TriageSession {
  readonly endeavorId: string
  readonly endeavorTitle: string
  readonly endeavorSymbol: string
  readonly form: TriageForm
  /** `durationOptionsMinutes` — the chips on offer, canon's default set. */
  readonly durationOptionsMinutes: readonly number[]
  /** Canon's parent-supplied seed. See `TriageScheduling`. */
  readonly nextFreeSlotToday: Date | null
  /** The local day's busy blocks, for the duration-aware gap search. */
  readonly busyIntervals: readonly TriageBusyInterval[]
  /** Set by the parent from the `endeavorDetail` flag — Triage stays flag-agnostic. */
  readonly isEditReachable: boolean
  /**
   * The endeavor's Kro-enhanced category **at the moment Triage opened**.
   *
   * A snapshot, because it is what makes "entering does not promote" visible:
   * a tourist that opens Triage is still a tourist here, and stays one unless
   * the user confirms.
   */
  readonly citizenshipAtEntry: EndeavorCitizenship
  /** Whether confirming will promote this row (`shouldPromoteToEnhanced`). */
  readonly willPromoteOnConfirm: boolean
  /**
   * Bumped every time the selected expiry actually changes.
   *
   * The doc's selected-first ordering ends with *"the scroll auto-resets to the
   * leading edge so the selection stays in view"*. A scroll offset is the
   * view's to own, but the **instruction** to reset it is a consequence of a
   * state change, and a view cannot infer "the expiry changed" from a value it
   * only ever sees the latest of. Canon gets this from SwiftUI's
   * `.onChange(of: selectedExpiry)`; a monotonic nonce is the same signal in a
   * form a reducer can produce and a test can count.
   */
  readonly expiryScrollNonce: number
}

/** Everything `openTriageThunk` resolves — the session's inputs, already read. */
export interface TriageSessionSeed {
  readonly endeavor: Endeavor
  readonly endeavorSymbol: string
  readonly durationOptionsMinutes: readonly number[]
  readonly busyIntervals: readonly TriageBusyInterval[]
  readonly nextFreeSlotToday: Date | null
  readonly isEditReachable: boolean
  readonly now: Date
}

/**
 * `init(endeavor:…)` — *"every field that the source endeavor already carries is
 * pre-populated"*, with canon's fallbacks:
 *
 * | field | from | fallback |
 * |---|---|---|
 * | reward points | `sessionPoints` | 10 |
 * | duration | `duration` (seconds → whole minutes) | undefined |
 * | scheduled date | `due`, else `start` | none |
 * | value | `value` | 1 rocket |
 * | effort | `effort` | 1 fire |
 * | expiry | `expiry` | one hour after the seeded scheduled date |
 *
 * **Quadrant is the only field never pre-populated** — *"it's the explicit user
 * decision the screen is built for"*.
 *
 * The duration conversion is canon's `Int($0 / 60)`, i.e. truncating: a 90-second
 * duration prefills as 1 minute, not 1.5.
 */
export const triageFormFromEndeavor = (endeavor: Endeavor): TriageForm => {
  const scheduled = endeavor.due ?? endeavor.start
  return {
    quadrant: null,
    durationMinutes:
      // A non-positive stored duration (zero-length calendar events exist)
      // prefills as "no estimate yet" — 0 maps to no chip and would fake the
      // irreversibility state. Sub-minute durations truncate to 1, not 0.
      endeavor.duration === null || endeavor.duration <= 0
        ? null
        : Math.max(1, Math.trunc(endeavor.duration / 60)),
    dueDate: scheduled,
    expiry: endeavor.expiry ?? defaultTriageExpiry(scheduled),
    rewardPoints: endeavor.sessionPoints ?? TRIAGE_DEFAULT_REWARD_POINTS,
    value: endeavor.value ?? TRIAGE_DEFAULT_RATING,
    effort: endeavor.effort ?? TRIAGE_DEFAULT_RATING,
  }
}

/** `endeavorSymbol: String = "📌"` — the header glyph's default. */
export const TRIAGE_DEFAULT_SYMBOL = '📌'
