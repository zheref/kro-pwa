/**
 * The `SettingType.daysSet` storage codec — canon
 * `KroCore/Domain/App/SettingsProvider+Typed.swift`, "Weekday bitmask" section.
 *
 * Lives under `settings/` rather than beside `WeekDay` in `domain/shared/`
 * because it is not part of the weekday vocabulary: it is *the preferences
 * store's* encoding of a weekday set, and canon puts it in the settings file
 * for the same reason. `WeekDay` itself stays where #7 put it.
 *
 * The bit positions are **pinned literals, not derived from `weekDays`** —
 * canon says so explicitly, and the reason is backward compatibility: deriving
 * the bit from the declaration order would silently change the stored format
 * the day someone reorders the enum, invalidating every persisted working-days
 * value on every device.
 */
import { WeekDay, weekDays } from '../domain/shared/WeekDay'
import { assertNever } from '../library/assertNever'

/**
 * `var bit: Int` — the stable bit position for the persisted bitmask. Monday is
 * bit 0 through Sunday at bit 6, which is the enum's declaration order today
 * but is pinned here so it survives a reorder.
 */
export const weekDayBit = (day: WeekDay): number => {
  switch (day) {
    case WeekDay.monday:
      return 0
    case WeekDay.tuesday:
      return 1
    case WeekDay.wednesday:
      return 2
    case WeekDay.thursday:
      return 3
    case WeekDay.friday:
      return 4
    case WeekDay.saturday:
      return 5
    case WeekDay.sunday:
      return 6
    default:
      // Closed with `assertNever` (`RC-9`) rather than left exhaustive: a value
      // forced past the type by an unchecked decode would otherwise fall
      // through as `undefined`, and `1 << undefined` is `1` — a silently wrong
      // bitmask instead of a loud failure.
      return assertNever(day)
  }
}

/**
 * `static func bitmask(_ days: Set<WeekDay>) -> Int` — packs a weekday set into
 * the stored `Int`. Takes any iterable so a caller need not build a `Set`;
 * duplicates are idempotent under `|`, exactly as they are in Swift.
 */
export const weekDaysBitmask = (days: Iterable<WeekDay>): number => {
  let mask = 0
  for (const day of days) mask |= 1 << weekDayBit(day)
  return mask
}

/**
 * `static func from(bitmask: Int) -> Set<WeekDay>` — unpacks a stored bitmask.
 *
 * Returns an **array in canon `allCases` order**, not a `Set`: canon's return
 * is an unordered `Set<WeekDay>`, and JavaScript's `Set` preserves insertion
 * order, so returning one would leak an ordering guarantee canon never made.
 * An ordered array states the ordering it actually has, and it is the order
 * every consumer wants anyway (Monday first).
 */
export const weekDaysFromBitmask = (mask: number): readonly WeekDay[] =>
  weekDays.filter((day) => (mask & (1 << weekDayBit(day))) !== 0)

/**
 * The Monday–Friday bitmask — `general.workingDays`' default, computed from
 * the bit table rather than written as `31` so the two can never disagree.
 */
export const MONDAY_TO_FRIDAY_BITMASK = weekDaysBitmask([
  WeekDay.monday,
  WeekDay.tuesday,
  WeekDay.wednesday,
  WeekDay.thursday,
  WeekDay.friday,
])

/** Every weekday set — the widest valid `daysSet` value. */
export const ALL_WEEK_DAYS_BITMASK = weekDaysBitmask(weekDays)

/**
 * Whether `mask` names only real weekday bits. A stored value with bits above
 * Sunday's is corrupt (or from a future format) and a reader should fall back
 * to the option's default rather than decode a partial set.
 */
export const isValidWeekDaysBitmask = (mask: number): boolean =>
  Number.isInteger(mask) && mask >= 0 && (mask & ~ALL_WEEK_DAYS_BITMASK) === 0
