/**
 * The Plan lane's calendar and rounding primitives.
 *
 * Canon (`KroUI/Plan/TimelineLayout.swift`, `Kro/Application/Plan/*`) reaches
 * for `Calendar.current` at every day boundary and for Swift's `.rounded()` at
 * every snap. Neither crosses to TypeScript unchanged, and both are load-bearing
 * enough that getting them wrong is invisible until a user is in a different
 * time zone or dragging upward. So they are named here, once, and tested here.
 *
 * ## Day boundaries are local-time, never UTC millisecond maths
 *
 * `startOfPlanDay` mirrors `packages/core`'s `DateRangeSpec` helper: a midnight
 * is built with the local `Date(year, month, day)` constructor and
 * `setHours(0,0,0,0)`, so a DST transition moves the boundary with the user's
 * clock instead of drifting an hour. `addingPlanDays` re-enters that
 * constructor rather than adding `86_400_000` ms, which is what makes a
 * spring-forward day 23 hours long here exactly as `Calendar.date(byAdding:)`
 * makes it 23 hours long in canon.
 *
 * ## A day cache is keyed by a string, not by a `Date`
 *
 * Canon's caches are `[Date: [Endeavor]]`. Swift `Date` is `Hashable` by value;
 * a JavaScript `Date` is an object, so `{ [date]: … }` would stringify to a
 * locale-formatted key and a `Map` would key by identity. `planDayKey` is the
 * forced replacement: a stable, sortable `YYYY-MM-DD` in **local** time (never
 * `toISOString()`, which converts to UTC and lands on the wrong day for anyone
 * east or west of Greenwich after/before mid-day).
 *
 * ## `roundHalfAwayFromZero` is not `Math.round`
 *
 * Swift's `Double.rounded()` is round-half-**away-from-zero**: `(-0.5).rounded()`
 * is `-1`. `Math.round(-0.5)` is `-0`. Every edit-mode snap divides a *signed*
 * drag delta by 900 before rounding, so dragging a handle upward by exactly
 * half a snap would round to zero here and to a full snap in canon — a silent
 * asymmetry between dragging up and dragging down. This function is what keeps
 * the two directions symmetric.
 */
import type { TimeIntervalSeconds } from '@kro/core'

/** Midnight local time on the day containing `date` — `Calendar.startOfDay`. */
export const startOfPlanDay = (date: Date): Date => {
  const midnight = new Date(2000, 0, 1)
  midnight.setFullYear(date.getFullYear(), date.getMonth(), date.getDate())
  midnight.setHours(0, 0, 0, 0)
  return midnight
}

/**
 * `Calendar.date(byAdding: .day, value:)` measured from a midnight anchor, so
 * the result is midnight on the target day whatever the DST offset does in
 * between.
 */
export const addingPlanDays = (date: Date, days: number): Date => {
  const shifted = new Date(2000, 0, 1)
  shifted.setFullYear(date.getFullYear(), date.getMonth(), date.getDate() + days)
  shifted.setHours(0, 0, 0, 0)
  return shifted
}

/** Midnight at the start of the day after the one containing `date`. */
export const startOfNextPlanDay = (date: Date): Date => addingPlanDays(date, 1)

/** `Calendar.isDate(_:inSameDayAs:)`. */
export const isSamePlanDay = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate()

/**
 * Whole days from the day containing `from` to the day containing `to` —
 * `calendar.dateComponents([.day], from:to:).day`. Computed from the two
 * midnights via a UTC projection so a DST shift inside the span cannot make a
 * 7-day distance come back as 6.98.
 */
export const planDayDistance = (from: Date, to: Date): number => {
  const left = startOfPlanDay(from)
  const right = startOfPlanDay(to)
  const leftUtc = Date.UTC(
    left.getFullYear(),
    left.getMonth(),
    left.getDate(),
  )
  const rightUtc = Date.UTC(
    right.getFullYear(),
    right.getMonth(),
    right.getDate(),
  )
  return Math.round((rightUtc - leftUtc) / 86_400_000)
}

/** A day-cache key: local-time `YYYY-MM-DD`. See the module note. */
export type PlanDayKey = string

const pad = (value: number, width: number): string =>
  String(value).padStart(width, '0')

/** The cache key for the day containing `date`. */
export const planDayKey = (date: Date): PlanDayKey => {
  const day = startOfPlanDay(date)
  return `${pad(day.getFullYear(), 4)}-${pad(day.getMonth() + 1, 2)}-${pad(
    day.getDate(),
    2,
  )}`
}

/**
 * The midnight a key names, or `null` when the string is not a key this module
 * wrote. Callers hydrating a persisted cache need the inverse; a malformed key
 * is dropped rather than fabricated into an `Invalid Date`.
 */
export const planDayFromKey = (key: PlanDayKey): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (match === null) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const candidate = new Date(2000, 0, 1)
  candidate.setFullYear(year, month - 1, day)
  candidate.setHours(0, 0, 0, 0)
  // Rejects 2026-02-31, which `setFullYear` would roll forward into March.
  if (candidate.getMonth() !== month - 1 || candidate.getDate() !== day) {
    return null
  }
  return candidate
}

/**
 * Swift's `Double.rounded()` — half away from zero, in both directions. See the
 * module note for why `Math.round` is the wrong primitive for a signed delta.
 */
export const roundHalfAwayFromZero = (value: number): number =>
  value < 0 ? -Math.round(-value) : Math.round(value)

/**
 * `date + seconds`, as a new `Date`. A thin alias over `@kro/core`'s
 * `dateAddingSeconds` kept local so this module has one date vocabulary.
 */
export const planDateAdding = (
  date: Date,
  seconds: TimeIntervalSeconds,
): Date => new Date(date.getTime() + seconds * 1000)

/** Seconds from `from` to `to`; negative when `to` precedes `from`. */
export const planSecondsBetween = (
  from: Date,
  to: Date,
): TimeIntervalSeconds => (to.getTime() - from.getTime()) / 1000
