import {
  type SettingOption,
  cloudSyncOptions,
  makeSettingOption,
  settingOptionForKey,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import type { CloudSettingEntry } from '../../../features/auth/CloudSettings'
import {
  SettingValueType,
  UserSettingRowMapper,
  decodeSettingPrimitive,
  encodeSettingPrimitive,
  storageValueTypeFor,
} from '../UserSettingRow'

const optionFor = (key: string): SettingOption => {
  const option = settingOptionForKey(key)
  if (option === null) throw new Error(`no option declares '${key}'`)
  return option
}

/** A throwaway option of a given value shape, for the type-mapping tests. */
const optionOfType = (type: SettingOption['type']): SettingOption =>
  makeSettingOption({ key: 'probe', type, glyph: null, defaultValue: null })

/** A cloud-scoped option of each storage type, taken from the real registry. */
const boolOption = cloudSyncOptions.find((option) => option.type.kind === 'bool')
const intOption = cloudSyncOptions.find((option) => option.type.kind === 'int')
const enumOption = cloudSyncOptions.find(
  (option) => option.type.kind === 'enumeration',
)

describe('storageValueTypeFor', () => {
  it('maps bool to bool', () => {
    expect(storageValueTypeFor(optionOfType({ kind: 'bool' }))).toBe(
      SettingValueType.bool,
    )
  })

  it('maps int, timeOfDay and daysSet to int — minutes and bitmasks are both integers', () => {
    for (const kind of ['int', 'timeOfDay', 'daysSet'] as const) {
      expect(storageValueTypeFor(optionOfType({ kind }))).toBe(SettingValueType.int)
    }
  })

  it('maps string and enumeration to string — an enumeration travels as its raw value', () => {
    for (const type of [
      { kind: 'string' } as const,
      { kind: 'enumeration', cases: ['a', 'b'] } as const,
    ]) {
      expect(storageValueTypeFor(optionOfType(type))).toBe(SettingValueType.string)
    }
  })
})

describe('encodeSettingPrimitive', () => {
  it("writes booleans as 'true'/'false', never as 1/0", () => {
    expect(encodeSettingPrimitive(true, SettingValueType.bool)).toBe('true')
    expect(encodeSettingPrimitive(false, SettingValueType.bool)).toBe('false')
  })

  it('writes an integer as its decimal text', () => {
    expect(encodeSettingPrimitive(420, SettingValueType.int)).toBe('420')
    expect(encodeSettingPrimitive(0, SettingValueType.int)).toBe('0')
  })

  it('writes a string verbatim, including an empty one', () => {
    expect(encodeSettingPrimitive('dark', SettingValueType.string)).toBe('dark')
    expect(encodeSettingPrimitive('', SettingValueType.string)).toBe('')
  })

  it('refuses a primitive of the wrong shape rather than coercing it', () => {
    expect(encodeSettingPrimitive('true', SettingValueType.bool)).toBeNull()
    expect(encodeSettingPrimitive(1.5, SettingValueType.int)).toBeNull()
    expect(encodeSettingPrimitive(7, SettingValueType.string)).toBeNull()
  })
})

describe('decodeSettingPrimitive', () => {
  it("accepts 'true'/'false' and the '1'/'0' another platform may have written", () => {
    expect(decodeSettingPrimitive('true', SettingValueType.bool)).toBe(true)
    expect(decodeSettingPrimitive('1', SettingValueType.bool)).toBe(true)
    expect(decodeSettingPrimitive('false', SettingValueType.bool)).toBe(false)
    expect(decodeSettingPrimitive('0', SettingValueType.bool)).toBe(false)
  })

  it('skips an unrecognised boolean rather than clobbering the local value', () => {
    expect(decodeSettingPrimitive('yes', SettingValueType.bool)).toBeNull()
    expect(decodeSettingPrimitive('', SettingValueType.bool)).toBeNull()
  })

  it("parses an integer the way canon's Int(value) does — and nothing looser", () => {
    expect(decodeSettingPrimitive('420', SettingValueType.int)).toBe(420)
    expect(decodeSettingPrimitive('-5', SettingValueType.int)).toBe(-5)
    // `Number()` would accept all three of these; `Int(value)` accepts none.
    expect(decodeSettingPrimitive('', SettingValueType.int)).toBeNull()
    expect(decodeSettingPrimitive('1e3', SettingValueType.int)).toBeNull()
    expect(decodeSettingPrimitive(' 7 ', SettingValueType.int)).toBeNull()
  })

  it('returns a string as-is', () => {
    expect(decodeSettingPrimitive('dark', SettingValueType.string)).toBe('dark')
    expect(decodeSettingPrimitive('', SettingValueType.string)).toBe('')
  })
})

describe('UserSettingRowMapper.toDomain', () => {
  it('reads a boolean row with its server timestamp', () => {
    const entry = UserSettingRowMapper.toDomain({
      key: 'general.overdueAlerts',
      value: 'true',
      value_type: 'bool',
      updated_at: '2026-08-31T09:00:00.000Z',
    })
    expect(entry).toEqual({
      key: 'general.overdueAlerts',
      value: true,
      updatedAt: new Date('2026-08-31T09:00:00.000Z'),
    })
  })

  it('reads a row with no timestamp as unstamped rather than as an Invalid Date', () => {
    const entry = UserSettingRowMapper.toDomain({
      key: 'k',
      value: '42',
      value_type: 'int',
    })
    expect(entry?.updatedAt).toBeNull()
  })

  it('refuses a row whose text does not parse for its declared type', () => {
    expect(
      UserSettingRowMapper.toDomain({ key: 'k', value: 'maybe', value_type: 'bool' }),
    ).toBeNull()
  })

  it('treats an unparseable timestamp as absent rather than storing NaN', () => {
    const entry = UserSettingRowMapper.toDomain({
      key: 'k',
      value: 'x',
      value_type: 'string',
      updated_at: 'not-a-date',
    })
    expect(entry?.updatedAt).toBeNull()
  })
})

describe('UserSettingRowMapper.fromDomain', () => {
  const entryFor = (key: string, value: CloudSettingEntry['value']): CloudSettingEntry => ({
    key,
    value,
    updatedAt: null,
  })

  it('pins user_id explicitly, so the upsert has a conflict target and satisfies the RLS with_check', () => {
    const option = boolOption ?? optionFor('general.overdueAlerts')
    const row = UserSettingRowMapper.fromDomain(entryFor(option.key, true), option, 'u-1')
    expect(row?.user_id).toBe('u-1')
  })

  it('omits updated_at, leaving the account clock to the server trigger', () => {
    const option = boolOption ?? optionFor('general.overdueAlerts')
    const row = UserSettingRowMapper.fromDomain(entryFor(option.key, true), option, 'u-1')
    expect(row?.updated_at).toBeUndefined()
  })

  it('writes the declared value_type for an integer option', () => {
    if (intOption === undefined) return
    const row = UserSettingRowMapper.fromDomain(entryFor(intOption.key, 25), intOption, 'u-1')
    expect(row?.value_type).toBe(SettingValueType.int)
    expect(row?.value).toBe('25')
  })

  it('writes an enumeration as its raw string value', () => {
    if (enumOption === undefined) return
    const raw =
      enumOption.type.kind === 'enumeration' ? (enumOption.type.cases[0] ?? 'x') : 'x'
    const row = UserSettingRowMapper.fromDomain(entryFor(enumOption.key, raw), enumOption, 'u-1')
    expect(row?.value_type).toBe(SettingValueType.string)
    expect(row?.value).toBe(raw)
  })

  it('refuses to build a row whose value does not match the option type — the option is simply not pushed', () => {
    const option = boolOption ?? optionFor('general.overdueAlerts')
    expect(
      UserSettingRowMapper.fromDomain(entryFor(option.key, 'true'), option, 'u-1'),
    ).toBeNull()
  })
})

describe('the wire round trip', () => {
  it('returns every cloud-scoped option value unchanged through encode then decode', () => {
    for (const option of cloudSyncOptions) {
      const valueType = storageValueTypeFor(option)
      const sample =
        valueType === SettingValueType.bool
          ? true
          : valueType === SettingValueType.int
            ? 123
            : 'sample'
      const encoded = encodeSettingPrimitive(sample, valueType)
      expect(encoded).not.toBeNull()
      expect(decodeSettingPrimitive(encoded as string, valueType)).toBe(sample)
    }
  })
})
