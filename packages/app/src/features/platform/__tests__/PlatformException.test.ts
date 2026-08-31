/**
 * The platform failure union: one `kind` per genuinely-reportable failure, and
 * — just as importantly — nothing for a denied permission, which canon calls a
 * silent state rather than an error.
 */
import { describe, expect, it } from 'vitest'
import { PlatformExceptions } from '../PlatformException'

describe('PlatformExceptions', () => {
  it('tags a probe failure and keeps the platform reason in the message', () => {
    const exception = PlatformExceptions.statusProbeFailed('SecurityError')
    expect(exception.kind).toBe('statusProbeFailed')
    expect(exception.message).toContain('SecurityError')
  })

  it('tags a reconciliation failure so a retry surface can offer one', () => {
    const exception = PlatformExceptions.reconciliationFailed('QuotaExceeded')
    expect(exception.kind).toBe('reconciliationFailed')
    expect(exception.recoverable).toBe(true)
  })

  it('tags a sign-out withdrawal failure separately from reconciliation', () => {
    expect(PlatformExceptions.withdrawalFailed('boom').kind).toBe(
      'withdrawalFailed',
    )
  })

  it('tags an install-prompt failure', () => {
    const exception = PlatformExceptions.installPromptFailed('AbortError')
    expect(exception.kind).toBe('installPromptFailed')
    expect(exception.message).toContain('AbortError')
  })

  it('tags a thrown permission prompt — not the user saying no', () => {
    expect(PlatformExceptions.permissionRequestFailed('boom').kind).toBe(
      'permissionRequestFailed',
    )
  })

  it('carries the raw message on the defensive unknown fallback', () => {
    const exception = PlatformExceptions.unknown('serialization boom')
    expect(exception.kind).toBe('unknown')
    expect(exception.message).toBe('serialization boom')
  })

  it('marks every kind recoverable — none of these is a dead end', () => {
    const all = [
      PlatformExceptions.statusProbeFailed('a'),
      PlatformExceptions.reconciliationFailed('b'),
      PlatformExceptions.withdrawalFailed('c'),
      PlatformExceptions.installPromptFailed('d'),
      PlatformExceptions.permissionRequestFailed('e'),
      PlatformExceptions.unknown('f'),
    ]
    for (const exception of all) expect(exception.recoverable).toBe(true)
  })

  it('declares no kind for a denied permission — that is a state, not an error', () => {
    expect(Object.keys(PlatformExceptions)).not.toContain('permissionDenied')
  })
})
