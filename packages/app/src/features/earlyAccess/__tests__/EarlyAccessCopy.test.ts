import { KroPlatforms } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  EARLY_ACCESS_PLATFORM_ORDER,
  EARLY_ACCESS_PRIVACY_NOTICE,
  earlyAccessRemovalNotice,
} from '../EarlyAccessCopy'

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

describe('the privacy notice', () => {
  it('names what the request carries and omits the language the Producer does not send', () => {
    expect(EARLY_ACCESS_PRIVACY_NOTICE).toMatch(/which part of the page/)
    expect(EARLY_ACCESS_PRIVACY_NOTICE).not.toMatch(/language|browser/i)
  })

  it('points nowhere by itself — no footer, no repository', () => {
    expect(EARLY_ACCESS_PRIVACY_NOTICE).not.toMatch(/footer|github/i)
  })

  it('builds the removal sentence around the given address', () => {
    expect(earlyAccessRemovalNotice('hi@kroapp.com')).toBe(
      'To be removed sooner, write to hi@kroapp.com.',
    )
  })
})
