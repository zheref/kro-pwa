/**
 * The auth slice's own reducer arms.
 *
 * The synchronous events are called directly against `authSlice.reducer`
 * (`RC-12`); the defensive `.rejected` arms are driven through the generated
 * action creators, because a Producer never throws and there is no other way to
 * reach them (`RC-26`).
 */
import { describe, expect, it } from 'vitest'
import { AuthExceptions } from '../AuthException'
import {
  authSlice,
  childPlatformDelegatedSignOutIntentsPerformed,
  onAppleAuthorizationFailed,
  onLocalDataDialogDismissed,
  onProviderSheetDismissed,
  userDidChangeEmail,
  userDidChangeName,
  userDidChangePassword,
  userDidDismissException,
  userDidTapToggleMode,
} from '../AuthFeature'
import { AuthMocks } from '../AuthMocks'
import {
  restoreSessionThunk,
  signInWithEmailThunk,
  signOutThunk,
  syncSettingsThunk,
  synchronizeEndeavorsThunk,
} from '../AuthProducer'
import { AuthMode, initialAuthState } from '../AuthState'

const NOW = new Date('2026-08-31T10:00:00.000Z')
const reduce = authSlice.reducer

describe('the initial state', () => {
  it('starts with the session unresolved, not signed out', () => {
    expect(initialAuthState.session).toEqual({ kind: 'unknown' })
  })

  it('starts in sign-in mode with an empty form', () => {
    expect(initialAuthState.mode).toBe(AuthMode.signIn)
    expect(initialAuthState.form).toEqual({ email: '', password: '', name: '' })
  })

  it('starts with no dialog, no nonce and nothing owed to the platform tier', () => {
    expect(initialAuthState.localData).toEqual({ kind: 'hidden' })
    expect(initialAuthState.appleRawNonce).toBeNull()
    expect(initialAuthState.pendingSignOutIntents).toEqual([])
  })
})

describe('the form events', () => {
  it('records an email as the user types it', () => {
    expect(reduce(initialAuthState, userDidChangeEmail('ada@')).form.email).toBe('ada@')
  })

  it('records a password without touching the other fields', () => {
    const next = reduce(initialAuthState, userDidChangePassword('secret'))
    expect(next.form).toEqual({ email: '', password: 'secret', name: '' })
  })

  it('records a name', () => {
    expect(reduce(initialAuthState, userDidChangeName('Ada')).form.name).toBe('Ada')
  })

  it('accepts a cleared field — deleting what you typed is a real edit', () => {
    const typed = reduce(initialAuthState, userDidChangeEmail('ada@'))
    expect(reduce(typed, userDidChangeEmail('')).form.email).toBe('')
  })

  it('leaves the session alone while typing', () => {
    const next = reduce(AuthMocks.signedOut, userDidChangeEmail('ada@'))
    expect(next.session).toEqual({ kind: 'signedOut' })
  })
})

describe('userDidTapToggleMode', () => {
  it('switches to create-account', () => {
    expect(reduce(initialAuthState, userDidTapToggleMode()).mode).toBe(AuthMode.signUp)
  })

  it('switches back', () => {
    const inSignUp = reduce(initialAuthState, userDidTapToggleMode())
    expect(reduce(inSignUp, userDidTapToggleMode()).mode).toBe(AuthMode.signIn)
  })

  it('clears a previous error, so the create form does not open showing a sign-in failure', () => {
    expect(reduce(AuthMocks.failed, userDidTapToggleMode()).session.kind).toBe(
      'signedOut',
    )
  })

  it('keeps whatever the user has typed, so switching mode is not destructive', () => {
    const next = reduce(AuthMocks.signUpReady, userDidTapToggleMode())
    expect(next.form.email).toBe('new@example.com')
  })
})

describe('userDidDismissException', () => {
  it('dismisses a failure banner', () => {
    expect(reduce(AuthMocks.failed, userDidDismissException()).session.kind).toBe(
      'signedOut',
    )
  })

  it('is a no-op when nothing failed', () => {
    expect(reduce(AuthMocks.signedIn, userDidDismissException()).session.kind).toBe(
      'signedIn',
    )
  })

  it('does not cancel a running flow', () => {
    expect(
      reduce(AuthMocks.authenticating, userDidDismissException()).session.kind,
    ).toBe('authenticating')
  })
})

describe('onAppleAuthorizationFailed', () => {
  it("surfaces Apple's own failure as a provider rejection", () => {
    const next = reduce(
      AuthMocks.authenticating,
      onAppleAuthorizationFailed('popup_closed_by_user'),
    )
    expect(next.session).toMatchObject({
      kind: 'failed',
      exception: { kind: 'providerRejected' },
    })
  })

  it('stops the spinner', () => {
    const next = reduce(AuthMocks.authenticating, onAppleAuthorizationFailed('x'))
    expect(next.session.kind).not.toBe('authenticating')
  })

  it('names the reported reason in the message for logs', () => {
    const next = reduce(AuthMocks.authenticating, onAppleAuthorizationFailed('invalid_client'))
    expect(next.session).toMatchObject({
      exception: { message: expect.stringContaining('invalid_client') },
    })
  })
})

describe('onProviderSheetDismissed', () => {
  it('stops the spinner when the user closes the provider sheet', () => {
    const next = reduce(AuthMocks.authenticating, onProviderSheetDismissed())
    expect(next.session.kind).toBe('failed')
  })

  it('records the cancellation as its own case, which renders no banner', () => {
    const next = reduce(AuthMocks.authenticating, onProviderSheetDismissed())
    expect(next.session).toMatchObject({ exception: AuthExceptions.cancelled() })
  })

  it('drops any nonce in flight', () => {
    const withNonce = { ...AuthMocks.authenticating, appleRawNonce: 'raw' }
    expect(reduce(withNonce, onProviderSheetDismissed()).appleRawNonce).toBeNull()
  })
})

describe('onLocalDataDialogDismissed', () => {
  it('hides a shown dialog', () => {
    expect(
      reduce(AuthMocks.localDataDialog, onLocalDataDialogDismissed()).localData,
    ).toEqual({ kind: 'hidden' })
  })

  it('is a no-op when no dialog is up', () => {
    expect(reduce(AuthMocks.signedIn, onLocalDataDialogDismissed()).localData).toEqual({
      kind: 'hidden',
    })
  })

  it('leaves the signed-in session intact — dismissing the prompt does not sign anyone out', () => {
    expect(
      reduce(AuthMocks.localDataDialog, onLocalDataDialogDismissed()).session.kind,
    ).toBe('signedIn')
  })
})

describe('childPlatformDelegatedSignOutIntentsPerformed', () => {
  it('clears the queue once #34 has withdrawn the alerts', () => {
    const next = reduce(
      AuthMocks.signedOutWithPendingIntents,
      childPlatformDelegatedSignOutIntentsPerformed(),
    )
    expect(next.pendingSignOutIntents).toEqual([])
  })

  it('is a no-op when nothing is owed', () => {
    const next = reduce(
      AuthMocks.signedOut,
      childPlatformDelegatedSignOutIntentsPerformed(),
    )
    expect(next.pendingSignOutIntents).toEqual([])
  })

  it('leaves the session alone', () => {
    const next = reduce(
      AuthMocks.signedOutWithPendingIntents,
      childPlatformDelegatedSignOutIntentsPerformed(),
    )
    expect(next.session).toEqual({ kind: 'signedOut' })
  })
})

// ---------------------------------------------------------------------------
// The defensive `.rejected` arms (RC-26) — structurally unreachable in practice
// ---------------------------------------------------------------------------

describe('the defensive rejected arms', () => {
  const rejectionOf = (
    thunk: { rejected: { type: string } },
    meta: Record<string, unknown> = {},
  ) => ({
    type: thunk.rejected.type,
    payload: undefined,
    error: { message: 'a bug in the payload creator' },
    meta: { arg: meta, requestId: 'r', requestStatus: 'rejected' as const },
  })

  it('degrades a rejected restore to a typed unknown failure rather than a stuck spinner', () => {
    const next = reduce(AuthMocks.unknown, rejectionOf(restoreSessionThunk, { now: NOW }))
    expect(next.session).toMatchObject({ kind: 'failed', exception: { kind: 'unknown' } })
  })

  it('degrades a rejected sign-in the same way', () => {
    const next = reduce(
      AuthMocks.authenticating,
      rejectionOf(signInWithEmailThunk, { email: '', password: '', now: NOW }),
    )
    expect(next.session).toMatchObject({ kind: 'failed' })
  })

  it('still signs the user out when the sign-out thunk itself rejects', () => {
    const next = reduce(AuthMocks.signedIn, rejectionOf(signOutThunk))
    expect(next.session).toEqual({ kind: 'signedOut' })
  })

  it('degrades a rejected settings sync to the offline footer', () => {
    const next = reduce(
      AuthMocks.signedIn,
      rejectionOf(syncSettingsThunk, { trigger: 'appLaunch', now: NOW }),
    )
    expect(next.settingsSync).toEqual({ kind: 'offline' })
  })

  it('degrades a rejected endeavor sweep to a typed failure', () => {
    const next = reduce(
      AuthMocks.signedIn,
      rejectionOf(synchronizeEndeavorsThunk, { now: NOW }),
    )
    expect(next.endeavorSync).toMatchObject({ kind: 'failed' })
  })
})

// ---------------------------------------------------------------------------
// The pending arms
// ---------------------------------------------------------------------------

describe('the restore pending arm', () => {
  const pendingOf = (thunk: { pending: { type: string } }, meta: Record<string, unknown>) => ({
    type: thunk.pending.type,
    payload: undefined,
    meta: { arg: meta, requestId: 'r', requestStatus: 'pending' as const },
  })

  it('spins on the very first restore', () => {
    const next = reduce(AuthMocks.unknown, pendingOf(restoreSessionThunk, { now: NOW }))
    expect(next.session.kind).toBe('authenticating')
  })

  it('does NOT blank a signed-in header on a re-restore triggered by a token refresh', () => {
    const next = reduce(AuthMocks.signedIn, pendingOf(restoreSessionThunk, { now: NOW }))
    expect(next.session.kind).toBe('signedIn')
  })

  it('does not spin the settings footer when Settings is merely opened', () => {
    const next = reduce(
      AuthMocks.signedIn,
      pendingOf(syncSettingsThunk, { trigger: 'settingsOpened', now: NOW }),
    )
    expect(next.settingsSync).toEqual({ kind: 'idle' })
  })

  it('does spin the settings footer for a real pull', () => {
    const next = reduce(
      AuthMocks.signedIn,
      pendingOf(syncSettingsThunk, { trigger: 'appLaunch', now: NOW }),
    )
    expect(next.settingsSync).toEqual({ kind: 'syncing' })
  })
})
