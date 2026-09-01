import { describe, expect, it } from 'vitest'
import { userMocks } from '../__mocks__/User.mocks'
import {
  AuthProvider,
  authProviderDisplayName,
  authProviderIcon,
  authProviders,
  primaryEmail,
  userInitials,
} from '../User'

describe('AuthProvider canon parity', () => {
  it('has canon’s four cases in declaration order', () => {
    expect(authProviders).toEqual([
      'email_password',
      'google',
      'apple',
      'facebook',
    ])
  })

  it('keeps `emailPassword`’s snake_case raw value, which is not its case name', () => {
    expect(AuthProvider.emailPassword).toBe('email_password')
  })

  it('names every provider', () => {
    expect(authProviders.map(authProviderDisplayName)).toEqual([
      'Email & Password',
      'Google',
      'Apple',
      'Facebook',
    ])
  })

  it('maps every provider to its canon SF Symbol', () => {
    expect(authProviders.map((provider) => authProviderIcon(provider))).toEqual(
      [
        { type: 'glyph', name: 'envelope.fill' },
        { type: 'glyph', name: 'network' },
        { type: 'glyph', name: 'apple.logo' },
        { type: 'glyph', name: 'f.circle.fill' },
      ],
    )
  })
})

describe('primaryEmail', () => {
  it('is the first address when several are present', () => {
    expect(primaryEmail(userMocks.complete)).toBe('ada@kro.app')
  })

  it('is that one address when only one is present', () => {
    expect(primaryEmail(userMocks.googleSignIn)).toBe('grace@kro.app')
  })

  it('is the empty string when there is no address at all', () => {
    expect(primaryEmail(userMocks.noEmail)).toBe('')
  })
})

describe('userInitials', () => {
  it('takes the first letter of the first two words of the name', () => {
    expect(userInitials(userMocks.complete)).toBe('AL')
  })

  it('falls back to the primary email when the user has no name', () => {
    expect(userInitials(userMocks.minimal)).toBe('S')
  })

  it('drops empty pieces from padding, so a mononym yields one letter', () => {
    expect(userInitials(userMocks.paddedMononym)).toBe('P')
  })

  it('stops at two words even when the name has four', () => {
    expect(userInitials(userMocks.unicodeName)).toBe('山太')
  })

  it('is empty when there is neither a name nor an address', () => {
    expect(userInitials(userMocks.noEmail)).toBe('')
  })

  it('uppercases a lowercase name', () => {
    expect(userInitials({ ...userMocks.complete, name: 'ada lovelace' })).toBe(
      'AL',
    )
  })

  it('treats a TAB as part of the word, not as a separator', () => {
    // Canon splits on the single ASCII space (`split(separator: " ")`), not on
    // any whitespace. Widening to /\s+/ would give the same user different
    // initials on iOS and on the web.
    expect(userInitials({ ...userMocks.complete, name: 'Ada\tLovelace' })).toBe(
      'A',
    )
    expect(userInitials({ ...userMocks.complete, name: 'Ada\nLovelace' })).toBe(
      'A',
    )
  })
})
