/**
 * Time arithmetic for the platform-free domain tier.
 *
 * Canon (`KroApple@2c1ee45`) types every duration as Foundation's
 * `TimeInterval`, which is a `Double` count of **seconds**. This package
 * already ships `utils/durations.ts`, whose helpers speak **milliseconds** —
 * so the unit is spelled into the type name here rather than left to a
 * reader's assumption. Every `duration`, `minimumDuration`, `maximumDuration`
 * and fragment length in the Endeavor domain is `TimeIntervalSeconds`, and
 * matches the number Swift would encode for the same value.
 *
 * The domain tier has no ambient clock: nothing in here reads `Date.now()`
 * implicitly. Callers that need "now" pass it (see `EndeavorComputed`), which
 * is what keeps these helpers deterministic under test.
 */

/** A duration in **seconds** — Foundation's `TimeInterval`. */
export type TimeIntervalSeconds = number

/** Seconds in one minute. */
export const SECONDS_PER_MINUTE = 60

/** Seconds in one hour. */
export const SECONDS_PER_HOUR = 3600

/** Seconds in one day. */
export const SECONDS_PER_DAY = 86_400

/** `hours(2)` → `7200`. The port of canon's `2.hours`. */
export const hoursInSeconds = (count: number): TimeIntervalSeconds =>
  count * SECONDS_PER_HOUR

/** `minutes(25)` → `1500`. The port of canon's `25.minutes`. */
export const minutesInSeconds = (count: number): TimeIntervalSeconds =>
  count * SECONDS_PER_MINUTE

/**
 * `to.timeIntervalSince(from)` — signed seconds from `from` to `to`.
 * Negative when `to` precedes `from`, exactly as Foundation's is.
 */
export const secondsBetween = (from: Date, to: Date): TimeIntervalSeconds =>
  (to.getTime() - from.getTime()) / 1000

/** `date.addingTimeInterval(seconds)`. Never mutates `date`. */
export const dateAddingSeconds = (
  date: Date,
  seconds: TimeIntervalSeconds,
): Date => new Date(date.getTime() + seconds * 1000)

/**
 * Whether `date` falls in the closed window `[now - seconds, now]` — the port
 * of canon's `Date.isWithin(lastSeconds:)`, used by `Endeavor.isRecent`.
 */
export const isWithinLast = (
  date: Date,
  seconds: TimeIntervalSeconds,
  now: Date,
): boolean => {
  const elapsed = secondsBetween(date, now)
  return elapsed >= 0 && elapsed <= seconds
}

/**
 * Whether `date` falls in the closed window `[now, now + seconds]` — the port
 * of canon's `Date.isWithin(next:)`, used by `Endeavor.isDueSoon`.
 */
export const isWithinNext = (
  date: Date,
  seconds: TimeIntervalSeconds,
  now: Date,
): boolean => {
  const remaining = secondsBetween(now, date)
  return remaining >= 0 && remaining <= seconds
}

/**
 * Whether two instants land on the same calendar day in the runtime's local
 * time zone — the port of canon's `Calendar.current.dateComponents([.day,
 * .month, .year], …)` comparison behind `Endeavor.isDueToday`.
 */
export const isSameCalendarDay = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate()
