/**
 * `SettingChoices` — canon `KroCore/Model/SettingChoices.swift`.
 *
 * The enumerated choices backing the General preferences pickers. Every one is
 * a `String`-raw-valued Swift enum, so the raw value **is** the case name and
 * the raw value is what persists — the spelling is load-bearing for
 * cross-platform data compatibility, exactly as `WeekDay`'s is.
 *
 * Ported as frozen const objects plus same-named literal-union types (the
 * `WeekDay`/`PointsFormula` precedent from #7/#8): the union is structurally
 * the set of raw values, so a decoded string narrows into it without a cast,
 * and the `…Choices` arrays stand in for `CaseIterable.allCases` in canon
 * declaration order — which is also the picker's display order, and therefore
 * the `cases:` payload of each option's `SettingType.enumeration`.
 *
 * The `label` strings are canon's own English literals. Carrying them in the
 * domain tier is the same call `PointsFormula` already made: copy is derived
 * from a discriminant here, never assembled in a view.
 */
import { assertNever } from '../library/assertNever'

/**
 * App-wide color scheme preference. `system` follows the OS. **Local-only** —
 * it describes the device, not the person.
 */
export const AppearanceMode = {
  system: 'system',
  light: 'light',
  dark: 'dark',
} as const

export type AppearanceMode =
  (typeof AppearanceMode)[keyof typeof AppearanceMode]

/** `AppearanceMode.allCases`, in canon declaration order. */
export const appearanceModes: readonly AppearanceMode[] = [
  AppearanceMode.system,
  AppearanceMode.light,
  AppearanceMode.dark,
]

/** `var label: String`. */
export const appearanceModeLabel = (mode: AppearanceMode): string => {
  switch (mode) {
    case AppearanceMode.system:
      return 'System'
    case AppearanceMode.light:
      return 'Light'
    case AppearanceMode.dark:
      return 'Dark'
    default:
      return assertNever(mode)
  }
}

/**
 * The user's accent color choice (cloud-synced). The concrete color mapping is
 * the UI layer's — #6 binds these names to KroTokens.
 */
export const AccentChoice = {
  blue: 'blue',
  purple: 'purple',
  green: 'green',
  orange: 'orange',
  pink: 'pink',
  graphite: 'graphite',
} as const

export type AccentChoice = (typeof AccentChoice)[keyof typeof AccentChoice]

/** `AccentChoice.allCases`, in canon declaration order. */
export const accentChoices: readonly AccentChoice[] = [
  AccentChoice.blue,
  AccentChoice.purple,
  AccentChoice.green,
  AccentChoice.orange,
  AccentChoice.pink,
  AccentChoice.graphite,
]

/** `var label: String`. */
export const accentChoiceLabel = (choice: AccentChoice): string => {
  switch (choice) {
    case AccentChoice.blue:
      return 'Blue'
    case AccentChoice.purple:
      return 'Purple'
    case AccentChoice.green:
      return 'Green'
    case AccentChoice.orange:
      return 'Orange'
    case AccentChoice.pink:
      return 'Pink'
    case AccentChoice.graphite:
      return 'Graphite'
    default:
      return assertNever(choice)
  }
}

/**
 * Which section the app opens to on a cold launch (cloud-synced).
 *
 * The stored raw value of the Do case is **`doNow`**, not `do`: `do` is a Swift
 * keyword, so canon names the case `doNow` and the synthesized raw value
 * follows the case name. The label is still "Do".
 */
export const LandingChoice = {
  plan: 'plan',
  doNow: 'doNow',
  earn: 'earn',
} as const

export type LandingChoice = (typeof LandingChoice)[keyof typeof LandingChoice]

/** `LandingChoice.allCases`, in canon declaration order. */
export const landingChoices: readonly LandingChoice[] = [
  LandingChoice.plan,
  LandingChoice.doNow,
  LandingChoice.earn,
]

/** `var label: String`. */
export const landingChoiceLabel = (choice: LandingChoice): string => {
  switch (choice) {
    case LandingChoice.plan:
      return 'Plan'
    case LandingChoice.doNow:
      return 'Do'
    case LandingChoice.earn:
      return 'Earn'
    default:
      return assertNever(choice)
  }
}
