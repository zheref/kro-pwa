/**
 * The endeavor sync engine's failure union.
 *
 * The behaviour of each factory and of `endeavorSyncExceptionFrom` is exercised
 * in `AuthException.test.ts`, which owns both unions in one place because the
 * two are read side by side. This suite pins the *contract* that makes the
 * split meaningful: which outcomes are failures and which are states.
 */
import { describe, expect, it } from 'vitest'
import {
  EndeavorSyncExceptions,
  endeavorSyncExceptionKinds,
} from '../EndeavorSyncException'

describe('what counts as a failure', () => {
  it('never treats "the flag is off" as a failure — that is the shipping state', () => {
    expect(endeavorSyncExceptionKinds).not.toContain('disabled')
  })

  it('never treats "nobody is signed in" as a failure — signed-out local use is supported', () => {
    expect(endeavorSyncExceptionKinds).not.toContain('signedOut')
  })

  it('does treat an unresolvable owner as a failure, because a push cannot proceed without one', () => {
    expect(endeavorSyncExceptionKinds).toContain('ownerUnresolved')
  })
})

describe('recoverability', () => {
  it('marks an unconfigured project unrecoverable — no retry sets an environment variable', () => {
    expect(EndeavorSyncExceptions.unavailable().recoverable).toBe(false)
  })

  it('marks a transport failure recoverable, so the next sweep retries', () => {
    expect(EndeavorSyncExceptions.pullFailed('503').recoverable).toBe(true)
    expect(EndeavorSyncExceptions.pushFailed('503').recoverable).toBe(true)
  })

  it('marks "not signed in" unrecoverable — signing in is a different action, not a retry', () => {
    expect(EndeavorSyncExceptions.notSignedIn().recoverable).toBe(false)
  })
})

describe('the messages', () => {
  it('name the account whose owner row could not be resolved', () => {
    expect(EndeavorSyncExceptions.ownerUnresolved('u-7').message).toContain('u-7')
  })

  it('name the missing environment variables when they are known', () => {
    expect(
      EndeavorSyncExceptions.unavailable(['NEXT_PUBLIC_SUPABASE_URL']).message,
    ).toContain('NEXT_PUBLIC_SUPABASE_URL')
  })

  it('substitute copy for an empty unknown message rather than showing nothing', () => {
    expect(EndeavorSyncExceptions.unknown('').message).toBe('Unexpected error.')
  })
})
