import { describe, expect, it } from 'vitest'
import { AuthExceptions } from '../AuthException'
import { AuthMocks, authUserMocks } from '../AuthMocks'
import {
  withAppleChallengeMinted,
  withAuthFailed,
  withAuthFlowStarted,
  withEndeavorSyncFailed,
  withEndeavorSyncState,
  withExceptionCleared,
  withFormField,
  withLocalDataChoiceFailed,
  withLocalDataChoiceStarted,
  withLocalDataDialogDismissed,
  withLocalDataDialogShown,
  withModeToggled,
  withSettingsSyncState,
  withSignInOutcome,
  withSignOutIntentsAcknowledged,
  withSignedIn,
  withSignedOut,
  withSignedOutResolved,
} from '../AuthShifters'
import { AuthFlow, AuthMode } from '../AuthState'
import { EndeavorSyncExceptions } from '../EndeavorSyncException'
import { LocalDataChoice } from '../LocalDataDialog'
import { signOutIntents } from '../SignOutIntents'

describe('withAuthFlowStarted', () => {
  it('spins the named flow from a signed-out state (the user taps Sign In)', () => {
    const next = withAuthFlowStarted(
      AuthMocks.signedOut,
      AuthFlow.emailPassword,
    )
    expect(next.session).toEqual({
      kind: 'authenticating',
      flow: AuthFlow.emailPassword,
    })
  })

  it('clears a previous error, so a retry does not show the last failure', () => {
    const next = withAuthFlowStarted(AuthMocks.failed, AuthFlow.google)
    expect(next.session.kind).toBe('authenticating')
  })

  it('returns a new object rather than mutating the input', () => {
    const before = AuthMocks.signedOut
    const next = withAuthFlowStarted(before, AuthFlow.apple)
    expect(next).not.toBe(before)
    expect(before.session.kind).toBe('signedOut')
  })
})

describe('withAuthFailed', () => {
  it('stops the spinner and surfaces the exception', () => {
    const next = withAuthFailed(
      AuthMocks.authenticating,
      AuthExceptions.invalidCredentials(),
    )
    expect(next.session).toEqual({
      kind: 'failed',
      exception: AuthExceptions.invalidCredentials(),
    })
  })

  it('drops any Apple nonce in flight, so a stale one cannot be replayed', () => {
    const withNonce = withAppleChallengeMinted(AuthMocks.signedOut, 'raw-nonce')
    const next = withAuthFailed(withNonce, AuthExceptions.noIdentityToken())
    expect(next.appleRawNonce).toBeNull()
  })

  it('replaces an earlier failure rather than stacking one', () => {
    const first = withAuthFailed(
      AuthMocks.signedOut,
      AuthExceptions.cancelled(),
    )
    const second = withAuthFailed(first, AuthExceptions.networkUnavailable())
    expect(second.session).toEqual({
      kind: 'failed',
      exception: AuthExceptions.networkUnavailable(),
    })
  })
})

describe('withSignedIn', () => {
  it('settles the session on the account', () => {
    const next = withSignedIn(AuthMocks.authenticating, authUserMocks.typical)
    expect(next.session).toEqual({
      kind: 'signedIn',
      user: authUserMocks.typical,
    })
  })

  it('empties the form — a password with no remaining purpose is not held', () => {
    const next = withSignedIn(AuthMocks.signUpReady, authUserMocks.typical)
    expect(next.form).toEqual({ email: '', password: '', name: '' })
  })

  it('drops the Apple nonce, whose attempt has now resolved', () => {
    const withNonce = withAppleChallengeMinted(AuthMocks.signedOut, 'raw-nonce')
    expect(
      withSignedIn(withNonce, authUserMocks.apple).appleRawNonce,
    ).toBeNull()
  })
})

describe('withSignedOutResolved', () => {
  it('answers "nobody" for a launch restore on a fresh browser', () => {
    expect(withSignedOutResolved(AuthMocks.unknown).session).toEqual({
      kind: 'signedOut',
    })
  })

  it('is distinct from a failure — nothing went wrong', () => {
    expect(withSignedOutResolved(AuthMocks.unknown).session.kind).not.toBe(
      'failed',
    )
  })

  it('leaves the form alone, so a half-typed sign-in survives the restore answering', () => {
    const typing = withFormField(AuthMocks.unknown, 'email', 'ada@')
    expect(withSignedOutResolved(typing).form.email).toBe('ada@')
  })
})

describe('withSignedOut', () => {
  it('drops the account', () => {
    expect(withSignedOut(AuthMocks.signedIn, []).session).toEqual({
      kind: 'signedOut',
    })
  })

  it('resets the whole session footprint at once — dialog, form, nonce, both sync states', () => {
    const dirty = withAppleChallengeMinted(
      withSettingsSyncState(AuthMocks.localDataDialog, { kind: 'offline' }),
      'raw-nonce',
    )
    const next = withSignedOut(dirty, [])
    expect(next.localData).toEqual({ kind: 'hidden' })
    expect(next.appleRawNonce).toBeNull()
    expect(next.form).toEqual({ email: '', password: '', name: '' })
    expect(next.endeavorSync).toEqual({ kind: 'idle' })
  })

  it('sets the settings footer to "sign in to sync" rather than leaving a stale "synced"', () => {
    expect(withSignedOut(AuthMocks.settingsSynced, []).settingsSync).toEqual({
      kind: 'signedOut',
    })
  })

  it('raises the platform intents in the same transition, so no caller can forget them', () => {
    const next = withSignedOut(AuthMocks.signedIn, signOutIntents())
    expect(next.pendingSignOutIntents).toEqual(signOutIntents())
  })

  it('keeps the mode the user last chose — a UI preference, not account data', () => {
    const inSignUp = withModeToggled(AuthMocks.signedIn)
    expect(withSignedOut(inSignUp, []).mode).toBe(AuthMode.signUp)
  })
})

describe('withSignOutIntentsAcknowledged', () => {
  it('clears the queue once a surface has performed it', () => {
    const next = withSignOutIntentsAcknowledged(
      AuthMocks.signedOutWithPendingIntents,
    )
    expect(next.pendingSignOutIntents).toEqual([])
  })

  it('is a no-op when nothing is pending', () => {
    const next = withSignOutIntentsAcknowledged(AuthMocks.signedOut)
    expect(next.pendingSignOutIntents).toEqual([])
  })

  it('leaves the session untouched', () => {
    const next = withSignOutIntentsAcknowledged(
      AuthMocks.signedOutWithPendingIntents,
    )
    expect(next.session.kind).toBe('signedOut')
  })
})

describe('withModeToggled', () => {
  it('flips sign-in to create-account', () => {
    expect(withModeToggled(AuthMocks.signedOut).mode).toBe(AuthMode.signUp)
  })

  it('flips back', () => {
    expect(withModeToggled(withModeToggled(AuthMocks.signedOut)).mode).toBe(
      AuthMode.signIn,
    )
  })

  it('clears a previous error, exactly as canon does', () => {
    expect(withModeToggled(AuthMocks.failed).session.kind).toBe('signedOut')
  })

  it('leaves a signed-in session alone', () => {
    expect(withModeToggled(AuthMocks.signedIn).session.kind).toBe('signedIn')
  })
})

describe('withFormField', () => {
  it('sets one field and leaves the others', () => {
    const next = withFormField(AuthMocks.signedOut, 'email', 'ada@example.com')
    expect(next.form).toEqual({
      email: 'ada@example.com',
      password: '',
      name: '',
    })
  })

  it('accepts an empty value — clearing a field is a real edit', () => {
    const typed = withFormField(AuthMocks.signedOut, 'name', 'Ada')
    expect(withFormField(typed, 'name', '').form.name).toBe('')
  })

  it('replaces the form object rather than mutating it', () => {
    const before = AuthMocks.signedOut
    const next = withFormField(before, 'password', 'secret')
    expect(next.form).not.toBe(before.form)
    expect(before.form.password).toBe('')
  })
})

describe('withExceptionCleared', () => {
  it('dismisses a failure', () => {
    expect(withExceptionCleared(AuthMocks.failed).session.kind).toBe(
      'signedOut',
    )
  })

  it('leaves a signed-in session alone', () => {
    expect(withExceptionCleared(AuthMocks.signedIn).session.kind).toBe(
      'signedIn',
    )
  })

  it('leaves a running flow alone — dismissing a banner does not cancel a sign-in', () => {
    expect(withExceptionCleared(AuthMocks.authenticating).session.kind).toBe(
      'authenticating',
    )
  })
})

describe('withAppleChallengeMinted', () => {
  it('stores the raw nonce for the attempt in flight', () => {
    expect(
      withAppleChallengeMinted(AuthMocks.signedOut, 'raw').appleRawNonce,
    ).toBe('raw')
  })

  it('replaces a previous nonce, so only one attempt is ever live', () => {
    const first = withAppleChallengeMinted(AuthMocks.signedOut, 'first')
    expect(withAppleChallengeMinted(first, 'second').appleRawNonce).toBe(
      'second',
    )
  })

  it('never stores the hashed half, which belongs to Apple and not to this device', () => {
    const next = withAppleChallengeMinted(AuthMocks.signedOut, 'raw')
    expect(JSON.stringify(next)).not.toContain('hashed')
  })
})

describe('the existing-local-data dialog', () => {
  it('opens with the account and the count', () => {
    const next = withLocalDataDialogShown(AuthMocks.authenticating, {
      pendingUser: authUserMocks.typical,
      anonymousCount: 3,
    })
    expect(next.localData).toEqual({
      kind: 'shown',
      pendingUser: authUserMocks.typical,
      anonymousCount: 3,
    })
  })

  it('signs the user in at the same moment — canon holds the account, not the sign-in', () => {
    const next = withLocalDataDialogShown(AuthMocks.authenticating, {
      pendingUser: authUserMocks.typical,
      anonymousCount: 1,
    })
    expect(next.session).toEqual({
      kind: 'signedIn',
      user: authUserMocks.typical,
    })
  })

  it('moves to resolving on a choice, carrying the account forward', () => {
    const next = withLocalDataChoiceStarted(
      AuthMocks.localDataDialog,
      LocalDataChoice.signAll,
    )
    expect(next.localData).toEqual({
      kind: 'resolving',
      pendingUser: authUserMocks.typical,
      choice: LocalDataChoice.signAll,
    })
  })

  it('ignores a choice when no dialog is up', () => {
    expect(
      withLocalDataChoiceStarted(AuthMocks.signedIn, LocalDataChoice.clearAll)
        .localData,
    ).toEqual({ kind: 'hidden' })
  })

  it('hides on success', () => {
    expect(
      withLocalDataDialogDismissed(AuthMocks.localDataResolving).localData,
    ).toEqual({ kind: 'hidden' })
  })

  it('re-opens on failure rather than stranding a signed-in account with unresolved rows', () => {
    const next = withLocalDataChoiceFailed(AuthMocks.localDataResolving, 2)
    expect(next.localData).toEqual({
      kind: 'shown',
      pendingUser: authUserMocks.typical,
      anonymousCount: 2,
    })
  })

  it('ignores a failure when nothing was resolving', () => {
    expect(withLocalDataChoiceFailed(AuthMocks.signedIn, 5).localData).toEqual({
      kind: 'hidden',
    })
  })
})

describe('the sync footers', () => {
  it('records a successful settings sync with its instant', () => {
    const at = new Date('2026-08-31T09:00:00.000Z')
    expect(
      withSettingsSyncState(AuthMocks.signedIn, { kind: 'synced', at })
        .settingsSync,
    ).toEqual({ kind: 'synced', at })
  })

  it('records an offline settings attempt', () => {
    expect(
      withSettingsSyncState(AuthMocks.signedIn, { kind: 'offline' })
        .settingsSync,
    ).toEqual({ kind: 'offline' })
  })

  it('records a disabled endeavor engine — the shipping state, not a failure', () => {
    expect(
      withEndeavorSyncState(AuthMocks.signedIn, { kind: 'disabled' })
        .endeavorSync,
    ).toEqual({ kind: 'disabled' })
  })

  it('records a failed sweep with its typed exception', () => {
    const exception = EndeavorSyncExceptions.pullFailed('503')
    expect(
      withEndeavorSyncFailed(AuthMocks.signedIn, exception).endeavorSync,
    ).toEqual({
      kind: 'failed',
      exception,
    })
  })

  it('keeps the two footers independent — a failed sweep must not blank the settings footer', () => {
    const next = withEndeavorSyncFailed(
      AuthMocks.settingsSynced,
      EndeavorSyncExceptions.pushFailed('503'),
    )
    expect(next.settingsSync.kind).toBe('synced')
  })
})

describe('withSignInOutcome', () => {
  it('settles the session when there is no local data', () => {
    const next = withSignInOutcome(AuthMocks.authenticating, {
      ok: true,
      value: { user: authUserMocks.typical, localDataPrompt: null },
    })
    expect(next.session).toEqual({
      kind: 'signedIn',
      user: authUserMocks.typical,
    })
    expect(next.localData).toEqual({ kind: 'hidden' })
  })

  it('opens the dialog when local data exists', () => {
    const next = withSignInOutcome(AuthMocks.authenticating, {
      ok: true,
      value: { user: authUserMocks.typical, localDataPrompt: 4 },
    })
    expect(next.localData).toEqual({
      kind: 'shown',
      pendingUser: authUserMocks.typical,
      anonymousCount: 4,
    })
  })

  it('surfaces the failure and opens no dialog', () => {
    const next = withSignInOutcome(AuthMocks.authenticating, {
      ok: false,
      error: AuthExceptions.invalidCredentials(),
    })
    expect(next.session.kind).toBe('failed')
    expect(next.localData).toEqual({ kind: 'hidden' })
  })
})
