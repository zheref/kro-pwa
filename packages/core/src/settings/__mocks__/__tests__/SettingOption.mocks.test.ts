import { describe, expect, it } from 'vitest'
import { allSettingOptions } from '../../SettingOptions'
import {
  allSettingOptionMocks,
  settingOptionMocks,
} from '../SettingOption.mocks'

describe('the SettingOption mock spread', () => {
  it('ships the seven variants RC-13 requires', () => {
    expect(allSettingOptionMocks).toHaveLength(7)
  })

  it('covers every value shape a preference can have', () => {
    const kinds = new Set(
      allSettingOptionMocks.map((option) => option.type.kind),
    )
    expect(kinds).toEqual(
      new Set(['bool', 'int', 'enumeration', 'string', 'timeOfDay', 'daysSet']),
    )
  })

  it('covers both sync scopes and both consumption states', () => {
    const scopes = new Set(
      allSettingOptionMocks.map((option) => option.syncScope),
    )
    const consumption = new Set(
      allSettingOptionMocks.map((option) => option.consumption),
    )
    expect(scopes).toEqual(new Set(['cloud', 'local']))
    expect(consumption).toEqual(new Set(['live', 'declared']))
  })

  it('includes the inconvenient cases — no default, no glyph, the top of the day', () => {
    expect(settingOptionMocks.noDefault.defaultValue).toBeNull()
    expect(settingOptionMocks.noDefault.glyph).toBeNull()
    expect(settingOptionMocks.lateTime.defaultValue).toBe(1439)
  })

  it('uses synthetic keys, so a fixture can never be mistaken for the canon table', () => {
    const canonKeys = new Set(allSettingOptions.map((option) => option.key))
    for (const mock of allSettingOptionMocks) {
      expect(mock.key.startsWith('test.')).toBe(true)
      expect(canonKeys.has(mock.key)).toBe(false)
    }
  })
})
