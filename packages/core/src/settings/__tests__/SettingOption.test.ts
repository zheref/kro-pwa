import { describe, expect, it } from 'vitest'
import {
  SettingConsumption,
  SettingSyncScope,
  SettingValueType,
  boolSetting,
  daysSetSetting,
  enumerationSetting,
  intSetting,
  isSameSettingOption,
  makeSettingOption,
  settingStoragePrimitive,
  settingStorageValueType,
  stringSetting,
  timeOfDaySetting,
} from '../SettingOption'

describe('makeSettingOption', () => {
  it('keeps every field it is handed — a fully-specified local option', () => {
    const option = makeSettingOption({
      key: 'general.appearance',
      type: enumerationSetting(['system', 'light', 'dark']),
      glyph: 'circle.lefthalf.filled',
      defaultValue: 'system',
      syncScope: SettingSyncScope.local,
      consumption: SettingConsumption.declared,
    })

    expect(option).toEqual({
      key: 'general.appearance',
      type: { kind: 'enumeration', cases: ['system', 'light', 'dark'] },
      glyph: 'circle.lefthalf.filled',
      defaultValue: 'system',
      syncScope: SettingSyncScope.local,
      consumption: SettingConsumption.declared,
    })
  })

  it('defaults an unspecified option to cloud-synced and consumed, as canon does', () => {
    const option = makeSettingOption({
      key: 'do.showSuggestions',
      type: boolSetting,
      glyph: 'sparkles',
      defaultValue: true,
    })

    expect(option.syncScope).toBe(SettingSyncScope.cloud)
    expect(option.consumption).toBe(SettingConsumption.live)
  })

  it('accepts an option with no glyph and no default — the timezone shape', () => {
    const option = makeSettingOption({
      key: 'general.timezone',
      type: stringSetting,
      glyph: null,
      defaultValue: null,
    })

    expect(option.glyph).toBeNull()
    expect(option.defaultValue).toBeNull()
  })
})

describe('settingStorageValueType', () => {
  it('stores a toggle as a bool', () => {
    expect(settingStorageValueType(boolSetting)).toBe(SettingValueType.bool)
  })

  it('stores a count, a time of day and a weekday set all as ints', () => {
    expect(settingStorageValueType(intSetting)).toBe(SettingValueType.int)
    expect(settingStorageValueType(timeOfDaySetting)).toBe(SettingValueType.int)
    expect(settingStorageValueType(daysSetSetting)).toBe(SettingValueType.int)
  })

  it('stores free text and a picker raw value both as strings', () => {
    expect(settingStorageValueType(stringSetting)).toBe(SettingValueType.string)
    expect(settingStorageValueType(enumerationSetting(['a', 'b']))).toBe(
      SettingValueType.string,
    )
  })

  it('names the JavaScript primitive that matches each wire type', () => {
    expect(settingStoragePrimitive(boolSetting)).toBe('boolean')
    expect(settingStoragePrimitive(timeOfDaySetting)).toBe('number')
    expect(settingStoragePrimitive(enumerationSetting(['a']))).toBe('string')
  })
})

describe('isSameSettingOption', () => {
  const base = makeSettingOption({
    key: 'session.defaultDuration',
    type: intSetting,
    glyph: 'timer',
    defaultValue: 20,
  })

  it('identifies two descriptors of the same preference by key', () => {
    const rebuilt = makeSettingOption({
      key: 'session.defaultDuration',
      type: intSetting,
      glyph: 'timer',
      defaultValue: 25,
    })
    expect(isSameSettingOption(base, rebuilt)).toBe(true)
  })

  it('separates two preferences that differ only by key', () => {
    const other = makeSettingOption({
      key: 'session.defaultBreakDuration',
      type: intSetting,
      glyph: 'timer',
      defaultValue: 20,
    })
    expect(isSameSettingOption(base, other)).toBe(false)
  })

  it('is reflexive', () => {
    expect(isSameSettingOption(base, base)).toBe(true)
  })
})
