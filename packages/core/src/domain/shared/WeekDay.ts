/**
 * `WeekDay` — canon `KroCore/Model/Endeavor/Endeavor.swift`.
 *
 * A `String`-raw-valued Swift enum, so the raw value *is* the case name and
 * the wire form is the lowercase English day. `RepeatConfig`'s weekly base
 * encodes an array of these, which is why the spelling is load-bearing for
 * cross-platform data compatibility with KroApple and KroAndroid.
 *
 * Ported as a frozen const object plus a same-named literal-union type rather
 * than a TypeScript `enum`: the union is structurally the set of raw values,
 * so a decoded string narrows into it without a cast, and `weekDays` stands in
 * for Swift's `CaseIterable.allCases` in canon declaration order.
 */

export const WeekDay = {
  monday: 'monday',
  tuesday: 'tuesday',
  wednesday: 'wednesday',
  thursday: 'thursday',
  friday: 'friday',
  saturday: 'saturday',
  sunday: 'sunday',
} as const

export type WeekDay = (typeof WeekDay)[keyof typeof WeekDay]

/** `WeekDay.allCases`, in canon declaration order (Monday first). */
export const weekDays: readonly WeekDay[] = [
  WeekDay.monday,
  WeekDay.tuesday,
  WeekDay.wednesday,
  WeekDay.thursday,
  WeekDay.friday,
  WeekDay.saturday,
  WeekDay.sunday,
]

/**
 * `WeekDay(rawValue:)` — narrows an arbitrary string to a `WeekDay`, or `null`
 * when it names no case. The decoder for a weekly `RepeatConfig` goes through
 * here rather than casting.
 */
export const weekDayFromRawValue = (raw: string): WeekDay | null =>
  weekDays.find((day) => day === raw) ?? null
