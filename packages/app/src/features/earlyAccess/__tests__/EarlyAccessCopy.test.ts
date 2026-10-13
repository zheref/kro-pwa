import { KroPlatforms } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { EARLY_ACCESS_PLATFORM_ORDER } from '../EarlyAccessCopy'

describe('EARLY_ACCESS_PLATFORM_ORDER', () => {
  it('lists every platform Kro knows, exactly once', () => {
    expect([...EARLY_ACCESS_PLATFORM_ORDER].sort()).toEqual(
      [...KroPlatforms.all].sort(),
    )
  })

  it('puts the Apple devices first', () => {
    expect(EARLY_ACCESS_PLATFORM_ORDER.slice(0, 4)).toEqual([
      'ios',
      'ipados',
      'macos',
      'watchos',
    ])
  })

  it('ends with what is still on the way', () => {
    expect(EARLY_ACCESS_PLATFORM_ORDER.slice(-2)).toEqual([
      'android',
      'windows',
    ])
  })
})
