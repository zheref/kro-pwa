/**
 * The platform Selectors, against a hand-built root state — never a live store
 * (`RC-55`).
 */
import { initialAuthState } from '../../auth/AuthState'
import { initialMainState } from '../../main/MainFeature'
import { describe, expect, it } from 'vitest'
import type { RootState } from '../../../library/store'
import { initialCaptureState } from '../../capture/CaptureFeature'
import { initialDoState } from '../../do/DoFeature'
import { initialEarnState } from '../../earn/EarnFeature'
import { initialEndeavorDetailState } from '../../endeavorDetail/EndeavorDetailState'
import { initialFindState } from '../../find/FindState'
import { initialGreetingState } from '../../greeting/GreetingFeature'
import { initialPlanState } from '../../plan/PlanState'
import { initialSessionState } from '../../session/SessionState'
import { initialTriageState } from '../../triage/TriageFeature'
import { initialThirstState } from '../../thirst/ThirstFeature'
import type { PlatformState } from '../PlatformFeature'
import { PlatformMocks } from '../PlatformMocks'
import {
  selectAreNotificationsBlocked,
  selectAreOverdueAlertsActive,
  selectCanOfferInstall,
  selectInstallAvailability,
  selectIsPlatformLoading,
  selectIsScreenAwakeRequested,
  selectNotificationPermission,
  selectPendingOverdueAlertCount,
  selectPendingOverdueAlertIds,
  selectPlatformCapabilities,
  selectPlatformException,
  selectShouldOfferNotificationPrompt,
} from '../PlatformSelectors'

const rootWith = (platform: PlatformState): RootState => ({
  greeting: initialGreetingState,
  // Present only because `RootState` names every registered slice; this suite
  // asserts nothing about the feature slices.
  do: initialDoState,
  capture: initialCaptureState,
  triage: initialTriageState,
  plan: initialPlanState,
  find: initialFindState,
  endeavorDetail: initialEndeavorDetailState,
  earn: initialEarnState,
  auth: initialAuthState,
  main: initialMainState,
  session: initialSessionState,
  platform,
  thirst: initialThirstState,
})

describe('selectIsPlatformLoading', () => {
  it('is true while the probe is in flight', () => {
    expect(selectIsPlatformLoading(rootWith(PlatformMocks.loading))).toBe(true)
  })

  it('is false before anything has been asked for', () => {
    expect(selectIsPlatformLoading(rootWith(PlatformMocks.idle))).toBe(false)
  })

  it('is false once the probe has landed', () => {
    expect(selectIsPlatformLoading(rootWith(PlatformMocks.armed))).toBe(false)
  })
})

describe('selectPlatformException', () => {
  it('surfaces the exception a failed probe left behind', () => {
    expect(
      selectPlatformException(rootWith(PlatformMocks.errored))?.kind,
    ).toBe('statusProbeFailed')
  })

  it('is null on a healthy device', () => {
    expect(selectPlatformException(rootWith(PlatformMocks.armed))).toBeNull()
  })

  it('is null before anything has run', () => {
    expect(selectPlatformException(rootWith(PlatformMocks.idle))).toBeNull()
  })
})

describe('selectNotificationPermission', () => {
  it('reports the grant', () => {
    expect(selectNotificationPermission(rootWith(PlatformMocks.armed))).toBe(
      'granted',
    )
  })

  it('reports a refusal', () => {
    expect(selectNotificationPermission(rootWith(PlatformMocks.blocked))).toBe(
      'denied',
    )
  })

  it('reports "unsupported" before any probe has run', () => {
    expect(selectNotificationPermission(rootWith(PlatformMocks.idle))).toBe(
      'unsupported',
    )
  })
})

describe('selectShouldOfferNotificationPrompt', () => {
  it('is true only where a prompt can actually move the answer', () => {
    expect(
      selectShouldOfferNotificationPrompt(rootWith(PlatformMocks.notAsked)),
    ).toBe(true)
  })

  it('is false once permission is granted — there is nothing to ask', () => {
    expect(
      selectShouldOfferNotificationPrompt(rootWith(PlatformMocks.armed)),
    ).toBe(false)
  })

  it('is false after a refusal, which no prompt can undo', () => {
    expect(
      selectShouldOfferNotificationPrompt(rootWith(PlatformMocks.blocked)),
    ).toBe(false)
  })
})

describe('selectAreNotificationsBlocked', () => {
  it('is true only for an active refusal', () => {
    expect(selectAreNotificationsBlocked(rootWith(PlatformMocks.blocked))).toBe(
      true,
    )
  })

  it('is false for "never asked" — the two must not be conflated', () => {
    expect(selectAreNotificationsBlocked(rootWith(PlatformMocks.notAsked))).toBe(
      false,
    )
  })

  it('is false on a browser with no Notification API at all', () => {
    expect(selectAreNotificationsBlocked(rootWith(PlatformMocks.idle))).toBe(
      false,
    )
  })
})

describe('selectPendingOverdueAlertIds', () => {
  it('lists what reconciliation armed', () => {
    expect(selectPendingOverdueAlertIds(rootWith(PlatformMocks.armed))).toEqual(
      PlatformMocks.armed.pendingOverdueAlertIds,
    )
  })

  it('is empty while the gate is off', () => {
    expect(
      selectPendingOverdueAlertIds(rootWith(PlatformMocks.gateOff)),
    ).toEqual([])
  })

  it('is empty on a cold mount, because the web has no persisted queue', () => {
    expect(selectPendingOverdueAlertIds(rootWith(PlatformMocks.idle))).toEqual(
      [],
    )
  })
})

describe('selectPendingOverdueAlertCount', () => {
  it('counts the armed alerts', () => {
    expect(selectPendingOverdueAlertCount(rootWith(PlatformMocks.armed))).toBe(2)
  })

  it('is zero with the gate off', () => {
    expect(selectPendingOverdueAlertCount(rootWith(PlatformMocks.gateOff))).toBe(
      0,
    )
  })

  it('is zero on a cold mount', () => {
    expect(selectPendingOverdueAlertCount(rootWith(PlatformMocks.idle))).toBe(0)
  })
})

describe('selectAreOverdueAlertsActive', () => {
  it('is true only when the gate is on and permission is granted', () => {
    expect(selectAreOverdueAlertsActive(rootWith(PlatformMocks.armed))).toBe(
      true,
    )
  })

  it('is false with permission but no gate — the statusQuo default', () => {
    expect(selectAreOverdueAlertsActive(rootWith(PlatformMocks.gateOff))).toBe(
      false,
    )
  })

  it('is false with a gate but no permission', () => {
    expect(
      selectAreOverdueAlertsActive(
        rootWith({ ...PlatformMocks.blocked, isOverdueAlertGateEnabled: true }),
      ),
    ).toBe(false)
  })
})

describe('selectInstallAvailability & selectCanOfferInstall', () => {
  it('offers an install only where a prompt is actually captured', () => {
    expect(selectCanOfferInstall(rootWith(PlatformMocks.notAsked))).toBe(true)
    expect(selectInstallAvailability(rootWith(PlatformMocks.notAsked))).toBe(
      'available',
    )
  })

  it('offers nothing before the browser has decided — no dead button', () => {
    expect(selectCanOfferInstall(rootWith(PlatformMocks.idle))).toBe(false)
    expect(selectInstallAvailability(rootWith(PlatformMocks.idle))).toBe(
      'unknown',
    )
  })

  it('offers nothing once the app is already installed', () => {
    expect(selectCanOfferInstall(rootWith(PlatformMocks.armed))).toBe(false)
    expect(selectInstallAvailability(rootWith(PlatformMocks.armed))).toBe(
      'installed',
    )
  })

  it('offers nothing on a browser that will never fire the event', () => {
    expect(selectCanOfferInstall(rootWith(PlatformMocks.blocked))).toBe(false)
  })
})

describe('selectIsScreenAwakeRequested', () => {
  it('is true while a session holds the screen awake', () => {
    expect(
      selectIsScreenAwakeRequested(rootWith(PlatformMocks.screenAwake)),
    ).toBe(true)
  })

  it('is false once the session concludes', () => {
    expect(selectIsScreenAwakeRequested(rootWith(PlatformMocks.armed))).toBe(
      false,
    )
  })

  it('is false before anything has run', () => {
    expect(selectIsScreenAwakeRequested(rootWith(PlatformMocks.idle))).toBe(
      false,
    )
  })
})

describe('selectPlatformCapabilities', () => {
  it('reports a fully capable device', () => {
    expect(selectPlatformCapabilities(rootWith(PlatformMocks.armed))).toEqual({
      notifications: true,
      wakeLock: true,
      vibration: true,
    })
  })

  it('reports a device with no vibrator', () => {
    expect(
      selectPlatformCapabilities(rootWith(PlatformMocks.blocked)).vibration,
    ).toBe(false)
  })

  it('reports nothing capable before the probe has run', () => {
    expect(selectPlatformCapabilities(rootWith(PlatformMocks.idle))).toEqual({
      notifications: false,
      wakeLock: false,
      vibration: false,
    })
  })
})
