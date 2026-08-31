/**
 * The platform tier's Shifters (`RC-4`, `RC-19`).
 *
 * Every one returns a brand-new plain object and reads nothing outside its
 * arguments — no clock, no service, no `navigator` (`UZF-10`). That matters
 * more here than in most features: this is the tier that *owns* the platform
 * surfaces, so a Shifter reaching for one directly would be the easiest
 * possible way to make state untestable.
 */
import type {
  PlatformState,
  PlatformStatus,
} from './PlatformFeature'
import type { PlatformException } from './PlatformException'
import type {
  InstallAvailability,
  NotificationPermissionState,
} from './PlatformVocabulary'

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/** Starts the status probe, clearing any prior failure so a retry reads clean. */
export const withStatusProbeStarted = (state: PlatformState): PlatformState => ({
  ...state,
  load: { kind: 'loading' },
})

/** Installs one probe's worth of platform truth in a single move. */
export const withStatusInstalled = (
  state: PlatformState,
  status: PlatformStatus,
): PlatformState => ({
  ...state,
  load: { kind: 'loaded' },
  notificationPermission: status.notificationPermission,
  installAvailability: status.installAvailability,
  pendingOverdueAlertIds: status.pendingOverdueAlertIds,
  capabilities: status.capabilities,
})

/**
 * The single failure landing (`RC-26`) — every operation's `err` arm and the
 * defensive `.rejected` arm both come here, so there is one shape to render.
 */
export const withException = (
  state: PlatformState,
  exception: PlatformException,
): PlatformState => ({
  ...state,
  load: { kind: 'failed', exception },
})

// ---------------------------------------------------------------------------
// Platform truth
// ---------------------------------------------------------------------------

export const withNotificationPermission = (
  state: PlatformState,
  permission: NotificationPermissionState,
): PlatformState => ({ ...state, notificationPermission: permission })

export const withInstallAvailability = (
  state: PlatformState,
  availability: InstallAvailability,
): PlatformState => ({ ...state, installAvailability: availability })

/**
 * Records the outcome of a reconciliation pass — the armed identifiers plus,
 * optionally, the permission and gate the pass observed.
 *
 * The two extras travel with the identifiers rather than in separate Shifters
 * because they are one fact: *this* is the set that is armed, and *this* is why
 * it is that set. Splitting them would let a reducer arm install the set
 * without the reason, which is precisely the "loaded and failed at once" class
 * of invalid state `UZF-9` rules out.
 */
export const withPendingAlerts = (
  state: PlatformState,
  pendingOverdueAlertIds: readonly string[],
  observed: {
    readonly permission?: NotificationPermissionState
    readonly isGateEnabled: boolean
  },
): PlatformState => ({
  ...state,
  pendingOverdueAlertIds,
  isOverdueAlertGateEnabled: observed.isGateEnabled,
  notificationPermission: observed.permission ?? state.notificationPermission,
})

export const withScreenAwakeRequested = (
  state: PlatformState,
  isRequested: boolean,
): PlatformState => ({ ...state, isScreenAwakeRequested: isRequested })
