/**
 * The auth slice's pure state transitions (`RC-4`, `UZF-10`) — canon
 * `AuthShifters.swift` (`applyLoadingStarted`, `applyAuthFailed`) plus the
 * `MainShifters` half (`applySignedOut`).
 *
 * Every function here is `with…(state, args) => AuthState`: a brand-new object,
 * no clock, no randomness, no service. Where a transition needs the current
 * instant it takes it as an argument, which is what makes "signing out records
 * the withdrawal intent" a plain unit test rather than a fake-timer setup.
 *
 * The invariants worth naming, because each is why a Shifter exists at all
 * rather than an inline assignment:
 *
 * - **Starting a flow clears the previous error.** Canon's comment on
 *   `applyLoadingStarted` is exactly that. Two fields move together, so one
 *   Shifter owns both.
 * - **Signing out drops the whole session footprint at once.** Canon's
 *   `applySignedOut` clears the user *and* the endeavor pool as one invariant,
 *   with a comment explaining that leaving the pool behind lets reconciliation
 *   re-schedule the previous account's task titles after the next sign-in. The
 *   pool lives in other slices here, so the equivalent invariant is: session,
 *   dialog, form, nonce and both sync states all reset together, and the
 *   sign-out intents are raised in the same move.
 * - **Resolving the dialog never leaves a half-state.** `resolving` carries the
 *   pending user forward so a failure can put the dialog back rather than
 *   stranding a signed-in account with no rows and no prompt.
 */
import type { User } from '@kro/core'
import type { AuthException } from './AuthException'
import type { EndeavorSyncException } from './EndeavorSyncException'
import {
  type AuthFlow,
  AuthMode,
  type AuthState,
  type EndeavorSyncState,
  type SettingsSyncState,
  initialAuthState,
} from './AuthState'
import type { LocalDataChoice } from './LocalDataDialog'
import type { SignOutIntent } from './SignOutIntents'

/** Canon's `applyLoadingStarted`: spin, and clear any prior error. */
export const withAuthFlowStarted = (
  state: AuthState,
  flow: AuthFlow,
): AuthState => ({
  ...state,
  session: { kind: 'authenticating', flow },
})

/** Canon's `applyAuthFailed`: stop the spinner, surface the exception. */
export const withAuthFailed = (
  state: AuthState,
  exception: AuthException,
): AuthState => ({
  ...state,
  session: { kind: 'failed', exception },
  appleRawNonce: null,
})

/**
 * A completed sign-in.
 *
 * The form is emptied in the same move: a password that stays in state after
 * the session exists is a credential with no remaining purpose, and the
 * cheapest way not to leak one is not to hold it (`SEC-1`).
 */
export const withSignedIn = (state: AuthState, user: User): AuthState => ({
  ...state,
  session: { kind: 'signedIn', user },
  form: { email: '', password: '', name: '' },
  appleRawNonce: null,
})

/** The restore answered "nobody". Distinct from a failed sign-in. */
export const withSignedOutResolved = (state: AuthState): AuthState => ({
  ...state,
  session: { kind: 'signedOut' },
})

/**
 * Canon's `applySignedOut`, widened to this slice's footprint.
 *
 * Everything the departing account touched resets to its initial value, and the
 * platform intents (#34) are raised in the same transition so a caller cannot
 * sign out and forget to withdraw the alerts.
 */
export const withSignedOut = (
  state: AuthState,
  intents: readonly SignOutIntent[],
): AuthState => ({
  ...initialAuthState,
  session: { kind: 'signedOut' },
  // The mode the user last chose is a UI preference, not account data — keeping
  // it means signing back in lands on the same tab they were using.
  mode: state.mode,
  settingsSync: { kind: 'signedOut' },
  pendingSignOutIntents: [...intents],
})

/** A surface performed the intents and says so. */
export const withSignOutIntentsAcknowledged = (
  state: AuthState,
): AuthState => ({
  ...state,
  pendingSignOutIntents: [],
})

/** Canon's `userDidTapToggleMode`: flip, and clear the error. */
export const withModeToggled = (state: AuthState): AuthState => ({
  ...state,
  mode: state.mode === AuthMode.signIn ? AuthMode.signUp : AuthMode.signIn,
  session:
    state.session.kind === 'failed' ? { kind: 'signedOut' } : state.session,
})

/** One form field. A single primitive would not do — the object is replaced. */
export const withFormField = (
  state: AuthState,
  field: keyof AuthState['form'],
  value: string,
): AuthState => ({ ...state, form: { ...state.form, [field]: value } })

/** The user dismissed the error banner. */
export const withExceptionCleared = (state: AuthState): AuthState => ({
  ...state,
  session:
    state.session.kind === 'failed' ? { kind: 'signedOut' } : state.session,
})

/** An Apple attempt's raw nonce, held only until that attempt resolves. */
export const withAppleChallengeMinted = (
  state: AuthState,
  rawNonce: string,
): AuthState => ({ ...state, appleRawNonce: rawNonce })

/** Sign-in found local data: prompt, and hold the account until it is answered. */
export const withLocalDataDialogShown = (
  state: AuthState,
  params: { readonly pendingUser: User; readonly anonymousCount: number },
): AuthState => ({
  ...state,
  session: { kind: 'signedIn', user: params.pendingUser },
  form: { email: '', password: '', name: '' },
  appleRawNonce: null,
  localData: {
    kind: 'shown',
    pendingUser: params.pendingUser,
    anonymousCount: params.anonymousCount,
  },
})

/** The choice is being applied. Keeps the user so a failure can re-prompt. */
export const withLocalDataChoiceStarted = (
  state: AuthState,
  choice: LocalDataChoice,
): AuthState => {
  if (state.localData.kind !== 'shown') return state
  return {
    ...state,
    localData: {
      kind: 'resolving',
      pendingUser: state.localData.pendingUser,
      choice,
    },
  }
}

/** The choice landed. */
export const withLocalDataDialogDismissed = (state: AuthState): AuthState => ({
  ...state,
  localData: { kind: 'hidden' },
})

/** The choice failed — put the prompt back rather than stranding the account. */
export const withLocalDataChoiceFailed = (
  state: AuthState,
  anonymousCount: number,
): AuthState => {
  if (state.localData.kind !== 'resolving') return state
  return {
    ...state,
    localData: {
      kind: 'shown',
      pendingUser: state.localData.pendingUser,
      anonymousCount,
    },
  }
}

/** The Settings hub's footer. */
export const withSettingsSyncState = (
  state: AuthState,
  settingsSync: SettingsSyncState,
): AuthState => ({ ...state, settingsSync })

/** The endeavor sweep's outcome. */
export const withEndeavorSyncState = (
  state: AuthState,
  endeavorSync: EndeavorSyncState,
): AuthState => ({ ...state, endeavorSync })

/** A sweep failed. Kept beside its sibling so the pair reads as one rule. */
export const withEndeavorSyncFailed = (
  state: AuthState,
  exception: EndeavorSyncException,
): AuthState => withEndeavorSyncState(state, { kind: 'failed', exception })

/**
 * The tail every provider flow shares: a completed sign-in either settles the
 * session or opens the existing-local-data dialog.
 *
 * One Shifter rather than the branch repeated in four `.fulfilled` arms,
 * because the branch **is** acceptance criterion 2 — *"the dialog appears
 * exactly when local data exists at sign-in"* — and one copy of it is one thing
 * to get right.
 */
export const withSignInOutcome = (
  state: AuthState,
  outcome:
    | {
        readonly ok: true
        readonly value: {
          readonly user: User
          readonly localDataPrompt: number | null
        }
      }
    | { readonly ok: false; readonly error: AuthException },
): AuthState => {
  if (!outcome.ok) return withAuthFailed(state, outcome.error)
  const { user, localDataPrompt } = outcome.value
  return localDataPrompt === null
    ? withSignedIn(state, user)
    : withLocalDataDialogShown(state, {
        pendingUser: user,
        anonymousCount: localDataPrompt,
      })
}
