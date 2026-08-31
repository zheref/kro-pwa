/**
 * `PlatformVocabulary` declares no runtime value — it derives the tier's four
 * names from `ThunkExtra`. So the thing worth testing is the property that
 * makes the derivation safe: **the derived names still describe the Services**.
 *
 * These are compile-time assertions given runtime bodies so the suite reports
 * them. If a Service's signature changes and the alias no longer matches, this
 * file fails `tsc` — which is the whole point of deriving rather than copying.
 */
import { describe, expect, it } from 'vitest'
import { PLATFORM_OVERDUE_ALERT_ID_PREFIX } from '../PlatformVocabulary'
import { stubbedThunkExtra } from '../../../library/store'
import {
  makeStubbedInstallService,
  makeStubbedNotificationsService,
  sessionSoundRoles,
} from '../../../services/platform'
import type {
  InstallAvailability,
  InstallOutcome,
  NotificationPermissionState,
  OverdueAlertReconciliationReport,
  SessionSoundRole,
} from '../PlatformVocabulary'

/** Fails to compile if `Left` and `Right` are not mutually assignable. */
const assertSameType = <Left, Right>(
  ..._proof: [Left] extends [Right]
    ? [Right] extends [Left]
      ? []
      : ['not assignable']
    : ['not assignable']
): void => {}

describe('SessionSoundRole', () => {
  it('names exactly the four roles the audio Service accepts', () => {
    const roles: SessionSoundRole[] = [...sessionSoundRoles]
    expect(roles).toHaveLength(4)
    assertSameType<SessionSoundRole, (typeof sessionSoundRoles)[number]>()
  })

  it('is accepted by the injected Service without a cast', async () => {
    const role: SessionSoundRole = 'breakComplete'
    await expect(
      stubbedThunkExtra.audioFeedbackService.play(role),
    ).resolves.toBeUndefined()
  })

  it('rejects a role the Service does not declare', () => {
    // @ts-expect-error 'sessionStarted' is not one of canon's four roles.
    const role: SessionSoundRole = 'sessionStarted'
    expect(role).toBe('sessionStarted')
  })
})

describe('NotificationPermissionState', () => {
  it('is exactly what the Service reports', () => {
    const state: NotificationPermissionState =
      stubbedThunkExtra.notificationsService.permissionState()
    expect(['unsupported', 'default', 'granted', 'denied']).toContain(state)
  })

  it('includes "unsupported", which the DOM type cannot express', () => {
    const state: NotificationPermissionState = 'unsupported'
    expect(state).toBe('unsupported')
  })

  it('rejects a value the browser never reports', () => {
    // @ts-expect-error 'prompt' is the Permissions API's word, not Notification's.
    const state: NotificationPermissionState = 'prompt'
    expect(state).toBe('prompt')
  })
})

describe('InstallAvailability and InstallOutcome', () => {
  // Built per test rather than read off `stubbedThunkExtra`: prompting mutates
  // the binding, and the shared manifest stub is exactly the thing a suite must
  // not leave changed for the next one.
  it('reads availability straight off the Service', () => {
    const availability: InstallAvailability =
      makeStubbedInstallService().availability()
    expect(availability).toBe('available')
  })

  it('reads the prompt outcome straight off the Service', async () => {
    const outcome: InstallOutcome = await makeStubbedInstallService().prompt()
    expect(outcome).toBe('accepted')
  })

  it('keeps the two vocabularies apart — an outcome is not an availability', () => {
    // @ts-expect-error 'accepted' is an outcome, never an availability.
    const availability: InstallAvailability = 'accepted'
    expect(availability).toBe('accepted')
  })
})

describe('OverdueAlertReconciliationReport', () => {
  it('is exactly what the Service resolves', async () => {
    const report: OverdueAlertReconciliationReport =
      await makeStubbedNotificationsService().reconcileOverdueAlerts({
        endeavors: [],
        isGateEnabled: false,
      })
    expect(report.isGateEnabled).toBe(false)
  })

  it('carries the permission the pass observed', async () => {
    const report =
      await makeStubbedNotificationsService().reconcileOverdueAlerts({
        endeavors: [],
        isGateEnabled: true,
      })
    expect(report.permission).toBe('granted')
  })

  it('reports both halves of the diff', async () => {
    const report =
      await makeStubbedNotificationsService().reconcileOverdueAlerts({
        endeavors: [],
        isGateEnabled: true,
      })
    expect(report.scheduled).toEqual([])
    expect(report.withdrawn).toEqual([])
  })
})

describe('the overdue-alert id prefix restatement', () => {
  it('matches the service constant it restates', async () => {
    const service = await import(
      '../../../services/platform/notifications/OverdueAlertReconciliation'
    )
    expect(PLATFORM_OVERDUE_ALERT_ID_PREFIX).toBe(service.OVERDUE_ALERT_ID_PREFIX)
  })
})
