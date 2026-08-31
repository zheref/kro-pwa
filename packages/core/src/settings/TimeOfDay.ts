/**
 * `TimeOfDay` — canon `KroCore/Model/TimeOfDay.swift`.
 *
 * A clock time (hour + minute), independent of any date or timezone. The
 * domain type behind every `SettingType.timeOfDay` preference — working-hours
 * start/end and the morning-plan notification time. It round-trips through the
 * preferences store as an `Int` count of minutes from midnight.
 *
 * Deliberately **not** a `Date`: a `Date` would carry a day and a zone, and
 * the two things this type is used for — "what time do you start work" and
 * "what time should the plan reminder fire" — have neither. That is also why
 * this file needs no clock, which keeps `@kro/core` platform-free.
 */

/** Minutes in one day — the modulus `timeOfDayFromMinutes` wraps into. */
export const MINUTES_PER_DAY = 1440

/** Minutes in one hour. */
export const MINUTES_PER_HOUR = 60

export interface TimeOfDay {
  /** 0…23 */
  readonly hour: number
  /** 0…59 */
  readonly minute: number
}

/**
 * `TimeOfDay(hour:minute:)` — clamps into a valid clock time, exactly as canon
 * does (`min(max(hour, 0), 23)`). Clamping, not wrapping: 25:00 is 23:00, not
 * 01:00, because canon's initializer is a guard against a malformed input, not
 * a time calculation.
 */
export const makeTimeOfDay = (hour: number, minute: number): TimeOfDay => ({
  hour: Math.min(Math.max(Math.trunc(hour), 0), 23),
  minute: Math.min(Math.max(Math.trunc(minute), 0), 59),
})

/** `var minutesFromMidnight: Int` (0…1439) — the stored representation. */
export const timeOfDayMinutesFromMidnight = (time: TimeOfDay): number =>
  time.hour * MINUTES_PER_HOUR + time.minute

/**
 * `TimeOfDay(minutesFromMidnight:)` — rebuilds a time from minutes, **wrapping**
 * into a single day. Canon's `((minutes % 1440) + 1440) % 1440` handles a
 * negative input the way a modulus should, which JavaScript's `%` alone does
 * not (`-60 % 1440` is `-60`, not `1380`).
 */
export const timeOfDayFromMinutesFromMidnight = (
  minutes: number,
): TimeOfDay => {
  const truncated = Math.trunc(minutes)
  const wrapped =
    ((truncated % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  return makeTimeOfDay(
    Math.floor(wrapped / MINUTES_PER_HOUR),
    wrapped % MINUTES_PER_HOUR,
  )
}

/** Structural equality — canon's synthesized `Equatable`. */
export const isSameTimeOfDay = (left: TimeOfDay, right: TimeOfDay): boolean =>
  left.hour === right.hour && left.minute === right.minute
