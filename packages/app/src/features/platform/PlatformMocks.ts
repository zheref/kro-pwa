/**
 * Canned `PlatformState` variants (`RC-31`).
 *
 * Every test and (later) every story consumes these instead of building state
 * inline, so one edit to `PlatformState` updates every scenario at once. Each
 * is derived from the slice's own `getInitialState()`, never hand-assembled.
 */
import { initialPlatformState, platformSlice } from './PlatformFeature'
import { PlatformExceptions } from './PlatformException'

const base = platformSlice.getInitialState()

/** The full-capability device: modern Chromium, permission granted. */
const capableDevice = {
  notifications: true,
  wakeLock: true,
  vibration: true,
} as const

/** The typical desktop Safari shape: notifications yes, no vibrator. */
const desktopSafariDevice = {
  notifications: true,
  wakeLock: true,
  vibration: false,
} as const

export const PlatformMocks = {
  /** Nothing probed yet — the state a cold mount starts in. */
  idle: initialPlatformState,

  /** The probe is in flight. */
  loading: { ...base, load: { kind: 'loading' } as const },

  /**
   * Probed, permission never requested. The state that should offer a prompt
   * and must **not** claim notifications are blocked.
   */
  notAsked: {
    ...base,
    load: { kind: 'loaded' } as const,
    notificationPermission: 'default' as const,
    installAvailability: 'available' as const,
    capabilities: capableDevice,
  },

  /** Granted, the gate is on, two alerts armed — the fully working case. */
  armed: {
    ...base,
    load: { kind: 'loaded' } as const,
    notificationPermission: 'granted' as const,
    installAvailability: 'installed' as const,
    isOverdueAlertGateEnabled: true,
    pendingOverdueAlertIds: [
      'overdue-endeavor-planned-task',
      'overdue-endeavor-overdue-tourist-reminder',
    ],
    capabilities: capableDevice,
  },

  /**
   * Granted **but** the gate is off — the `statusQuo` default. Nothing armed,
   * and a surface must not say alerts are on.
   */
  gateOff: {
    ...base,
    load: { kind: 'loaded' } as const,
    notificationPermission: 'granted' as const,
    isOverdueAlertGateEnabled: false,
    capabilities: capableDevice,
  },

  /** The user refused. Distinct from `notAsked` on purpose. */
  blocked: {
    ...base,
    load: { kind: 'loaded' } as const,
    notificationPermission: 'denied' as const,
    installAvailability: 'unavailable' as const,
    capabilities: desktopSafariDevice,
  },

  /** A running session holding the screen awake. */
  screenAwake: {
    ...base,
    load: { kind: 'loaded' } as const,
    notificationPermission: 'granted' as const,
    isScreenAwakeRequested: true,
    capabilities: capableDevice,
  },

  /** A failed probe. */
  errored: {
    ...base,
    load: {
      kind: 'failed',
      exception: PlatformExceptions.statusProbeFailed('SecurityError'),
    } as const,
  },
} as const
