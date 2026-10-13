import { describe, expect, it } from 'vitest'
import { KroPlatforms, isKroPlatform } from '../KroPlatform'

describe('KroPlatforms.label', () => {
  it('names Apple surfaces by the device a visitor owns, not the OS', () => {
    expect(KroPlatforms.label('ios')).toBe('iPhone')
    expect(KroPlatforms.label('ipados')).toBe('iPad')
    expect(KroPlatforms.label('macos')).toBe('Mac')
    expect(KroPlatforms.label('watchos')).toBe('Apple Watch')
  })

  it('names the non-Apple surfaces plainly', () => {
    expect(KroPlatforms.label('android')).toBe('Android')
    expect(KroPlatforms.label('windows')).toBe('Windows')
    expect(KroPlatforms.label('web')).toBe('Web')
  })

  it('has a label for every platform the picker lists, each distinct', () => {
    const labels = KroPlatforms.all.map(KroPlatforms.label)
    expect(KroPlatforms.all).toHaveLength(7)
    expect(new Set(labels).size).toBe(7)
  })
})

describe('isKroPlatform', () => {
  it('accepts every declared platform — a value the picker sent', () => {
    for (const platform of KroPlatforms.all) {
      expect(isKroPlatform(platform)).toBe(true)
    }
  })

  it('rejects a platform Kro does not know, or a label instead of an id', () => {
    expect(isKroPlatform('linux')).toBe(false)
    expect(isKroPlatform('iPhone')).toBe(false)
    expect(isKroPlatform('IOS')).toBe(false)
    expect(isKroPlatform('')).toBe(false)
  })

  it('rejects a non-string from a hand-crafted request body', () => {
    expect(isKroPlatform(undefined)).toBe(false)
    expect(isKroPlatform(null)).toBe(false)
    expect(isKroPlatform(7)).toBe(false)
    expect(isKroPlatform(['ios'])).toBe(false)
  })
})
