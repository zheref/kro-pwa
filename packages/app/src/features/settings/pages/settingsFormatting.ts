/**
 * The three pure conversions the preference controls need, and canon's accent
 * palette.
 *
 * All four are here rather than inline in the Fragment so they are testable
 * without a renderer, and so the Fragment stays layout.
 */
import {
  type WeekDay,
  weekDays,
  weekDaysBitmask,
  weekDaysFromBitmask,
} from '@kro/core'

// ---------------------------------------------------------------------------
// Time of day ⇄ the `<input type="time">` wire format
// ---------------------------------------------------------------------------

const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR

const pad = (value: number): string => String(value).padStart(2, '0')

/**
 * Minutes from midnight → `HH:MM`, the only value an `<input type="time">`
 * accepts.
 *
 * Out-of-range input clamps rather than wrapping: a stored `1500` is corrupt,
 * and `01:00` (the wrap) would look like a deliberate setting while `23:59`
 * reads as the end of the day it actually is.
 */
export const timeInputValue = (minutesFromMidnight: number): string => {
  const clamped = Math.min(
    Math.max(Math.round(minutesFromMidnight), 0),
    MINUTES_PER_DAY - 1,
  )
  return `${pad(Math.floor(clamped / MINUTES_PER_HOUR))}:${pad(clamped % MINUTES_PER_HOUR)}`
}

/**
 * `HH:MM` → minutes from midnight, or `null` when the field is empty or
 * malformed. `null` means "do not write", never "midnight": a browser hands
 * back `''` while the user is mid-edit, and writing `0` there would silently
 * move their working day to midnight.
 */
export const timeInputMinutes = (value: string): number | null => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (match === null) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * MINUTES_PER_HOUR + minutes
}

/** The clock time a stored value reads as, for a row's summary line. */
export const timeOfDayLabel = (minutesFromMidnight: number): string =>
  timeInputValue(minutesFromMidnight)

// ---------------------------------------------------------------------------
// Working days
// ---------------------------------------------------------------------------

/** Canon's single-letter chip label — `day.rawValue.prefix(1).uppercased()`. */
export const weekDayLetter = (day: WeekDay): string =>
  day.charAt(0).toUpperCase()

/** Canon's accessible label — `day.rawValue.capitalized`. */
export const weekDayName = (day: WeekDay): string =>
  day.charAt(0).toUpperCase() + day.slice(1)

/** The bitmask with `day` toggled — canon's `insert`/`remove` on the `Set`. */
export const weekDaysBitmaskToggling = (mask: number, day: WeekDay): number => {
  const selected = new Set(weekDaysFromBitmask(mask))
  if (selected.has(day)) selected.delete(day)
  else selected.add(day)
  // Rebuilt in canon's `allCases` order so the mask never depends on click
  // order, which is what makes two devices agree on the same stored number.
  return weekDaysBitmask(
    weekDays.filter((candidate) => selected.has(candidate)),
  )
}

/** Whether the mask contains `day`. */
export const weekDaysBitmaskHas = (mask: number, day: WeekDay): boolean =>
  weekDaysFromBitmask(mask).includes(day)

// ---------------------------------------------------------------------------
// Accent swatches — canon `extension AccentChoice { var color: Color }`
// ---------------------------------------------------------------------------

/**
 * The concrete colour each accent choice draws as.
 *
 * Canon puts this mapping in the **UI** layer for the same reason it is here
 * and not in `@kro/core`: the domain stores a choice, not a colour. The values
 * are the CSS equivalents of the SwiftUI system colours canon names, so the two
 * apps' swatch rows read as the same palette.
 */
export const ACCENT_SWATCH_COLOR: Readonly<Record<string, string>> = {
  blue: '#0a84ff',
  purple: '#af52de',
  green: '#34c759',
  orange: '#ff9f0a',
  pink: '#ff375f',
  // Canon: `Color(white: 0.4)`.
  graphite: '#666666',
}

/** The swatch colour for a raw accent value, or a neutral for an unknown one. */
export const accentSwatchColor = (raw: string): string =>
  ACCENT_SWATCH_COLOR[raw] ?? '#666666'

// ---------------------------------------------------------------------------
// Time zones
// ---------------------------------------------------------------------------

/**
 * Every zone this browser knows, or a short documented fallback.
 *
 * Canon reads `TimeZone.knownTimeZoneIdentifiers`. `Intl.supportedValuesOf` is
 * the web's equivalent and is present in every browser this app targets, but it
 * is absent under some test runtimes — so the fallback exists to keep a suite
 * deterministic, not to be shipped. It is deliberately tiny and obviously
 * partial: a short list reads as a fallback, where a plausible-looking long one
 * would read as the real answer.
 */
export const knownTimeZones = (): readonly string[] => {
  const supported = (
    Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf
  if (typeof supported === 'function') {
    try {
      return supported.call(Intl, 'timeZone')
    } catch {
      // Fall through to the documented fallback below.
    }
  }
  return [
    'UTC',
    'America/Bogota',
    'America/New_York',
    'Europe/Madrid',
    'Asia/Tokyo',
  ]
}

/** The device's own zone — canon's *"defaults to the device's current zone"*. */
export const deviceTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** Canon's `id.replacingOccurrences(of: "_", with: " ")`. */
export const timeZoneLabel = (identifier: string): string =>
  identifier.split('_').join(' ')
