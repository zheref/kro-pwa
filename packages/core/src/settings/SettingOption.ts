/**
 * `SettingOption` — canon `KroCore/Model/SettingOption.swift`.
 *
 * The descriptor for one preference: its storage key, the value shape it
 * round-trips through the preferences store, its glyph, its default and whether
 * it follows the account (`cloud`) or stays on the device (`local`).
 *
 * Three deliberate departures from the Swift declaration, each of which makes
 * the port *more* precise rather than less:
 *
 * 1. **`defaultValue` is `SettingValue | null`, not `Any?`.** Swift erases the
 *    default to `Any?` and lets `SettingsProvider`'s typed accessors cast it
 *    back. TypeScript can name the closed set of primitives a preference
 *    actually stores (`boolean | string | number`), so it does — a default of
 *    the wrong shape for its `type` is a compile error here, where in Swift it
 *    is a silent `as?` failure at read time.
 * 2. **`SettingType` is a discriminated union, not an enum with an associated
 *    value.** `.enumeration(cases:)` becomes `{ kind: 'enumeration', cases }`
 *    (`RC-24`), so a `switch` over `type.kind` narrows and `assertNever` closes
 *    it (`RC-9`).
 * 3. **`consumption` is new.** Canon records "declared, not yet consumed" only
 *    in prose — a `// MARK:` comment in the Swift and a *Live* / *Declared, not
 *    yet consumed* annotation per option in `docs/Features/Preferences.md`.
 *    Parity means porting an unconsumed option **as** unconsumed rather than
 *    inventing a consumer for it, so the fact is moved into the type where the
 *    snapshot test can pin it. See `SettingOptions.ts` for the five options this
 *    marks and the PR body for the canon divergence it uncovered.
 */
import { assertNever } from '../library/assertNever'

/**
 * The primitive a preference round-trips through the store.
 *
 * Canon fixes this mapping in `SettingType`'s own doc comment: `bool`→Bool,
 * `string`/`enumeration`→String, `int`→Int, `timeOfDay`→Int
 * minutes-from-midnight, `daysSet`→Int weekday bitmask. Nothing else is ever
 * persisted, which is why the union is closed.
 */
export type SettingValue = boolean | string | number

/**
 * The value shape a preference stores. Each case fixes both the domain meaning
 * and the primitive it persists as.
 */
export type SettingType =
  | { readonly kind: 'bool' }
  | { readonly kind: 'string' }
  /** Whole number (e.g. a duration in minutes, a threshold count). */
  | { readonly kind: 'int' }
  /** A time of day (hour + minute), stored as minutes from midnight. */
  | { readonly kind: 'timeOfDay' }
  /**
   * A single choice from a fixed set of raw values (a picker). `cases` are the
   * allowed raw values, in display order — canon's associated value.
   */
  | { readonly kind: 'enumeration'; readonly cases: readonly string[] }
  /** A multi-select of weekdays (e.g. working days), stored as a bitmask. */
  | { readonly kind: 'daysSet' }

/** `SettingType.bool`. */
export const boolSetting: SettingType = { kind: 'bool' }

/** `SettingType.string`. */
export const stringSetting: SettingType = { kind: 'string' }

/** `SettingType.int`. */
export const intSetting: SettingType = { kind: 'int' }

/** `SettingType.timeOfDay`. */
export const timeOfDaySetting: SettingType = { kind: 'timeOfDay' }

/** `SettingType.daysSet`. */
export const daysSetSetting: SettingType = { kind: 'daysSet' }

/** `SettingType.enumeration(cases:)`. */
export const enumerationSetting = (cases: readonly string[]): SettingType => ({
  kind: 'enumeration',
  cases,
})

/**
 * Whether a setting travels with the user's account (`cloud`) or stays on the
 * device (`local`, e.g. theme, haptics). Declarative here; the sync boundary
 * that acts on it is #31's.
 */
export const SettingSyncScope = {
  cloud: 'cloud',
  local: 'local',
} as const

export type SettingSyncScope =
  (typeof SettingSyncScope)[keyof typeof SettingSyncScope]

/**
 * Whether canon has a surface reading this option today.
 *
 * `live` — a shipped surface reads it, so porting a consumer for it is parity.
 * `declared` — the option persists and is ready for the surface that will read
 * it, but nothing reads it in KroApple today. **Parity means not inventing a
 * consumer**: a `declared` option is ported as a stored value and nothing more.
 */
export const SettingConsumption = {
  live: 'live',
  declared: 'declared',
} as const

export type SettingConsumption =
  (typeof SettingConsumption)[keyof typeof SettingConsumption]

/** One preference's descriptor. */
export interface SettingOption {
  /** The persisted key, verbatim from canon — the wire format. */
  readonly key: string
  readonly type: SettingType
  /** An SF Symbol name; the web icon mapping is #6's (see `IconRepresentation`). */
  readonly glyph: string | null
  /** The value a read resolves to when the key is unset. */
  readonly defaultValue: SettingValue | null
  readonly syncScope: SettingSyncScope
  readonly consumption: SettingConsumption
}

/**
 * `SettingOption.init(key:type:glyph:defaultValue:syncScope:)`.
 *
 * `syncScope` defaults to `cloud` and `consumption` to `live`, matching canon's
 * own defaults — canon spells out only the exceptions (`syncScope: .local` on
 * five options; the "declared, not yet consumed" note on five others), so the
 * table below reads as one diff against the Swift.
 */
export const makeSettingOption = (parameters: {
  readonly key: string
  readonly type: SettingType
  readonly glyph: string | null
  readonly defaultValue: SettingValue | null
  readonly syncScope?: SettingSyncScope
  readonly consumption?: SettingConsumption
}): SettingOption => ({
  key: parameters.key,
  type: parameters.type,
  glyph: parameters.glyph,
  defaultValue: parameters.defaultValue,
  syncScope: parameters.syncScope ?? SettingSyncScope.cloud,
  consumption: parameters.consumption ?? SettingConsumption.live,
})

/**
 * The three primitives every `SettingType` round-trips through — canon
 * `KroCore/Model/UserSetting.swift`'s `SettingValueType`, which is also the
 * domain of the `user_settings.value_type` column the cloud-sync child (#31)
 * will write. Declared here because it is a property of the *schema*; nothing
 * in this issue pushes or pulls a row.
 */
export const SettingValueType = {
  bool: 'bool',
  int: 'int',
  string: 'string',
} as const

export type SettingValueType =
  (typeof SettingValueType)[keyof typeof SettingValueType]

/**
 * `var storageValueType: SettingValueType` — which stored primitive a type
 * serializes to. `timeOfDay` (minutes) and `daysSet` (bitmask) are both `int`;
 * `enumeration` is a `string` raw value.
 *
 * The single place that knows the `SettingType` → primitive mapping. The codec
 * and the validity predicates both read it rather than re-deriving it, which is
 * what keeps "a `timeOfDay` persists as an `Int`" one fact instead of four.
 */
export const settingStorageValueType = (
  type: SettingType,
): SettingValueType => {
  switch (type.kind) {
    case 'bool':
      return SettingValueType.bool
    case 'string':
    case 'enumeration':
      return SettingValueType.string
    case 'int':
    case 'timeOfDay':
    case 'daysSet':
      return SettingValueType.int
    default:
      return assertNever(type)
  }
}

/** The JavaScript `typeof` a stored value has, derived from its wire type. */
export const settingStoragePrimitive = (
  type: SettingType,
): 'boolean' | 'number' | 'string' => {
  switch (settingStorageValueType(type)) {
    case SettingValueType.bool:
      return 'boolean'
    case SettingValueType.int:
      return 'number'
    case SettingValueType.string:
      return 'string'
  }
}

/** Whether two descriptors name the same preference. Identity is the key. */
export const isSameSettingOption = (
  left: SettingOption,
  right: SettingOption,
): boolean => left.key === right.key
