/**
 * `Month` — canon `KroCore/Model/Endeavor/Endeavor.swift`.
 *
 * A `UInt8`-raw-valued Swift enum numbered 1…12, and canon encodes
 * `month.rawValue` (a **number**, not a name) into a yearly `RepeatConfig`.
 * The port keeps that exactly: the union is the numeric literals `1 | 2 | … |
 * 12`, so an encoded month is the same JSON value Swift writes.
 *
 * Note the offset against JavaScript's own month indexing, which is 0-based:
 * `Month.january` is `1`, while `new Date(…).getMonth()` returns `0` for
 * January. `monthFromDate` is the only sanctioned bridge between the two.
 */

export const Month = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
} as const

export type Month = (typeof Month)[keyof typeof Month]

/**
 * `Month.allCases`, January → December.
 *
 * Named `monthsOfYear`, not `months`: this package's pre-existing
 * `utils/durations.ts` already exports a `months(value)` that converts a count
 * of months into milliseconds, and both reach the `@kro/core` barrel.
 */
export const monthsOfYear: readonly Month[] = [
  Month.january,
  Month.february,
  Month.march,
  Month.april,
  Month.may,
  Month.june,
  Month.july,
  Month.august,
  Month.september,
  Month.october,
  Month.november,
  Month.december,
]

/**
 * `Month(rawValue:)` — narrows a raw number to a `Month`, or `null` when it is
 * outside 1…12 or not an integer. The yearly-`RepeatConfig` decoder goes
 * through here rather than casting.
 */
export const monthFromRawValue = (raw: number): Month | null =>
  monthsOfYear.find((month) => month === raw) ?? null

/** The `Month` a `Date` falls in, converting from JavaScript's 0-based index. */
export const monthFromDate = (date: Date): Month => {
  const resolved = monthFromRawValue(date.getMonth() + 1)
  // `getMonth()` is specified to return 0…11 for any valid date, so the
  // fallback is unreachable for one; an Invalid Date yields NaN, and January
  // is the least surprising answer for a value that has no month at all.
  return resolved ?? Month.january
}
