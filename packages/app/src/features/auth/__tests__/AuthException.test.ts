import { describe, expect, it } from 'vitest'
import {
  AuthExceptions,
  authExceptionKinds,
  isAuthException,
} from '../AuthException'
import {
  EndeavorSyncExceptions,
  endeavorSyncExceptionFrom,
  endeavorSyncExceptionKinds,
  isEndeavorSyncException,
} from '../EndeavorSyncException'

describe('AuthExceptions', () => {
  it('builds every declared kind, so no case in the union is unreachable', () => {
    const built = [
      AuthExceptions.unavailable(),
      AuthExceptions.notSignedIn(),
      AuthExceptions.noIdentityToken(),
      AuthExceptions.userCreationFailed('row missing'),
      AuthExceptions.sessionExpired(),
      AuthExceptions.cancelled(),
      AuthExceptions.invalidCredentials(),
      AuthExceptions.emailAlreadyInUse(),
      AuthExceptions.weakPassword('too short'),
      AuthExceptions.networkUnavailable(),
      AuthExceptions.providerRejected('google'),
      AuthExceptions.incompleteForm('Please enter your name.'),
      AuthExceptions.unknown('boom'),
    ]
    expect(built.map((exception) => exception.kind).sort()).toEqual(
      [...authExceptionKinds].sort(),
    )
  })

  it('marks an unconfigured project unrecoverable — no retry fixes an unset variable', () => {
    expect(AuthExceptions.unavailable().recoverable).toBe(false)
  })

  it('names the missing variables when it has them, and stays generic when it does not', () => {
    expect(
      AuthExceptions.unavailable(['NEXT_PUBLIC_SUPABASE_URL']).message,
    ).toContain('NEXT_PUBLIC_SUPABASE_URL')
    expect(AuthExceptions.unavailable().message).not.toContain('NEXT_PUBLIC')
  })

  it('marks the recoverable cases recoverable, so a surface knows to offer a retry', () => {
    expect(AuthExceptions.invalidCredentials().recoverable).toBe(true)
    expect(AuthExceptions.networkUnavailable().recoverable).toBe(true)
  })

  it('substitutes copy for an empty unknown message rather than showing nothing', () => {
    expect(AuthExceptions.unknown('').message).toBe('Unexpected error.')
  })
})

describe('isAuthException', () => {
  it('recognises one of ours', () => {
    expect(isAuthException(AuthExceptions.cancelled())).toBe(true)
  })

  it('refuses a plain Error, a string and null', () => {
    expect(isAuthException(new Error('nope'))).toBe(false)
    expect(isAuthException('nope')).toBe(false)
    expect(isAuthException(null)).toBe(false)
  })

  it('refuses a look-alike whose kind is not in the union', () => {
    expect(
      isAuthException({ kind: 'teapot', message: 'x', recoverable: true }),
    ).toBe(false)
  })
})

describe('EndeavorSyncExceptions', () => {
  it('builds every declared kind', () => {
    const built = [
      EndeavorSyncExceptions.unavailable(),
      EndeavorSyncExceptions.notSignedIn(),
      EndeavorSyncExceptions.ownerUnresolved('u-1'),
      EndeavorSyncExceptions.localStoreFailed('quota'),
      EndeavorSyncExceptions.pullFailed('503'),
      EndeavorSyncExceptions.pushFailed('503'),
      EndeavorSyncExceptions.unknown('boom'),
    ]
    expect(built.map((exception) => exception.kind).sort()).toEqual(
      [...endeavorSyncExceptionKinds].sort(),
    )
  })

  it('has no case for "the flag is off" or "nobody is signed in" — those are states', () => {
    expect(endeavorSyncExceptionKinds).not.toContain('disabled')
    expect(endeavorSyncExceptionKinds).not.toContain('signedOut')
  })

  it('names the account whose owner row could not be resolved', () => {
    expect(EndeavorSyncExceptions.ownerUnresolved('u-1').message).toContain(
      'u-1',
    )
  })
})

describe('endeavorSyncExceptionFrom', () => {
  it('passes one of ours through untouched, so the engine tag survives', () => {
    const tagged = EndeavorSyncExceptions.ownerUnresolved('u-1')
    expect(endeavorSyncExceptionFrom(tagged)).toBe(tagged)
  })

  it("reads the browser's opaque TypeError as a network failure", () => {
    const mapped = endeavorSyncExceptionFrom(
      new TypeError('Failed to fetch'),
      EndeavorSyncExceptions.pullFailed,
    )
    expect(mapped.kind).toBe('pullFailed')
    expect(mapped.message).toContain('network')
  })

  it('falls back to the caller-chosen kind for anything else', () => {
    const mapped = endeavorSyncExceptionFrom(
      new Error('503'),
      EndeavorSyncExceptions.pushFailed,
    )
    expect(mapped.kind).toBe('pushFailed')
    expect(mapped.message).toContain('503')
  })

  it('stringifies a non-Error throw rather than losing it', () => {
    expect(endeavorSyncExceptionFrom('weird').message).toContain('weird')
  })
})

describe('isEndeavorSyncException', () => {
  it('recognises one of ours and refuses everything else', () => {
    expect(
      isEndeavorSyncException(EndeavorSyncExceptions.pullFailed('x')),
    ).toBe(true)
    expect(isEndeavorSyncException(new Error('x'))).toBe(false)
    expect(isEndeavorSyncException({ kind: 'pullFailed' })).toBe(false)
  })
})
