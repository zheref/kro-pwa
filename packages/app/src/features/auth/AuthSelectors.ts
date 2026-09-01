/**
 * The auth slice's derived reads (`RC-5`, `UZF-11`) — canon
 * `AuthSelectors.swift` (`isSignInReadySelector`, `isSignUpReadySelector`,
 * `hasErrorSelector`) plus the `MainState` selectors that describe the session
 * (`isAuthenticatedSelector`, the profile initials the toolbar renders).
 *
 * Every one is built with `createSelector` over `RootState` and reads nothing
 * but state — no clock, no service, no `Date.now()`. A `useAppSelector`
 * callback may do an O(1) field read; anything derived is here.
 */
import { type User, userInitials } from '@kro/core'
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../library/store'
import type { AuthException } from './AuthException'
import {
  type AuthFlow,
  AuthMode,
  type AuthState,
  type EndeavorSyncState,
  MINIMUM_PASSWORD_LENGTH,
  type SettingsSyncState,
} from './AuthState'
import type { SignOutIntent } from './SignOutIntents'

const slice = (state: RootState): AuthState => state.auth

export const selectAuthMode = createSelector([slice], (auth) => auth.mode)

export const selectAuthForm = createSelector([slice], (auth) => auth.form)

/** The signed-in account, or `null` in every other session state. */
export const selectCurrentUser = createSelector([slice], (auth): User | null =>
  auth.session.kind === 'signedIn' ? auth.session.user : null,
)

/** Canon's `isAuthenticatedSelector`. */
export const selectIsAuthenticated = createSelector(
  [selectCurrentUser],
  (user) => user !== null,
)

/**
 * Whether the launch restore has answered yet.
 *
 * `unknown` is not `signedOut`: a shell that renders the signed-out header
 * before the restore resolves flashes "Sign in" on every reload for an account
 * that is, in fact, signed in.
 */
export const selectIsSessionResolved = createSelector(
  [slice],
  (auth) => auth.session.kind !== 'unknown',
)

/** Which provider flow is spinning, or `null`. */
export const selectAuthenticatingFlow = createSelector(
  [slice],
  (auth): AuthFlow | null =>
    auth.session.kind === 'authenticating' ? auth.session.flow : null,
)

export const selectIsAuthenticating = createSelector(
  [selectAuthenticatingFlow],
  (flow) => flow !== null,
)

export const selectAuthException = createSelector(
  [slice],
  (auth): AuthException | null =>
    auth.session.kind === 'failed' ? auth.session.exception : null,
)

/** Canon's `hasErrorSelector`. */
export const selectHasAuthError = createSelector(
  [selectAuthException],
  (exception) => exception !== null,
)

/**
 * The copy an error banner shows, derived from `kind` — never read from
 * `message`, which is developer detail (`RC-8`).
 *
 * `cancelled` returns `null`, which is canon's behaviour spelled out: its
 * `errorDescription` for `.userCancelled` is `nil`, i.e. *not an error to show
 * in UI*. A surface renders a banner only when this is non-`null`.
 */
export const selectAuthErrorCopy = createSelector(
  [selectAuthException],
  (exception): string | null => {
    if (exception === null) return null
    switch (exception.kind) {
      case 'unavailable':
        return 'Kro Cloud is not set up for this build. You can keep using Kro on this device.'
      case 'notSignedIn':
        return 'Please sign in to use this feature.'
      case 'noIdentityToken':
        return 'Apple Sign In failed. Please try again.'
      case 'userCreationFailed':
        return 'We could not finish setting up your account. Please try again.'
      case 'sessionExpired':
        return 'Your session has expired. Please sign in again.'
      case 'cancelled':
        return null
      case 'invalidCredentials':
        return 'Incorrect email or password.'
      case 'emailAlreadyInUse':
        return 'An account with this email already exists. Try signing in.'
      case 'weakPassword':
        return 'Please choose a stronger password.'
      case 'networkUnavailable':
        return 'No internet connection. Please try again.'
      case 'providerRejected':
        return 'That sign-in was rejected. Please try again.'
      case 'incompleteForm':
        return exception.message
      case 'unknown':
        return 'An unexpected error occurred.'
    }
  },
)

/** Canon's `isSignInReadySelector`. */
export const selectIsSignInReady = createSelector(
  [slice],
  (auth) => auth.form.email.length > 0 && auth.form.password.length > 0,
)

/** Canon's `isSignUpReadySelector`, including its 6-character minimum. */
export const selectIsSignUpReady = createSelector(
  [slice],
  (auth) =>
    auth.form.name.length > 0 &&
    auth.form.email.length > 0 &&
    auth.form.password.length >= MINIMUM_PASSWORD_LENGTH,
)

/** Whether the submit button for the *current* mode may fire. */
export const selectIsSubmitEnabled = createSelector(
  [slice, selectIsSignInReady, selectIsSignUpReady],
  (auth, signInReady, signUpReady) => {
    if (auth.session.kind === 'authenticating') return false
    return auth.mode === AuthMode.signIn ? signInReady : signUpReady
  },
)

/** `User.initials` for the profile control, or `''` when signed out. */
export const selectUserInitials = createSelector([selectCurrentUser], (user) =>
  user === null ? '' : userInitials(user),
)

/** The providers this account has connected, for the Profile section. */
export const selectConnectedProviders = createSelector(
  [selectCurrentUser],
  (user) => (user === null ? [] : user.connectedProviders),
)

export const selectLocalDataDialog = createSelector(
  [slice],
  (auth) => auth.localData,
)

/** Whether the existing-local-data dialog is on screen. */
export const selectIsLocalDataDialogPresented = createSelector(
  [selectLocalDataDialog],
  (dialog) => dialog.kind === 'shown',
)

/** The count canon interpolates into the dialog message, or `0`. */
export const selectLocalDataAnonymousCount = createSelector(
  [selectLocalDataDialog],
  (dialog) => (dialog.kind === 'shown' ? dialog.anonymousCount : 0),
)

export const selectSettingsSyncState = createSelector(
  [slice],
  (auth): SettingsSyncState => auth.settingsSync,
)

/** The Settings hub footer's copy, derived per case. */
export const selectSettingsSyncFooter = createSelector(
  [selectSettingsSyncState],
  (sync): string | null => {
    switch (sync.kind) {
      case 'idle':
        return null
      case 'syncing':
        return 'Syncing…'
      case 'synced':
        return 'Synced'
      case 'offline':
        return 'Offline — will sync later'
      case 'signedOut':
        return 'Sign in to sync'
    }
  },
)

export const selectEndeavorSyncState = createSelector(
  [slice],
  (auth): EndeavorSyncState => auth.endeavorSync,
)

/** Whether Kro Cloud endeavor sync is doing anything at all in this build. */
export const selectIsEndeavorSyncDisabled = createSelector(
  [selectEndeavorSyncState],
  (sync) => sync.kind === 'disabled',
)

/** The platform actions sign-out raised and #34 has not performed yet. */
export const selectPendingSignOutIntents = createSelector(
  [slice],
  (auth): readonly SignOutIntent[] => auth.pendingSignOutIntents,
)
