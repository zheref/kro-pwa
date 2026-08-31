/**
 * The platform tier's Selectors (`RC-5`, `RC-20`).
 *
 * Every derived answer a surface needs about this device lives here rather than
 * in a `useAppSelector` callback: "should I show the install button", "should I
 * explain that notifications are blocked", "is anything actually armed". Those
 * are one-line booleans, which is exactly the kind that gets written inline and
 * then re-written slightly differently on the next screen.
 */
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../library/store'
import type { PlatformException } from './PlatformException'
import type { PlatformState } from './PlatformFeature'

const selectPlatformSlice = (state: RootState): PlatformState => state.platform

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export const selectIsPlatformLoading = createSelector(
  [selectPlatformSlice],
  (slice) => slice.load.kind === 'loading',
)

export const selectPlatformException = createSelector(
  [selectPlatformSlice],
  (slice): PlatformException | null =>
    slice.load.kind === 'failed' ? slice.load.exception : null,
)

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const selectNotificationPermission = createSelector(
  [selectPlatformSlice],
  (slice) => slice.notificationPermission,
)

/**
 * Whether it is worth *asking*. `default` is the only state a prompt can move,
 * and prompting on `denied` is a no-op the browser refuses — so a surface that
 * checks only "not granted" ends up with a button that never does anything.
 */
export const selectShouldOfferNotificationPrompt = createSelector(
  [selectPlatformSlice],
  (slice) => slice.notificationPermission === 'default',
)

/**
 * Whether the user has actively refused. Distinct from *not asked*: this is the
 * only state that warrants explaining how to undo it in browser settings.
 */
export const selectAreNotificationsBlocked = createSelector(
  [selectPlatformSlice],
  (slice) => slice.notificationPermission === 'denied',
)

export const selectPendingOverdueAlertIds = createSelector(
  [selectPlatformSlice],
  (slice) => slice.pendingOverdueAlertIds,
)

export const selectPendingOverdueAlertCount = createSelector(
  [selectPendingOverdueAlertIds],
  (ids) => ids.length,
)

/**
 * Whether overdue alerts can actually be delivered: the gate was on at the last
 * reconciliation **and** permission is granted. Both halves, because either one
 * alone is a surface that promises a notification it will not send.
 */
export const selectAreOverdueAlertsActive = createSelector(
  [selectPlatformSlice],
  (slice) =>
    slice.isOverdueAlertGateEnabled &&
    slice.notificationPermission === 'granted',
)

// ---------------------------------------------------------------------------
// Install & device capabilities
// ---------------------------------------------------------------------------

export const selectInstallAvailability = createSelector(
  [selectPlatformSlice],
  (slice) => slice.installAvailability,
)

/** Whether an install affordance should be rendered at all. */
export const selectCanOfferInstall = createSelector(
  [selectPlatformSlice],
  (slice) => slice.installAvailability === 'available',
)

export const selectIsScreenAwakeRequested = createSelector(
  [selectPlatformSlice],
  (slice) => slice.isScreenAwakeRequested,
)

export const selectPlatformCapabilities = createSelector(
  [selectPlatformSlice],
  (slice) => slice.capabilities,
)
