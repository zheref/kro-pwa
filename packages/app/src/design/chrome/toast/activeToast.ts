import type { SfSymbolName } from '../../system/icons/icons'
import {
  TOAST_DURATION_SECONDS,
  clampToastDuration,
} from '../layout/chromeLayout'

/**
 * The Active Toast model.
 *
 * Port of `KroCore/Models/ActiveToast.swift` plus the behaviour in
 * `docs/Features/ActiveToast.md`. Plain values and intent closures only — no
 * store, no slice, no domain type (`RC-14`). A feature builds one of these and
 * hands it to the host; the host knows nothing about what happened.
 *
 * WHY THE ACTION CARRIES ITS CLOSURE. Canon splits the two: the model holds a
 * title and a style, and the SCREEN supplies `onPrimaryAction` alongside it,
 * because TCA's screen is the thing holding both. Here the toast is enqueued
 * imperatively from wherever the intent originated, so keeping the closure on
 * the action is what lets the call site stay one expression instead of a model
 * plus two positionally-matched handlers.
 */

/** `ActiveToast.ActionStyle`. */
export type ToastActionStyle = 'standard' | 'destructive' | 'prominent'

/** `ActiveToast.IconColor` — the semantic set, unchanged. */
export type ToastIconColor =
  | 'primary'
  | 'green'
  | 'blue'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'gray'

export interface ToastAction {
  readonly title: string
  /** `standard` — plain accent text, canon's default for "Undo". */
  readonly style?: ToastActionStyle
  readonly onSelect: () => void
}

/** What a caller hands to `enqueue`. `id` is minted for it. */
export interface ActiveToastInput {
  readonly message: string
  readonly icon?: SfSymbolName
  readonly iconColor?: ToastIconColor
  /** Canon's `iconSize`, default 16. */
  readonly iconSize?: number
  /** Reward points badge. `null`/absent hides it. */
  readonly rewardAmount?: number | null
  readonly primaryAction?: ToastAction
  readonly secondaryAction?: ToastAction
  /**
   * Auto-dismiss, in seconds. Clamped into the documented 3–12s reading
   * window; see `TOAST_DURATION_SECONDS`.
   */
  readonly duration?: number
}

/** A toast the host is showing. Identical to the input, plus identity and a settled duration. */
export interface ActiveToastModel extends Omit<ActiveToastInput, 'duration'> {
  readonly id: string
  readonly duration: number
}

let sequence = 0

/**
 * Normalises an input into a model.
 *
 * A counter rather than `crypto.randomUUID()`: the id is only ever used as a
 * React key and as the identity the dismiss timer is keyed on, both of which
 * are process-local — and a counter keeps a snapshot deterministic, which a
 * random id would not.
 */
export function toActiveToast(input: ActiveToastInput): ActiveToastModel {
  sequence += 1
  const { duration, ...rest } = input
  return {
    ...rest,
    id: `kro-toast-${sequence}`,
    duration: clampToastDuration(duration ?? TOAST_DURATION_SECONDS.default),
  }
}

/** Test seam: resets the id counter so a suite's ids start from a known point. */
export function resetActiveToastSequence(): void {
  sequence = 0
}

/**
 * The token role each semantic icon colour paints with.
 *
 * Roles rather than literals so the light/dark pairs — and the contrast suite
 * that regression-tests them — carry through. `primary` deliberately has no
 * entry: it means "the surface's own foreground", which is `--kro-color-fore`.
 */
export const TOAST_ICON_COLOR_VAR: Record<ToastIconColor, string> = {
  primary: 'var(--kro-color-fore)',
  green: 'var(--kro-color-badge-green)',
  blue: 'var(--kro-color-badge-blue)',
  orange: 'var(--kro-color-badge-orange)',
  red: 'var(--kro-color-kro-red)',
  yellow: 'var(--kro-color-reward-yellow)',
  gray: 'var(--kro-color-fore-secondary)',
}
