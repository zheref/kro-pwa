/**
 * The platform tier's Producers (`RC-3`, `RC-6`, `RC-7`, `RC-25`) — the only
 * route from anywhere in the app to the five PWA services.
 *
 * Ported from four canon effect sites:
 *
 * | canon | here |
 * |---|---|
 * | `MainProducer.produceReconcileOverdueNotificationsEffect` | `reconcileOverdueAlertsThunk` |
 * | `MainProducer.produceClearOverdueNotificationsEffect` (sign-out) | `withdrawPendingAlertsThunk` |
 * | `SessionSetupProducer.producePlay{Session,Break}CompleteAudioEffect` + `DoProducer.produceMarkCompleteEffect` | `playSessionSoundThunk` |
 * | `SessionSetupProducer.produceSetScreenAwakeEffect` | `setScreenAwakeThunk` |
 *
 * plus the two the web adds: an install prompt and a status probe.
 *
 * ## Where the preference reads live
 *
 * Canon reads its gating preferences *at the effect site*
 * (`settingsProvider.bool(.sessionSoundOnEnd)`, `state.soundOnEnd ? … : .none`),
 * not from a mirror in `State`. The same choice is made here, for the same
 * reason: a session's sound preference can be changed in another tab between
 * the dispatch and the effect, and a stale copy would silence a cue the user
 * just re-enabled. Every read is one synchronous `Provider`-tier call
 * (`RC-47`) against the injected key-value store, so the thunk stays
 * deterministic under `stubbedThunkExtra`.
 *
 * ## Entry point for `#31` (auth & cloud sync)
 *
 * `withdrawPendingAlertsThunk` **is** the withdraw-pending-alerts intent's
 * consumer. Sign-out dispatches it; it needs no argument and no knowledge of
 * this tier. Canon's reasoning for why it must exist at all is worth keeping in
 * view: *"an overdue alert shows the task's own wording on the lock screen,
 * where anyone holding the device can read it"* (SEC-8 / CWE-668).
 */
import { PLATFORM_OVERDUE_ALERT_ID_PREFIX } from './PlatformVocabulary'
import {
  type Result,
  err,
  isGateAvailable,
  makeFeatureFlagOverrideStore,
  makeHardcodedFeatureFlagService,
  makePreferences,
  ok,
  overdueNotificationsGate,
  overridesAsAssignments,
  preferenceBool,
  sessionKeepScreenAwakeOption,
  sessionSoundOnEndOption,
} from '@kro/core'
import type { Endeavor } from '@kro/core'
import { createAsyncThunk } from '@reduxjs/toolkit'
import type { ThunkExtra } from '../../library/store'
import { type PlatformException, PlatformExceptions } from './PlatformException'
import type { PlatformStatus } from './PlatformFeature'
import type {
  InstallOutcome,
  NotificationPermissionState,
  OverdueAlertReconciliationReport,
  SessionSoundRole,
} from './PlatformVocabulary'

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

/**
 * Resolves `overdueNotificationsGate` — the `notifications` flag AND
 * `general.overdueAlerts` AND `do.notifyOnOverdue` — from the injected store.
 *
 * The three-way AND is `@kro/core`'s (`FeatureFlagGating.ts`), not re-spelled
 * here: canon writes it inline at the call site, and the port made it a named
 * gate precisely so a second site could not quietly check two of the three.
 */
const resolveOverdueAlertGate = (extra: ThunkExtra): boolean => {
  const store = extra.localStore.preferences
  const flags = makeHardcodedFeatureFlagService({
    overrides: overridesAsAssignments(
      makeFeatureFlagOverrideStore(store).all(),
    ),
  })
  return isGateAvailable(
    overdueNotificationsGate,
    flags,
    makePreferences(store),
  )
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

/**
 * Reads everything this device can tell us in one pass — permission, install
 * availability, what is armed, and which APIs exist at all.
 *
 * Dispatched on mount by whichever surface first needs any of it, and again
 * after anything that could have changed it out of band (a returning tab, a
 * granted permission, an `appinstalled` event).
 */
export const refreshPlatformStatusThunk = createAsyncThunk<
  Result<PlatformStatus, PlatformException>,
  void,
  { extra: ThunkExtra }
>('platform/onPlatformStatusProbeCompleted', async (_arg, { extra }) => {
  try {
    const notificationPermission = extra.notificationsService.permissionState()
    const armed = await extra.notificationsService.pendingIdentifiers()
    // pendingIdentifiers() returns EVERY armed notification; the slice's
    // overdue count must only see canon's prefixed overdue-alert ids.
    const pendingOverdueAlertIds = armed.filter((identifier) =>
      identifier.startsWith(PLATFORM_OVERDUE_ALERT_ID_PREFIX),
    )

    return ok({
      notificationPermission,
      installAvailability: extra.installService.availability(),
      pendingOverdueAlertIds,
      capabilities: {
        notifications: notificationPermission !== 'unsupported',
        wakeLock: extra.wakeLockService.isSupported(),
        vibration: extra.vibrationService.isSupported(),
      },
    })
  } catch (error) {
    return err(PlatformExceptions.statusProbeFailed(messageOf(error)))
  }
})

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

/**
 * Raises the browser's permission prompt.
 *
 * A **refusal is not a failure**: it resolves `ok('denied')`, because canon
 * flow 5 makes a denial a silent state rather than an error. The `err` arm is
 * reserved for the prompt itself throwing.
 */
export const requestNotificationPermissionThunk = createAsyncThunk<
  Result<NotificationPermissionState, PlatformException>,
  void,
  { extra: ThunkExtra }
>(
  'platform/onNotificationPermissionRequestCompleted',
  async (_arg, { extra }) => {
    try {
      return ok(await extra.notificationsService.requestPermission())
    } catch (error) {
      return err(PlatformExceptions.permissionRequestFailed(messageOf(error)))
    }
  },
)

/**
 * **Reconciliation** — dispatch this on every item-set change, from any screen,
 * for any reason (add / complete / delete / reschedule / re-fetch / sign-in).
 *
 * Canon attaches it to `onChange(of: \.endeavors)` so that *one* site covers
 * every mutation path. There is no cross-slice equivalent of that hook here
 * (`RC-20` forbids one slice observing another's shape), so the contract is
 * instead: whoever installs a new item set dispatches this with it. That is
 * strictly narrower than canon's automatic hook and is named as a divergence in
 * the PR — the *engine* is identical, only the trigger is explicit.
 *
 * With the gate off this schedules **nothing** and withdraws everything, which
 * is the flag-gated-off acceptance criterion: at `statusQuo` the `notifications`
 * flag is disabled, so a spy on `schedule` records zero calls.
 */
export const reconcileOverdueAlertsThunk = createAsyncThunk<
  Result<OverdueAlertReconciliationReport, PlatformException>,
  { readonly endeavors: readonly Endeavor[] },
  { extra: ThunkExtra }
>('platform/onOverdueAlertsReconciled', async ({ endeavors }, { extra }) => {
  try {
    return ok(
      await extra.notificationsService.reconcileOverdueAlerts({
        endeavors,
        isGateEnabled: resolveOverdueAlertGate(extra),
      }),
    )
  } catch (error) {
    return err(PlatformExceptions.reconciliationFailed(messageOf(error)))
  }
})

/**
 * Withdraws every pending overdue alert — the sign-out path (`#31`'s intent).
 *
 * Unconditional by design: it does not consult the gate, the permission or the
 * item set, because the point is that the departing account's alerts must not
 * survive regardless of why they were scheduled.
 */
export const withdrawPendingAlertsThunk = createAsyncThunk<
  Result<readonly string[], PlatformException>,
  void,
  { extra: ThunkExtra }
>('platform/onPendingAlertsWithdrawn', async (_arg, { extra }) => {
  try {
    return ok(await extra.notificationsService.withdrawAllOverdueAlerts())
  } catch (error) {
    return err(PlatformExceptions.withdrawalFailed(messageOf(error)))
  }
})

// ---------------------------------------------------------------------------
// Sound & haptic
// ---------------------------------------------------------------------------

/**
 * Plays one of the four session sound roles, silenced by `session.soundOnEnd`.
 *
 * Canon gates every one of its three call sites on the same preference
 * (`state.soundOnEnd ? producePlay…AudioEffect() : .none`), so the check lives
 * here once rather than at each future caller — a caller that forgets it is the
 * failure mode this consolidates away. `ok(false)` means "silenced", `ok(true)`
 * means "played"; neither is an error.
 */
export const playSessionSoundThunk = createAsyncThunk<
  Result<boolean, PlatformException>,
  { readonly role: SessionSoundRole },
  { extra: ThunkExtra }
>('platform/onSessionSoundPlaybackCompleted', async ({ role }, { extra }) => {
  try {
    const preferences = makePreferences(extra.localStore.preferences)
    if (!preferenceBool(preferences, sessionSoundOnEndOption)) return ok(false)
    await extra.audioFeedbackService.play(role)
    return ok(true)
  } catch (error) {
    return err(PlatformExceptions.unknown(messageOf(error)))
  }
})

/**
 * The timeline hold's confirmation buzz — canon's single haptic site
 * (`TimelineDayView.handleSlotPressed` / `enterEditMode`).
 *
 * `ok(false)` on a platform with no vibrator (desktop, iOS Safari), which is
 * the majority case and not a failure — canon's own site is wrapped in
 * `#if os(iOS)`.
 */
export const vibrateForTimelineHoldThunk = createAsyncThunk<
  Result<boolean, PlatformException>,
  void,
  { extra: ThunkExtra }
>('platform/onTimelineHoldHapticCompleted', async (_arg, { extra }) => {
  try {
    return ok(extra.vibrationService.vibrateForTimelineHold())
  } catch (error) {
    return err(PlatformExceptions.unknown(messageOf(error)))
  }
})

// ---------------------------------------------------------------------------
// Screen wake & install
// ---------------------------------------------------------------------------

/**
 * Holds or releases the screen wake lock, honouring `session.keepScreenAwake`.
 *
 * Canon's arms map straight onto the boolean: `true` when a session enters
 * `running`/`break` or the sheet reopens onto a live one, `false` on pause /
 * conclude / abort / dismiss. Re-acquisition after a tab switch is the
 * Service's own state machine and needs no dispatch.
 *
 * With the preference off, `enabled: true` is a no-op resolving `ok(false)` —
 * canon's `state.keepScreenAwake ? produceSetScreenAwakeEffect(true) : .none`.
 * A release is **never** suppressed by the preference: a lock taken while the
 * preference was on must still come off after it is switched off.
 */
export const setScreenAwakeThunk = createAsyncThunk<
  Result<boolean, PlatformException>,
  { readonly enabled: boolean },
  { extra: ThunkExtra }
>('platform/onScreenAwakeChangeCompleted', async ({ enabled }, { extra }) => {
  try {
    const preferences = makePreferences(extra.localStore.preferences)
    if (enabled && !preferenceBool(preferences, sessionKeepScreenAwakeOption)) {
      return ok(false)
    }
    await extra.wakeLockService.setKeepAwake(enabled)
    return ok(enabled)
  } catch (error) {
    return err(PlatformExceptions.unknown(messageOf(error)))
  }
})

/** Raises the captured install prompt. `ok('unavailable')` when there is none. */
export const promptInstallThunk = createAsyncThunk<
  Result<InstallOutcome, PlatformException>,
  void,
  { extra: ThunkExtra }
>('platform/onInstallPromptCompleted', async (_arg, { extra }) => {
  try {
    return ok(await extra.installService.prompt())
  } catch (error) {
    return err(PlatformExceptions.installPromptFailed(messageOf(error)))
  }
})
