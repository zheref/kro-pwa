/**
 * The auth slice (`RC-1`, `RC-2`, `RC-24`, `RC-36`) — canon's `AuthFeature`
 * merged with the session-owning arms of `MainFeature`.
 *
 * `reducers` carries synchronous, locally-originated events only — the form,
 * the mode toggle, the dialog's dismissal, the acknowledgement of a sign-out
 * intent. `extraReducers` carries thunk lifecycles and nothing else. The two
 * surfaces never mix (`RC-36`), and every multi-field change goes through a
 * named Shifter applied as `Object.assign` (`RC-4`).
 *
 * ## The `.rejected` arms are defensive, not the error path
 *
 * Every Producer here catches and resolves `err(...)`, so `.rejected` is
 * structurally unreachable (`RC-26`). Each one is still wired, into the *same*
 * exception Shifter the `.fulfilled` false branch uses, so an unexpected throw
 * degrades to a typed failure rather than to a stuck spinner.
 */
import { type PayloadAction, createSlice } from '@reduxjs/toolkit'
import { AuthExceptions } from './AuthException'
import {
  beginAppleSignInThunk,
  resolveLocalDataChoiceThunk,
  restoreSessionThunk,
  signInWithAppleThunk,
  signInWithEmailThunk,
  signOutThunk,
  signUpWithEmailThunk,
  startOAuthRedirectThunk,
  syncSettingsThunk,
  synchronizeEndeavorsThunk,
} from './AuthProducer'
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
  withModeToggled,
  withSettingsSyncState,
  withSignInOutcome,
  withSignOutIntentsAcknowledged,
  withSignedIn,
  withSignedOut,
  withSignedOutResolved,
} from './AuthShifters'
import { AuthFlow, initialAuthState } from './AuthState'
import { EndeavorSyncExceptions } from './EndeavorSyncException'
import { SettingsSyncTrigger } from './CloudSettings'

export const authSlice = createSlice({
  name: 'auth',
  initialState: initialAuthState,
  reducers: {
    userDidChangeEmail(state, action: PayloadAction<string>) {
      Object.assign(state, withFormField(state, 'email', action.payload))
    },

    userDidChangePassword(state, action: PayloadAction<string>) {
      Object.assign(state, withFormField(state, 'password', action.payload))
    },

    userDidChangeName(state, action: PayloadAction<string>) {
      Object.assign(state, withFormField(state, 'name', action.payload))
    },

    /** Canon's `userDidTapToggleMode` — flip, and clear the error. */
    userDidTapToggleMode(state) {
      Object.assign(state, withModeToggled(state))
    },

    /** The error banner's dismiss affordance. */
    userDidDismissException(state) {
      Object.assign(state, withExceptionCleared(state))
    },

    /**
     * Canon's `onAppleSignInFailed` — Apple's own SDK reported a failure before
     * any token existed, so there is nothing to exchange.
     */
    onAppleAuthorizationFailed(state, action: PayloadAction<string>) {
      Object.assign(
        state,
        withAuthFailed(state, AuthExceptions.providerRejected(action.payload)),
      )
    },

    /** Canon's `onGoogleSignInCancelled` — stop the spinner, show nothing. */
    onProviderSheetDismissed(state) {
      Object.assign(state, withAuthFailed(state, AuthExceptions.cancelled()))
    },

    /**
     * The dialog was torn down without an answer (a route change).
     *
     * Canon routes swipe-to-dismiss into `migrationAlertDismissed`, i.e. the
     * same arm as Cancel, so a surface reproducing canon dispatches
     * `resolveLocalDataChoiceThunk({ choice: 'cancel' })`. This event only
     * hides the prompt and touches no rows.
     */
    onLocalDataDialogDismissed(state) {
      Object.assign(state, withLocalDataDialogDismissed(state))
    },

    /** #34's service performed the withdrawal and says so. */
    childPlatformDelegatedSignOutIntentsPerformed(state) {
      Object.assign(state, withSignOutIntentsAcknowledged(state))
    },
  },

  extraReducers: (builder) => {
    builder
      // --- launch restore ---------------------------------------------------
      .addCase(restoreSessionThunk.pending, (state) => {
        // Only the first restore spins: a re-restore triggered by a token
        // refresh must not blank a signed-in header.
        if (state.session.kind === 'unknown') {
          Object.assign(state, withAuthFlowStarted(state, AuthFlow.restore))
        }
      })
      .addCase(restoreSessionThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (!result.ok) {
          Object.assign(state, withAuthFailed(state, result.error))
          return
        }
        Object.assign(
          state,
          result.value === null
            ? withSignedOutResolved(state)
            : withSignedIn(state, result.value),
        )
      })
      .addCase(restoreSessionThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withAuthFailed(
            state,
            AuthExceptions.unknown(action.error.message ?? ''),
          ),
        )
      })

      // --- email / password -------------------------------------------------
      .addCase(signInWithEmailThunk.pending, (state) => {
        Object.assign(state, withAuthFlowStarted(state, AuthFlow.emailPassword))
      })
      .addCase(signInWithEmailThunk.fulfilled, (state, action) => {
        Object.assign(state, withSignInOutcome(state, action.payload))
      })
      .addCase(signInWithEmailThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withAuthFailed(
            state,
            AuthExceptions.unknown(action.error.message ?? ''),
          ),
        )
      })

      .addCase(signUpWithEmailThunk.pending, (state) => {
        Object.assign(state, withAuthFlowStarted(state, AuthFlow.emailPassword))
      })
      .addCase(signUpWithEmailThunk.fulfilled, (state, action) => {
        Object.assign(state, withSignInOutcome(state, action.payload))
      })
      .addCase(signUpWithEmailThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withAuthFailed(
            state,
            AuthExceptions.unknown(action.error.message ?? ''),
          ),
        )
      })

      // --- Apple -------------------------------------------------------------
      .addCase(beginAppleSignInThunk.fulfilled, (state, action) => {
        const result = action.payload
        Object.assign(
          state,
          result.ok
            ? withAppleChallengeMinted(state, result.value.rawNonce)
            : withAuthFailed(state, result.error),
        )
      })
      .addCase(beginAppleSignInThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withAuthFailed(
            state,
            AuthExceptions.unknown(action.error.message ?? ''),
          ),
        )
      })

      .addCase(signInWithAppleThunk.pending, (state) => {
        Object.assign(state, withAuthFlowStarted(state, AuthFlow.apple))
      })
      .addCase(signInWithAppleThunk.fulfilled, (state, action) => {
        Object.assign(state, withSignInOutcome(state, action.payload))
      })
      .addCase(signInWithAppleThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withAuthFailed(
            state,
            AuthExceptions.unknown(action.error.message ?? ''),
          ),
        )
      })

      // --- OAuth redirect (Google, and Apple with no id token) ---------------
      .addCase(startOAuthRedirectThunk.pending, (state, action) => {
        Object.assign(
          state,
          withAuthFlowStarted(
            state,
            action.meta.arg.provider === 'apple'
              ? AuthFlow.apple
              : AuthFlow.google,
          ),
        )
      })
      .addCase(startOAuthRedirectThunk.fulfilled, (state, action) => {
        const result = action.payload
        // A started redirect leaves the spinner up: the page is on its way out,
        // and the session arrives through the launch restore on the way back.
        if (!result.ok)
          Object.assign(state, withAuthFailed(state, result.error))
      })
      .addCase(startOAuthRedirectThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withAuthFailed(
            state,
            AuthExceptions.unknown(action.error.message ?? ''),
          ),
        )
      })

      // --- the existing-local-data dialog -------------------------------------
      .addCase(resolveLocalDataChoiceThunk.pending, (state, action) => {
        Object.assign(
          state,
          withLocalDataChoiceStarted(state, action.meta.arg.choice),
        )
      })
      .addCase(resolveLocalDataChoiceThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(state, withLocalDataDialogDismissed(state))
          return
        }
        // Put the prompt back rather than stranding a signed-in account whose
        // rows were neither adopted nor cleared.
        Object.assign(state, withLocalDataChoiceFailed(state, 0))
        Object.assign(state, withAuthFailed(state, result.error))
      })
      .addCase(resolveLocalDataChoiceThunk.rejected, (state) => {
        Object.assign(state, withLocalDataChoiceFailed(state, 0))
      })

      // --- sign-out -------------------------------------------------------------
      .addCase(signOutThunk.fulfilled, (state, action) => {
        const result = action.payload
        // The wipe is what makes a sign-out a sign-out. Even when it reports a
        // failure the session is dropped: leaving the departing account in
        // state because storage misbehaved is the worse of the two outcomes.
        Object.assign(
          state,
          withSignedOut(state, result.ok ? result.value.intents : []),
        )
      })
      .addCase(signOutThunk.rejected, (state) => {
        Object.assign(state, withSignedOut(state, []))
      })

      // --- settings sync ---------------------------------------------------------
      .addCase(syncSettingsThunk.pending, (state, action) => {
        // A skipped trigger never spins — the footer must not say "syncing"
        // because the user opened Settings.
        if (action.meta.arg.trigger === SettingsSyncTrigger.settingsOpened)
          return
        Object.assign(state, withSettingsSyncState(state, { kind: 'syncing' }))
      })
      .addCase(syncSettingsThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (!result.ok) {
          // Canon maps every sync failure that is not `notSignedIn` to the
          // offline footer: the value is still saved locally and re-pushed on
          // the next dismiss.
          Object.assign(
            state,
            withSettingsSyncState(
              state,
              result.error.kind === 'notSignedIn' ||
                result.error.kind === 'unavailable'
                ? { kind: 'signedOut' }
                : { kind: 'offline' },
            ),
          )
          return
        }
        if (result.value.kind === 'skipped') return
        Object.assign(
          state,
          withSettingsSyncState(state, {
            kind: 'synced',
            at: action.meta.arg.now,
          }),
        )
      })
      .addCase(syncSettingsThunk.rejected, (state) => {
        Object.assign(state, withSettingsSyncState(state, { kind: 'offline' }))
      })

      // --- endeavor sweep ----------------------------------------------------------
      .addCase(synchronizeEndeavorsThunk.pending, (state) => {
        Object.assign(state, withEndeavorSyncState(state, { kind: 'syncing' }))
      })
      .addCase(synchronizeEndeavorsThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (!result.ok) {
          Object.assign(state, withEndeavorSyncFailed(state, result.error))
          return
        }
        const summary = result.value
        if (summary.status !== 'synchronized') {
          // `disabled` and `signedOut` are states, not failures — see
          // `EndeavorSyncException`'s header.
          Object.assign(
            state,
            withEndeavorSyncState(
              state,
              summary.status === 'disabled'
                ? { kind: 'disabled' }
                : { kind: 'idle' },
            ),
          )
          return
        }
        Object.assign(
          state,
          withEndeavorSyncState(state, {
            kind: 'completed',
            at: action.meta.arg.now,
            pushed: summary.pushed,
            deleted: summary.deleted,
            deferred: summary.deferred,
            pulled: summary.pulled,
          }),
        )
      })
      .addCase(synchronizeEndeavorsThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withEndeavorSyncFailed(
            state,
            EndeavorSyncExceptions.unknown(action.error.message ?? ''),
          ),
        )
      })
  },
})

export const {
  childPlatformDelegatedSignOutIntentsPerformed,
  onAppleAuthorizationFailed,
  onLocalDataDialogDismissed,
  onProviderSheetDismissed,
  userDidChangeEmail,
  userDidChangeName,
  userDidChangePassword,
  userDidDismissException,
  userDidTapToggleMode,
} = authSlice.actions
