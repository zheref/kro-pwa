/**
 * `ReconciliationCalendar` — the calendar arithmetic the reconciliation pass
 * needs, as an injected capability.
 *
 * Canon threads a `Calendar` through `EndeavorSourceResolution.reconcile` for
 * exactly one reason: two of its rules are **wall-clock** rules, not instant
 * rules. "The same scheduled time of day" and "completed on the same day"
 * both depend on a time zone, and a series that reconciles correctly in
 * `America/Bogota` must not silently reconcile differently on a CI runner set
 * to UTC.
 *
 * TypeScript has no `Calendar`, and this tier has no `Intl` (`lib: ["ES2022"]`,
 * `types: []`), so the capability is an interface with two implementations:
 * `systemCalendar` reads the host's local zone the way `Calendar.current`
 * does, and `utcCalendar` is the deterministic one every test uses. Nothing
 * here reads an ambient clock — `now` is a separate context field, passed in.
 *
 * Only the two operations canon's reconciliation actually performs are
 * modelled. `startOfDay`, day arithmetic and "relevant to today" belong to the
 * Do surface (#16), whose lane owns them.
 */

/** A wall-clock time of day, with no date and no zone attached. */
export interface ClockTime {
  readonly hour: number
  readonly minute: number
  readonly second: number
}

export interface ReconciliationCalendar {
  /** Canon's `dateComponents([.hour, .minute, .second], from:)`. */
  readonly clockTimeOf: (date: Date) => ClockTime
  /** Canon's `isDate(_:inSameDayAs:)`. */
  readonly isSameDay: (lhs: Date, rhs: Date) => boolean
}

/** Whether two clock times name the same moment of the day. */
export const clockTimesEqual = (lhs: ClockTime, rhs: ClockTime): boolean =>
  lhs.hour === rhs.hour &&
  lhs.minute === rhs.minute &&
  lhs.second === rhs.second

/**
 * A `ClockTime` rendered as a stable key, for use inside a series signature.
 * Zero-padded so `1:05` and `10:5` cannot collide on a naive join.
 */
export const clockTimeKey = (time: ClockTime): string =>
  `${pad(time.hour)}:${pad(time.minute)}:${pad(time.second)}`

const pad = (value: number): string => String(value).padStart(2, '0')

/**
 * `Calendar.current` — the host's local time zone, which is what a user's
 * "same day" and "same time of day" mean on their own device.
 */
export const systemCalendar: ReconciliationCalendar = {
  clockTimeOf: (date) => ({
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
  }),
  isSameDay: (lhs, rhs) =>
    lhs.getFullYear() === rhs.getFullYear() &&
    lhs.getMonth() === rhs.getMonth() &&
    lhs.getDate() === rhs.getDate(),
}

/**
 * The fixed-offset calendar tests use, so a suite asserts the same grouping on
 * every runner regardless of `TZ`. Canon's own tests do the same thing with a
 * `utcCalendar` helper.
 */
export const utcCalendar: ReconciliationCalendar = {
  clockTimeOf: (date) => ({
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  }),
  isSameDay: (lhs, rhs) =>
    lhs.getUTCFullYear() === rhs.getUTCFullYear() &&
    lhs.getUTCMonth() === rhs.getUTCMonth() &&
    lhs.getUTCDate() === rhs.getUTCDate(),
}
