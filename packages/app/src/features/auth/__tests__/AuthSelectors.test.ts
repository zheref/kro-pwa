import { describe, expect, it } from 'vitest'
import { initialCaptureState } from '../../capture/CaptureFeature'
import { initialDoState } from '../../do/DoFeature'
import { initialEarnState } from '../../earn/EarnFeature'
import { initialEndeavorDetailState } from '../../endeavorDetail/EndeavorDetailFeature'
import { initialFindState } from '../../find/FindFeature'
import { initialGreetingState } from '../../greeting/GreetingFeature'
import { initialPlanState } from '../../plan/PlanFeature'
import { initialTriageState } from '../../triage/TriageFeature'
import type { RootState } from '../../../library/store'
import { AuthExceptions } from '../AuthException'
import { AuthMocks, authUserMocks } from '../AuthMocks'
import {
  selectAuthErrorCopy,
  selectAuthException,
  selectAuthenticatingFlow,
  selectConnectedProviders,
  selectCurrentUser,
  selectEndeavorSyncState,
  selectHasAuthError,
  selectIsAuthenticated,
  selectIsAuthenticating,
  selectIsEndeavorSyncDisabled,
  selectIsLocalDataDialogPresented,
  selectIsSessionResolved,
  selectIsSignInReady,
  selectIsSignUpReady,
  selectIsSubmitEnabled,
  selectLocalDataAnonymousCount,
  selectPendingSignOutIntents,
  selectSettingsSyncFooter,
  selectUserInitials,
} from '../AuthSelectors'
import {
  withFormField,
  withModeToggled,
  withSettingsSyncState,
} from '../AuthShifters'
import { initialMainState } from '../../main/MainFeature'
import { initialPlatformState } from '../../platform/PlatformFeature'
import { initialSessionState } from '../../session/SessionState'
import { initialThirstState } from '../../thirst/ThirstFeature'
import { AuthFlow, type AuthState } from '../AuthState'
import { signOutIntents } from '../SignOutIntents'
import { initialSettingsState } from '../../settings/SettingsState'

const rootWith = (auth: AuthState): RootState => ({
  greeting: initialGreetingState,
  // Present only because `RootState` names every registered slice; this suite
  // asserts nothing about the other features.
  do: initialDoState,
  capture: initialCaptureState,
  triage: initialTriageState,
  plan: initialPlanState,
  find: initialFindState,
  endeavorDetail: initialEndeavorDetailState,
  earn: initialEarnState,
  platform: initialPlatformState,
  session: initialSessionState,
  settings: initialSettingsState,
  auth,
  main: initialMainState,
  thirst: initialThirstState,
})

describe('the session', () => {
  it('reports the signed-in account', () => {
    expect(selectCurrentUser(rootWith(AuthMocks.signedIn))).toEqual(
      authUserMocks.typical,
    )
  })

  it('reports nobody while signed out', () => {
    expect(selectCurrentUser(rootWith(AuthMocks.signedOut))).toBeNull()
  })

  it('reports nobody while a sign-in is in flight', () => {
    expect(selectCurrentUser(rootWith(AuthMocks.authenticating))).toBeNull()
    expect(selectIsAuthenticated(rootWith(AuthMocks.authenticating))).toBe(
      false,
    )
  })

  it('distinguishes "not resolved yet" from "signed out", so the shell does not flash', () => {
    expect(selectIsSessionResolved(rootWith(AuthMocks.unknown))).toBe(false)
    expect(selectIsSessionResolved(rootWith(AuthMocks.signedOut))).toBe(true)
    expect(selectIsSessionResolved(rootWith(AuthMocks.signedIn))).toBe(true)
  })

  it('names the flow that is spinning, so the right button shows a spinner', () => {
    expect(selectAuthenticatingFlow(rootWith(AuthMocks.authenticating))).toBe(
      AuthFlow.emailPassword,
    )
    expect(selectAuthenticatingFlow(rootWith(AuthMocks.signedIn))).toBeNull()
    expect(selectIsAuthenticating(rootWith(AuthMocks.authenticating))).toBe(
      true,
    )
  })
})

describe('the error surface', () => {
  it('reports the exception when one is present', () => {
    expect(selectAuthException(rootWith(AuthMocks.failed))?.kind).toBe(
      'invalidCredentials',
    )
    expect(selectHasAuthError(rootWith(AuthMocks.failed))).toBe(true)
  })

  it('reports none when signed in or signed out', () => {
    expect(selectAuthException(rootWith(AuthMocks.signedIn))).toBeNull()
    expect(selectHasAuthError(rootWith(AuthMocks.signedOut))).toBe(false)
  })

  it('derives copy from the kind, never from the developer-facing message', () => {
    expect(selectAuthErrorCopy(rootWith(AuthMocks.failed))).toBe(
      'Incorrect email or password.',
    )
  })

  it('returns NO copy for a cancelled sheet — canon says it is not an error to show', () => {
    const cancelled: AuthState = {
      ...AuthMocks.signedOut,
      session: { kind: 'failed', exception: AuthExceptions.cancelled() },
    }
    expect(selectAuthErrorCopy(rootWith(cancelled))).toBeNull()
    // …while still reporting that a failure exists, so the spinner stops.
    expect(selectHasAuthError(rootWith(cancelled))).toBe(true)
  })

  it('explains an unconfigured project without blaming the user', () => {
    const copy = selectAuthErrorCopy(rootWith(AuthMocks.unavailable))
    expect(copy).toContain('keep using Kro on this device')
  })

  it('passes an incomplete-form message through, because it names the missing field', () => {
    const incomplete: AuthState = {
      ...AuthMocks.signedOut,
      session: {
        kind: 'failed',
        exception: AuthExceptions.incompleteForm('Please enter your name.'),
      },
    }
    expect(selectAuthErrorCopy(rootWith(incomplete))).toBe(
      'Please enter your name.',
    )
  })
})

describe('form readiness', () => {
  it('is not ready for sign-in with an empty form', () => {
    expect(selectIsSignInReady(rootWith(AuthMocks.signedOut))).toBe(false)
  })

  it('is ready for sign-in once both fields are filled', () => {
    const filled = withFormField(
      withFormField(AuthMocks.signedOut, 'email', 'ada@example.com'),
      'password',
      'secret',
    )
    expect(selectIsSignInReady(rootWith(filled))).toBe(true)
  })

  it('is not ready for sign-in with only an email', () => {
    const half = withFormField(AuthMocks.signedOut, 'email', 'ada@example.com')
    expect(selectIsSignInReady(rootWith(half))).toBe(false)
  })

  it("enforces canon's six-character minimum for sign-up", () => {
    const short = withFormField(AuthMocks.signUpReady, 'password', 'short')
    expect(selectIsSignUpReady(rootWith(short))).toBe(false)
    expect(selectIsSignUpReady(rootWith(AuthMocks.signUpReady))).toBe(true)
  })

  it('requires a name for sign-up but not for sign-in', () => {
    const nameless = withFormField(AuthMocks.signUpReady, 'name', '')
    expect(selectIsSignUpReady(rootWith(nameless))).toBe(false)
    expect(selectIsSignInReady(rootWith(nameless))).toBe(true)
  })

  it('enables submit for the mode the user is actually in', () => {
    expect(selectIsSubmitEnabled(rootWith(AuthMocks.signUpReady))).toBe(true)
    // The same form in sign-in mode is also submittable — email + password.
    const asSignIn = withModeToggled(AuthMocks.signUpReady)
    expect(selectIsSubmitEnabled(rootWith(asSignIn))).toBe(true)
  })

  it('disables submit while a flow is already running', () => {
    const running: AuthState = {
      ...AuthMocks.signUpReady,
      session: { kind: 'authenticating', flow: AuthFlow.emailPassword },
    }
    expect(selectIsSubmitEnabled(rootWith(running))).toBe(false)
  })
})

describe('the profile control', () => {
  it("derives initials from the account's display name", () => {
    expect(selectUserInitials(rootWith(AuthMocks.signedIn))).toBe('AL')
  })

  it('falls back to the primary email when the account has no name', () => {
    const unnamed: AuthState = {
      ...AuthMocks.signedIn,
      session: { kind: 'signedIn', user: authUserMocks.unnamed },
    }
    expect(selectUserInitials(rootWith(unnamed))).toBe('S')
  })

  it('is empty while signed out', () => {
    expect(selectUserInitials(rootWith(AuthMocks.signedOut))).toBe('')
  })

  it('reports the connected providers, and none while signed out', () => {
    expect(selectConnectedProviders(rootWith(AuthMocks.signedIn))).toEqual([
      'email_password',
    ])
    expect(selectConnectedProviders(rootWith(AuthMocks.signedOut))).toEqual([])
  })
})

describe('the existing-local-data dialog', () => {
  it('is presented when the dialog is shown', () => {
    expect(
      selectIsLocalDataDialogPresented(rootWith(AuthMocks.localDataDialog)),
    ).toBe(true)
  })

  it('is not presented while a choice is being applied, so it cannot be answered twice', () => {
    expect(
      selectIsLocalDataDialogPresented(rootWith(AuthMocks.localDataResolving)),
    ).toBe(false)
  })

  it('is not presented in an ordinary signed-in session', () => {
    expect(selectIsLocalDataDialogPresented(rootWith(AuthMocks.signedIn))).toBe(
      false,
    )
  })

  it('reports the count the message interpolates, and zero when hidden', () => {
    expect(
      selectLocalDataAnonymousCount(rootWith(AuthMocks.localDataDialog)),
    ).toBe(3)
    expect(selectLocalDataAnonymousCount(rootWith(AuthMocks.signedIn))).toBe(0)
  })
})

describe('the Settings hub footer', () => {
  it('says nothing before anything has synced', () => {
    expect(selectSettingsSyncFooter(rootWith(AuthMocks.signedIn))).toBeNull()
  })

  it('says Synced after a success', () => {
    expect(selectSettingsSyncFooter(rootWith(AuthMocks.settingsSynced))).toBe(
      'Synced',
    )
  })

  it('says the change is kept and will sync later when offline', () => {
    expect(selectSettingsSyncFooter(rootWith(AuthMocks.settingsOffline))).toBe(
      'Offline — will sync later',
    )
  })

  it('prompts a signed-out user to sign in rather than reporting a failure', () => {
    const signedOut = withSettingsSyncState(AuthMocks.signedOut, {
      kind: 'signedOut',
    })
    expect(selectSettingsSyncFooter(rootWith(signedOut))).toBe(
      'Sign in to sync',
    )
  })

  it('says it is syncing while an attempt is in flight', () => {
    const syncing = withSettingsSyncState(AuthMocks.signedIn, {
      kind: 'syncing',
    })
    expect(selectSettingsSyncFooter(rootWith(syncing))).toBe('Syncing…')
  })
})

describe('the endeavor engine', () => {
  it('reports disabled under the shipping flag configuration', () => {
    expect(
      selectIsEndeavorSyncDisabled(rootWith(AuthMocks.endeavorSyncDisabled)),
    ).toBe(true)
  })

  it('reports a completed sweep with its tombstone count', () => {
    const state = selectEndeavorSyncState(
      rootWith(AuthMocks.endeavorSyncCompleted),
    )
    expect(state).toMatchObject({ kind: 'completed', deleted: 1, pushed: 2 })
  })

  it('reports a failure with its typed exception', () => {
    expect(
      selectEndeavorSyncState(rootWith(AuthMocks.endeavorSyncFailed)),
    ).toMatchObject({ kind: 'failed' })
  })
})

describe('the sign-out intents queue', () => {
  it('reports the withdrawal a sign-out raised', () => {
    expect(
      selectPendingSignOutIntents(
        rootWith(AuthMocks.signedOutWithPendingIntents),
      ),
    ).toEqual(signOutIntents())
  })

  it('is empty in an ordinary signed-in session', () => {
    expect(selectPendingSignOutIntents(rootWith(AuthMocks.signedIn))).toEqual(
      [],
    )
  })

  it('is empty after a plain signed-out state with nothing owed', () => {
    expect(selectPendingSignOutIntents(rootWith(AuthMocks.signedOut))).toEqual(
      [],
    )
  })
})
