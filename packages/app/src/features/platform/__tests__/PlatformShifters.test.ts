/**
 * The platform Shifters — pure, no store, no service, no clock (`RC-56`).
 */
import { describe, expect, it } from 'vitest'
import { PlatformExceptions } from '../PlatformException'
import { PlatformMocks } from '../PlatformMocks'
import {
  withException,
  withInstallAvailability,
  withNotificationPermission,
  withPendingAlerts,
  withScreenAwakeRequested,
  withStatusInstalled,
  withStatusProbeStarted,
} from '../PlatformShifters'

const probed = {
  notificationPermission: 'granted',
  installAvailability: 'available',
  pendingOverdueAlertIds: ['overdue-1'],
  capabilities: { notifications: true, wakeLock: true, vibration: false },
} as const

describe('withStatusProbeStarted', () => {
  it('moves a cold mount into loading', () => {
    expect(withStatusProbeStarted(PlatformMocks.idle).load).toEqual({
      kind: 'loading',
    })
  })

  it('clears a previous failure so a retry reads clean', () => {
    expect(withStatusProbeStarted(PlatformMocks.errored).load).toEqual({
      kind: 'loading',
    })
  })

  it('leaves every other field untouched — it only moves the lifecycle', () => {
    const next = withStatusProbeStarted(PlatformMocks.armed)
    expect(next.pendingOverdueAlertIds).toEqual(
      PlatformMocks.armed.pendingOverdueAlertIds,
    )
    expect(next.notificationPermission).toBe('granted')
  })
})

describe('withStatusInstalled', () => {
  it("installs one probe's worth of truth in a single move", () => {
    const next = withStatusInstalled(PlatformMocks.loading, probed)
    expect(next.load).toEqual({ kind: 'loaded' })
    expect(next.notificationPermission).toBe('granted')
    expect(next.installAvailability).toBe('available')
    expect(next.capabilities.vibration).toBe(false)
  })

  it('replaces a stale pending set rather than merging into it', () => {
    const next = withStatusInstalled(PlatformMocks.armed, {
      ...probed,
      pendingOverdueAlertIds: [],
    })
    expect(next.pendingOverdueAlertIds).toEqual([])
  })

  it('does not invent a gate answer — only reconciliation knows that', () => {
    const next = withStatusInstalled(PlatformMocks.armed, probed)
    expect(next.isOverdueAlertGateEnabled).toBe(true)
  })

  it('returns a new object rather than mutating its input', () => {
    const next = withStatusInstalled(PlatformMocks.idle, probed)
    expect(next).not.toBe(PlatformMocks.idle)
    expect(PlatformMocks.idle.load).toEqual({ kind: 'idle' })
  })
})

describe('withException', () => {
  it('lands a probe failure in the one failed shape', () => {
    const exception = PlatformExceptions.statusProbeFailed('SecurityError')
    expect(withException(PlatformMocks.loading, exception).load).toEqual({
      kind: 'failed',
      exception,
    })
  })

  it('keeps the last known platform truth visible under the failure', () => {
    const next = withException(
      PlatformMocks.armed,
      PlatformExceptions.reconciliationFailed('QuotaExceeded'),
    )
    expect(next.pendingOverdueAlertIds).toEqual(
      PlatformMocks.armed.pendingOverdueAlertIds,
    )
  })

  it('replaces an earlier failure rather than stacking two', () => {
    const latest = PlatformExceptions.installPromptFailed('AbortError')
    expect(withException(PlatformMocks.errored, latest).load).toEqual({
      kind: 'failed',
      exception: latest,
    })
  })
})

describe('withNotificationPermission', () => {
  it('records a grant after the user accepts the prompt', () => {
    expect(
      withNotificationPermission(PlatformMocks.notAsked, 'granted')
        .notificationPermission,
    ).toBe('granted')
  })

  it('records a refusal, which is a state and not a failure', () => {
    const next = withNotificationPermission(PlatformMocks.notAsked, 'denied')
    expect(next.notificationPermission).toBe('denied')
    expect(next.load.kind).toBe('loaded')
  })

  it('is a value-level no-op when the answer has not changed', () => {
    const next = withNotificationPermission(PlatformMocks.blocked, 'denied')
    expect(next).toEqual(PlatformMocks.blocked)
  })
})

describe('withInstallAvailability', () => {
  it('records that a prompt is now capturable', () => {
    expect(
      withInstallAvailability(PlatformMocks.idle, 'available')
        .installAvailability,
    ).toBe('available')
  })

  it('records an install, which retires the affordance', () => {
    expect(
      withInstallAvailability(PlatformMocks.notAsked, 'installed')
        .installAvailability,
    ).toBe('installed')
  })

  it('records a browser that will never offer one', () => {
    expect(
      withInstallAvailability(PlatformMocks.notAsked, 'unavailable')
        .installAvailability,
    ).toBe('unavailable')
  })
})

describe('withPendingAlerts', () => {
  it('installs the armed set and the gate that produced it together', () => {
    const next = withPendingAlerts(PlatformMocks.gateOff, ['overdue-1'], {
      permission: 'granted',
      isGateEnabled: true,
    })
    expect(next.pendingOverdueAlertIds).toEqual(['overdue-1'])
    expect(next.isOverdueAlertGateEnabled).toBe(true)
    expect(next.notificationPermission).toBe('granted')
  })

  it('empties the set when the gate went off, and says the gate went off', () => {
    const next = withPendingAlerts(PlatformMocks.armed, [], {
      isGateEnabled: false,
    })
    expect(next.pendingOverdueAlertIds).toEqual([])
    expect(next.isOverdueAlertGateEnabled).toBe(false)
  })

  it('keeps the known permission when the pass did not observe one', () => {
    const next = withPendingAlerts(PlatformMocks.armed, [], {
      isGateEnabled: false,
    })
    expect(next.notificationPermission).toBe('granted')
  })
})

describe('withScreenAwakeRequested', () => {
  it('records the hold a running session asks for', () => {
    expect(
      withScreenAwakeRequested(PlatformMocks.armed, true)
        .isScreenAwakeRequested,
    ).toBe(true)
  })

  it('records the release on pause or conclusion', () => {
    expect(
      withScreenAwakeRequested(PlatformMocks.screenAwake, false)
        .isScreenAwakeRequested,
    ).toBe(false)
  })

  it('is a value-level no-op when the hold has not changed', () => {
    expect(withScreenAwakeRequested(PlatformMocks.screenAwake, true)).toEqual(
      PlatformMocks.screenAwake,
    )
  })
})
