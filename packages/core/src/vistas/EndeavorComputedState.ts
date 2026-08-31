/**
 * `EndeavorComputedState` — canon `KroCore/Vistas/EndeavorComputedState.swift`.
 *
 * The closed catalog of *derived* conditions a lens can hide. Unlike
 * `EndeavorStatus`, which is a stored field, each case here is built from
 * several fields at once (status + due date + completion date + the clock), so
 * it cannot live on the endeavor and cannot be answered without a `now`.
 *
 * Used by Do today (its overdue / expired / completed-today toggles), and
 * available to any vista whose lens exposes `UserFilter.computedStates`.
 *
 * ## What the port changes, and why
 *
 * - **`now` is a parameter, not a default.** Canon already requires it for
 *   exactly this reason ("the device wall-clock is never consulted"); the port
 *   keeps that and gains nothing to change.
 * - **`resolvedKind` is read as `kind`.** Canon guards each case on
 *   `endeavor.resolvedKind`, the kind after source reconciliation resolves a
 *   shadow's provider metadata. That reconciliation is #12's lane and does not
 *   exist here yet, and until it does `kind` **is** the resolved kind for every
 *   endeavor in the system. When #12 lands, these three guards are the call
 *   sites to revisit.
 */
import type { Endeavor } from '../domain/endeavor/Endeavor'
import { hasBeenCompleted } from '../domain/endeavor/EndeavorComputed'
import { EndeavorKind } from '../domain/endeavor/EndeavorKind'
import { EndeavorStatus } from '../domain/endeavor/EndeavorStatus'
import { PerformResolution } from '../domain/endeavor/Perform'
import { isSameCalendarDay } from '../domain/shared/TimeInterval'
import { assertNever } from '../library/assertNever'

export const EndeavorComputedState = {
  /** Past-due **and** due-today: the "should have been done by now" state. */
  overdue: 'overdue',
  /** Past-due and **not** due-today: long-overdue. */
  expired: 'expired',
  /** Completed within today's calendar day. */
  completedToday: 'completedToday',
} as const

export type EndeavorComputedState =
  (typeof EndeavorComputedState)[keyof typeof EndeavorComputedState]

/** `EndeavorComputedState.allCases`, in canon declaration order. */
export const endeavorComputedStates: readonly EndeavorComputedState[] = [
  EndeavorComputedState.overdue,
  EndeavorComputedState.expired,
  EndeavorComputedState.completedToday,
]

/** `EndeavorComputedState(rawValue:)` — narrows a raw string, or `null`. */
export const endeavorComputedStateFromRawValue = (
  raw: string,
): EndeavorComputedState | null =>
  endeavorComputedStates.find((state) => state === raw) ?? null

/** The kinds canon lets go overdue / expire: tasks and habits only. */
const OVERDUE_KINDS: readonly EndeavorKind[] = [
  EndeavorKind.task,
  EndeavorKind.habit,
]

/** The kinds canon counts as completable today — habits' third sibling. */
const COMPLETABLE_KINDS: readonly EndeavorKind[] = [
  EndeavorKind.task,
  EndeavorKind.habit,
  EndeavorKind.reminder,
]

/**
 * The latest `completedAt` across the endeavor's **complete** performances, or
 * `null` when it has none. Canon's fallback for a closed occurrence whose
 * host-native `completed` timestamp never came back.
 */
const latestPerformanceCompletion = (endeavor: Endeavor): Date | null => {
  let latest: Date | null = null
  for (const performance of endeavor.performances) {
    if (performance.resolution !== PerformResolution.complete) continue
    const completedAt = performance.completedAt
    if (completedAt === null) continue
    if (latest === null || completedAt.getTime() > latest.getTime()) {
      latest = completedAt
    }
  }
  return latest
}

/** `EndeavorComputedState.matches(_:now:)`. */
export const matchesEndeavorComputedState = (
  state: EndeavorComputedState,
  endeavor: Endeavor,
  now: Date,
): boolean => {
  switch (state) {
    case EndeavorComputedState.overdue:
    case EndeavorComputedState.expired: {
      if (!OVERDUE_KINDS.includes(endeavor.kind)) return false
      if (hasBeenCompleted(endeavor)) return false
      const due = endeavor.due
      if (due === null) return false
      if (due.getTime() >= now.getTime()) return false
      const dueToday = isSameCalendarDay(due, now)
      return state === EndeavorComputedState.overdue ? dueToday : !dueToday
    }
    case EndeavorComputedState.completedToday: {
      if (!COMPLETABLE_KINDS.includes(endeavor.kind)) return false
      if (endeavor.status !== EndeavorStatus.closed) return false
      const completed =
        endeavor.completed ?? latestPerformanceCompletion(endeavor)
      if (completed === null) return false
      return isSameCalendarDay(completed, now)
    }
    default:
      return assertNever(state)
  }
}
