/**
 * The `user_settings` wire row and its Mapper — canon
 * `KroCore/Model/UserSetting.swift` and the schema this repo is a **client**
 * of, `supabase/migrations/20260710000000_user_settings_cloud_sync.sql` in
 * `zheref/KroApple`.
 *
 * The column set is fixed by that migration and reproduced here exactly:
 *
 * ```sql
 * user_id    text not null default (auth.uid())::text,
 * key        text not null,
 * value      text not null,
 * value_type text not null check (value_type in ('bool','int','string')),
 * created_at timestamptz not null default now(),
 * updated_at timestamptz not null default now(),
 * primary key (user_id, key)
 * ```
 *
 * Two consequences the client must honour, both stated in the migration's own
 * comment:
 *
 * - **`value` is the primitive rendered as text**, and `value_type` says how to
 *   cast it back. Storing the primitive rather than the domain type is what
 *   keeps the wire format identical on iOS, Android and the web across a
 *   domain-type refactor — so the encoding here is canon's `SettingValueCodec`
 *   character for character, including `"1"`/`"0"` being accepted as booleans
 *   on the way in but only `"true"`/`"false"` being written on the way out.
 * - **`updated_at` is the server's.** The push never sends it; the
 *   `user_settings_set_updated_at` trigger owns it, which is what makes
 *   last-write-wins resolvable by *the account's* clock rather than by whichever
 *   device had the furthest-ahead system time.
 *
 * `user_id` is pinned explicitly on push even though the column defaults to
 * `auth.uid()`: the upsert needs an unambiguous `(user_id, key)` conflict
 * target, and the row has to satisfy the RLS `with_check` on its own terms.
 * Canon's `withUserId(_:)` exists for exactly this and says so.
 */
import type { SettingOption, SettingValue } from '@kro/core'
import type { CloudSettingEntry } from '../../features/auth/CloudSettings'

/** The domain of the `value_type` column. */
export const SettingValueType = {
  bool: 'bool',
  int: 'int',
  string: 'string',
} as const

export type SettingValueType =
  (typeof SettingValueType)[keyof typeof SettingValueType]

/** The `user_settings` row, column for column. */
export interface UserSettingRow {
  /** Omitted on a fresh push payload only when the caller has no user id. */
  readonly user_id?: string
  readonly key: string
  readonly value: string
  readonly value_type: SettingValueType
  /** Server-managed. Present on a pull, absent on a push. */
  readonly updated_at?: string | null
}

/**
 * `SettingType.storageValueType` — which primitive an option persists as.
 * `timeOfDay` (minutes) and `daysSet` (bitmask) are both `int`; `enumeration`
 * is a `string` raw value.
 */
export const storageValueTypeFor = (option: SettingOption): SettingValueType => {
  switch (option.type.kind) {
    case 'bool':
      return SettingValueType.bool
    case 'int':
    case 'timeOfDay':
    case 'daysSet':
      return SettingValueType.int
    case 'string':
    case 'enumeration':
      return SettingValueType.string
  }
}

/** A timestamptz column to a `Date`, or `null` when absent/unparseable. */
const dateFromColumn = (value: string | null | undefined): Date | null => {
  if (value === null || value === undefined) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const UserSettingRowMapper = {
  /**
   * `SettingValueCodec.decode` plus the row unwrap. Returns `null` when the
   * text cannot be parsed for its declared type — a corrupt or foreign payload
   * leaves the local value untouched rather than clobbering it.
   */
  toDomain(row: UserSettingRow): CloudSettingEntry | null {
    const value = decodeSettingPrimitive(row.value, row.value_type)
    if (value === null) return null
    return { key: row.key, value, updatedAt: dateFromColumn(row.updated_at) }
  },

  /**
   * `SettingValueCodec.encode` plus the row wrap. `null` when the stored
   * primitive does not match the option's declared type — such an option is
   * simply not pushed, exactly as canon's `compactMap` drops it.
   *
   * `updated_at` is deliberately **not** set: the server trigger owns it.
   */
  fromDomain(
    entry: CloudSettingEntry,
    option: SettingOption,
    userId: string,
  ): UserSettingRow | null {
    const valueType = storageValueTypeFor(option)
    const value = encodeSettingPrimitive(entry.value, valueType)
    if (value === null) return null
    return { user_id: userId, key: entry.key, value, value_type: valueType }
  },
} as const

/** `SettingValueCodec.encode` — the primitive half, no option lookup. */
export const encodeSettingPrimitive = (
  value: SettingValue,
  valueType: SettingValueType,
): string | null => {
  switch (valueType) {
    case SettingValueType.bool:
      return typeof value === 'boolean' ? (value ? 'true' : 'false') : null
    case SettingValueType.int:
      return typeof value === 'number' && Number.isInteger(value) ? String(value) : null
    case SettingValueType.string:
      return typeof value === 'string' ? value : null
  }
}

/**
 * `SettingValueCodec.decode`.
 *
 * `"1"` / `"0"` are accepted for booleans — canon accepts them and a row
 * written by a client that serialised a Kotlin `Boolean` that way must still
 * read. Anything else is `null` ("unrecognized → skip, don't clobber").
 */
export const decodeSettingPrimitive = (
  value: string,
  valueType: SettingValueType,
): SettingValue | null => {
  switch (valueType) {
    case SettingValueType.bool:
      if (value === 'true' || value === '1') return true
      if (value === 'false' || value === '0') return false
      return null
    case SettingValueType.int: {
      // `Number()` would accept `""`, `"1e3"` and `" 7 "`; canon's `Int(value)`
      // accepts none of them, so the shape is pinned before parsing.
      if (!/^-?\d+$/.test(value)) return null
      const parsed = Number.parseInt(value, 10)
      return Number.isSafeInteger(parsed) ? parsed : null
    }
    case SettingValueType.string:
      return value
  }
}
