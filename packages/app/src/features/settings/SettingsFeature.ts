/**
 * The settings slice (`RC-1`, `RC-2`, `RC-24`, `RC-36`) — canon's
 * `SettingsFeature` and `IntegrationsFeature`, merged.
 *
 * `reducers` carries synchronous, locally-originated events only: opening a
 * pane, going back, presenting and dismissing the auth surface.
 * `extraReducers` carries thunk lifecycles and nothing else (`RC-36`), and
 * every multi-field change goes through a named Shifter applied with
 * `Object.assign` (`RC-4`).
 *
 * ## The `.rejected` arms are defensive
 *
 * Every Producer here catches and resolves `err(...)`, so `.rejected` is
 * structurally unreachable (`RC-26`). Each is still wired, into the same
 * exception Shifter the `.fulfilled` false branch uses, so an unexpected throw
 * degrades to a typed failure rather than to a spinner that never stops.
 */
import { type PayloadAction, createSlice } from '@reduxjs/toolkit'
import { SettingsExceptions } from './SettingsException'
import {
  connectGoogleThunk,
  disconnectGoogleThunk,
  loadGoogleConnectionThunk,
  loadSettingsThunk,
  updateSettingThunk,
} from './SettingsProducer'
import type { SettingsSectionId } from './SettingsSection'
import {
  withAuthDismissed,
  withAuthPresented,
  withAppearanceThemesEnabled,
  withGoogleBusy,
  withGoogleConnection,
  withGoogleEnabled,
  withGoogleFailed,
  withPaneClosed,
  withPaneOpened,
  withPreferencesFailed,
  withPreferencesLoaded,
  withPreferencesLoading,
  withSettingValue,
} from './SettingsShifters'
import { initialSettingsState } from './SettingsState'

export const settingsSlice = createSlice({
  name: 'settings',
  initialState: initialSettingsState,
  reducers: {
    /** Canon's `userDidTapSection` — push the pane. */
    userDidTapSection(state, action: PayloadAction<SettingsSectionId>) {
      Object.assign(state, withPaneOpened(state, action.payload))
    },

    /** The pane's back affordance — canon's `NavigationStack` pop. */
    userDidTapBackToHub(state) {
      Object.assign(state, withPaneClosed(state))
    },

    /**
     * Either sign-in entry point. The origin travels so dismissing returns the
     * user to what they were doing.
     */
    userDidTapSignIn(
      state,
      action: PayloadAction<{ origin: 'profilePopover' | 'settingsHub' }>,
    ) {
      Object.assign(state, withAuthPresented(state, action.payload.origin))
    },

    /** Canon's `AuthView` Cancel, and the sheet's own dismissal. */
    userDidDismissAuth(state) {
      Object.assign(state, withAuthDismissed(state))
    },

    /**
     * The auth feature says a session now exists.
     *
     * Dispatched by the Page that owns both surfaces (`RC-37`) rather than
     * matched off `auth`'s thunk here — a slice that reacted to another
     * feature's lifecycle would be reaching into it (`RC-20`).
     */
    childAuthDelegatedSignedIn(state) {
      Object.assign(state, withAuthDismissed(state))
    },
  },

  extraReducers: (builder) => {
    builder
      // --- the preference snapshot -----------------------------------------
      .addCase(loadSettingsThunk.pending, (state) => {
        Object.assign(state, withPreferencesLoading(state))
      })
      .addCase(loadSettingsThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (!result.ok) {
          Object.assign(state, withPreferencesFailed(state, result.error))
          return
        }
        Object.assign(state, withPreferencesLoaded(state, result.value.values))
        Object.assign(
          state,
          withGoogleEnabled(state, result.value.isGoogleEnabled),
        )
        Object.assign(
          state,
          withAppearanceThemesEnabled(
            state,
            result.value.isAppearanceThemesEnabled,
          ),
        )
      })
      .addCase(loadSettingsThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withPreferencesFailed(
            state,
            SettingsExceptions.preferencesUnavailable(
              action.error.message ?? '',
            ),
          ),
        )
      })

      // --- one preference write ---------------------------------------------
      .addCase(updateSettingThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (!result.ok) {
          // The previous value stays on screen: showing a value the store
          // refused would be the one outcome worse than the refusal.
          Object.assign(state, withPreferencesFailed(state, result.error))
          return
        }
        Object.assign(
          state,
          withSettingValue(state, result.value.key, result.value.value),
        )
        // A successful write clears a previous failure banner — the surface is
        // working again, and a stale banner would say otherwise.
        if (state.load.kind === 'failed') {
          Object.assign(state, withPreferencesLoaded(state, state.values))
        }
      })
      .addCase(updateSettingThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withPreferencesFailed(
            state,
            SettingsExceptions.preferenceRejected(action.error.message ?? ''),
          ),
        )
      })

      // --- the Google connection --------------------------------------------
      .addCase(loadGoogleConnectionThunk.pending, (state) => {
        Object.assign(state, withGoogleBusy(state))
      })
      .addCase(loadGoogleConnectionThunk.fulfilled, (state, action) => {
        const result = action.payload
        Object.assign(
          state,
          result.ok
            ? withGoogleConnection(state, result.value)
            : withGoogleFailed(state, result.error),
        )
      })
      .addCase(loadGoogleConnectionThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withGoogleFailed(
            state,
            SettingsExceptions.integrationUnavailable(
              action.error.message ?? '',
            ),
          ),
        )
      })

      .addCase(connectGoogleThunk.pending, (state) => {
        Object.assign(state, withGoogleBusy(state))
      })
      .addCase(connectGoogleThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          // The browser is on its way to Google. The row stays busy: the
          // connection's real answer arrives on the way back, through
          // `loadGoogleConnectionThunk`.
          return
        }
        Object.assign(state, withGoogleFailed(state, result.error))
      })
      .addCase(connectGoogleThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withGoogleFailed(
            state,
            SettingsExceptions.integrationUnavailable(
              action.error.message ?? '',
            ),
          ),
        )
      })

      .addCase(disconnectGoogleThunk.pending, (state) => {
        Object.assign(state, withGoogleBusy(state))
      })
      .addCase(disconnectGoogleThunk.fulfilled, (state, action) => {
        const result = action.payload
        Object.assign(
          state,
          result.ok
            ? withGoogleConnection(state, result.value)
            : withGoogleFailed(state, result.error),
        )
      })
      .addCase(disconnectGoogleThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withGoogleFailed(
            state,
            SettingsExceptions.integrationUnavailable(
              action.error.message ?? '',
            ),
          ),
        )
      })
  },
})

export const {
  childAuthDelegatedSignedIn,
  userDidDismissAuth,
  userDidTapBackToHub,
  userDidTapSection,
  userDidTapSignIn,
} = settingsSlice.actions
