/**
 * The platform slice (`RC-1`, `RC-2`, `RC-24`, `RC-36`) — the state half of
 * `#34`'s PWA tier.
 *
 * ## Why a slice exists here at all
 *
 * The issue asks for one *only if* events or state are genuinely needed, and
 * the honest answer is "a little of both, and no more":
 *
 * - **A Producer is the only sanctioned way to reach a Service** (`RC-3`,
 *   `RC-6`), and `createAsyncThunk` may only appear in a `…Producer.ts`
 *   (enforced by `check-uzf-boundaries.mjs`). Sign-out (`#31`) needs a
 *   *dispatchable* withdraw-pending-alerts entry point; the session UI (`#22`)
 *   needs dispatchable sound and wake-lock points. Those are thunks, and a
 *   thunk belongs to a feature.
 * - **Two of the five services answer questions a surface must render**: the
 *   notification permission (Settings has to distinguish *not asked* from
 *   *refused*) and install availability (an install button that does nothing is
 *   the classic PWA bug). Those answers change asynchronously and out of band,
 *   so they are state, not a prop.
 *
 * Everything else stays out. There is no `soundOnEnd` mirror here (the
 * preference is read fresh in the Producer, exactly as canon reads
 * `settingsProvider.bool` at the effect site), no "is a sound playing" flag,
 * and no wake-lock sentinel — the Service owns that, and duplicating it in
 * `State` would create two answers to one question.
 *
 * ## No sync `reducers`
 *
 * Every transition here is the completion of a platform probe or a platform
 * action, so every arm is an `extraReducers` case over a thunk's lifecycle
 * (`RC-36`, `UZF-3`). There is no user intent this feature receives directly —
 * the surfaces that do (a Settings toggle, an install button) belong to the UI
 * children and dispatch these thunks. Adding an empty `userDid…` case now
 * would be speculative state, which is the thing `RC-24` exists to prevent.
 */
import { createSlice } from '@reduxjs/toolkit'
import { type PlatformException, PlatformExceptions } from './PlatformException'
import {
  playSessionSoundThunk,
  promptInstallThunk,
  reconcileOverdueAlertsThunk,
  refreshPlatformStatusThunk,
  requestNotificationPermissionThunk,
  setScreenAwakeThunk,
  vibrateForTimelineHoldThunk,
  withdrawPendingAlertsThunk,
} from './PlatformProducer'
import type {
  InstallAvailability,
  NotificationPermissionState,
} from './PlatformVocabulary'
import {
  withException,
  withInstallAvailability,
  withNotificationPermission,
  withPendingAlerts,
  withScreenAwakeRequested,
  withStatusInstalled,
  withStatusProbeStarted,
} from './PlatformShifters'

/**
 * The one lifecycle field (`RC-24`, `UZF-9`). `loading`/`loaded` describe the
 * status probe; `failed` is shared by every operation that can report one, via
 * the single `withException` Shifter.
 */
export type PlatformLoadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'loaded' }
  | { readonly kind: 'failed'; readonly exception: PlatformException }

/** What the platform can do on this device, probed once and re-read on demand. */
export interface PlatformCapabilities {
  readonly notifications: boolean
  readonly wakeLock: boolean
  readonly vibration: boolean
}

/** One probe's worth of platform truth — what `refreshPlatformStatusThunk` reads. */
export interface PlatformStatus {
  readonly notificationPermission: NotificationPermissionState
  readonly installAvailability: InstallAvailability
  readonly pendingOverdueAlertIds: readonly string[]
  readonly capabilities: PlatformCapabilities
}

export interface PlatformState {
  /** Whether notifications may be shown — *not asked*, *granted*, *refused*. */
  readonly notificationPermission: NotificationPermissionState
  /** Whether an install prompt can be raised right now. */
  readonly installAvailability: InstallAvailability
  /**
   * The overdue alerts armed after the last reconciliation. Empty on a cold
   * load by design — the web has no OS-persisted queue (see
   * `NotificationsService`'s header).
   */
  readonly pendingOverdueAlertIds: readonly string[]
  /**
   * Whether the `notifications` flag AND both overdue preferences were on the
   * last time reconciliation ran. Recorded rather than recomputed so a debug
   * surface can show *why* nothing is scheduled without re-reading the gate.
   */
  readonly isOverdueAlertGateEnabled: boolean
  /** Whether a caller has asked for the screen to stay awake. */
  readonly isScreenAwakeRequested: boolean
  readonly capabilities: PlatformCapabilities
  readonly load: PlatformLoadState
}

export const initialPlatformState: PlatformState = {
  notificationPermission: 'unsupported',
  installAvailability: 'unknown',
  pendingOverdueAlertIds: [],
  isOverdueAlertGateEnabled: false,
  isScreenAwakeRequested: false,
  capabilities: { notifications: false, wakeLock: false, vibration: false },
  load: { kind: 'idle' },
}

export const platformSlice = createSlice({
  name: 'platform',
  initialState: initialPlatformState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(refreshPlatformStatusThunk.pending, (state) => {
        Object.assign(state, withStatusProbeStarted(state))
      })
      .addCase(refreshPlatformStatusThunk.fulfilled, (state, action) => {
        const result = action.payload
        Object.assign(
          state,
          result.ok
            ? withStatusInstalled(state, result.value)
            : withException(state, result.error),
        )
      })
      .addCase(refreshPlatformStatusThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withException(
            state,
            PlatformExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      .addCase(requestNotificationPermissionThunk.fulfilled, (state, action) => {
        const result = action.payload
        Object.assign(
          state,
          result.ok
            ? withNotificationPermission(state, result.value)
            : withException(state, result.error),
        )
      })

      .addCase(reconcileOverdueAlertsThunk.fulfilled, (state, action) => {
        const result = action.payload
        Object.assign(
          state,
          result.ok
            ? withPendingAlerts(state, result.value.pending, {
                permission: result.value.permission,
                isGateEnabled: result.value.isGateEnabled,
              })
            : withException(state, result.error),
        )
      })

      .addCase(withdrawPendingAlertsThunk.fulfilled, (state, action) => {
        const result = action.payload
        Object.assign(
          state,
          result.ok
            ? withPendingAlerts(state, [], { isGateEnabled: false })
            : withException(state, result.error),
        )
      })

      .addCase(setScreenAwakeThunk.fulfilled, (state, action) => {
        const result = action.payload
        Object.assign(
          state,
          result.ok
            ? withScreenAwakeRequested(state, result.value)
            : withException(state, result.error),
        )
      })

      .addCase(promptInstallThunk.fulfilled, (state, action) => {
        const result = action.payload
        Object.assign(
          state,
          result.ok
            ? withInstallAvailability(
                state,
                result.value === 'accepted' ? 'installed' : 'unknown',
              )
            : withException(state, result.error),
        )
      })

      // Sound and haptic are fire-and-forget in canon and carry no state; the
      // arms exist only so a failure still lands somewhere visible rather than
      // disappearing (`UZF-14` — an effect's outcome is never dropped).
      .addCase(playSessionSoundThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (!result.ok) Object.assign(state, withException(state, result.error))
      })
      .addCase(vibrateForTimelineHoldThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (!result.ok) Object.assign(state, withException(state, result.error))
      })
  },
})
