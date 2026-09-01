/**
 * The settings failure union.
 *
 * The assertions worth making about a typed exception are its discriminant, its
 * recoverability (which decides whether a surface offers a retry) and the fact
 * that a provider message never becomes user copy — the copy is derived per
 * `kind` in `SettingsSelectors`, and these keep `message` in its place.
 */
import { describe, expect, it } from 'vitest'
import { SettingsExceptions } from '../SettingsException'

describe('the four cases', () => {
  it('names an unreadable preference store, and offers a retry', () => {
    const exception =
      SettingsExceptions.preferencesUnavailable('quota exceeded')

    expect(exception.kind).toBe('preferencesUnavailable')
    expect(exception.recoverable).toBe(true)
  })

  it('names a refused write, and offers a retry', () => {
    expect(SettingsExceptions.preferenceRejected('bad shape').recoverable).toBe(
      true,
    )
  })

  it('marks an unconfigured deployment unrecoverable — retrying supplies no client', () => {
    const exception =
      SettingsExceptions.integrationUnconfigured('GOOGLE_CLIENT_ID')

    expect(exception.kind).toBe('integrationUnconfigured')
    expect(exception.recoverable).toBe(false)
  })

  it('marks a failed connect attempt recoverable — the next one may work', () => {
    expect(SettingsExceptions.integrationUnavailable('502').recoverable).toBe(
      true,
    )
  })
})

describe('the developer message stays developer-facing', () => {
  it('keeps what it was given, for a log', () => {
    expect(
      SettingsExceptions.preferencesUnavailable('quota exceeded').message,
    ).toBe('quota exceeded')
  })

  it('defaults to empty rather than to a sentence a surface might print', () => {
    expect(SettingsExceptions.integrationUnavailable().message).toBe('')
  })

  it('never carries the message into the kind', () => {
    expect(SettingsExceptions.preferenceRejected('anything').kind).toBe(
      'preferenceRejected',
    )
  })
})
