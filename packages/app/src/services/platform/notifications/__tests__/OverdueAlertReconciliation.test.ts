/**
 * The reconciliation table suite — every scenario
 * `docs/Features/Notifications.md` enumerates, asserted against the pure
 * engine.
 *
 * The canon doc's nine user flows and its two unhappy eligibility rules map to
 * the `describe` blocks below one for one; the flow number is named in each
 * test so a reader can diff the suite against the spec without translating.
 */
import {
  EndeavorKind,
  EndeavorStatus,
  type Endeavor,
  makeEndeavor,
} from '@kro/core'
import { endeavorMocks } from '@kro/core/mocks'
import { describe, expect, it } from 'vitest'
import {
  OVERDUE_ALERT_ID_PREFIX,
  applyOverdueAlertReconciliation,
  isOverdueAlertEligible,
  isOverdueAlertId,
  overdueAlertBody,
  overdueAlertId,
  reconcileOverdueAlerts,
} from '../OverdueAlertReconciliation'
import { makeStubbedNotificationsService } from '../NotificationsService'

const NOW = new Date(2026, 0, 15, 9, 0, 0)

/** A task already past its due moment the first time we ever see it. */
const alreadyOverdueTask: Endeavor = makeEndeavor({
  id: 'endeavor-synced-late',
  title: 'File the tax return',
  kind: EndeavorKind.task,
  status: EndeavorStatus.pending,
  due: new Date(2026, 0, 14, 9, 0, 0),
})

/** The same task, rescheduled to a later due moment. */
const rescheduledTask: Endeavor = makeEndeavor({
  id: endeavorMocks.plannedTask.id,
  title: endeavorMocks.plannedTask.title,
  kind: EndeavorKind.task,
  status: EndeavorStatus.planned,
  due: new Date(2026, 0, 16, 17, 0, 0),
})

const grantedGate = {
  isGateEnabled: true,
  permission: 'granted',
} as const

// ---------------------------------------------------------------------------
// Eligibility (canon flows 7 and 2; `Endeavor.isOverdueNotificationEligible`)
// ---------------------------------------------------------------------------

describe('isOverdueAlertEligible', () => {
  it('accepts a pending task with a due time — the ordinary case', () => {
    expect(isOverdueAlertEligible(endeavorMocks.plannedTask)).toBe(true)
  })

  it('accepts a task already past its due time, so a missed item still nudges', () => {
    expect(isOverdueAlertEligible(alreadyOverdueTask)).toBe(true)
  })

  it('refuses a task with no due time, whatever its completion state (flow 7)', () => {
    expect(endeavorMocks.bareDraft.due).toBeNull()
    expect(isOverdueAlertEligible(endeavorMocks.bareDraft)).toBe(false)
  })

  it('refuses a completed task — the alert is withdrawn on completion (flow 2)', () => {
    expect(isOverdueAlertEligible(endeavorMocks.completedWithPerformances)).toBe(
      false,
    )
  })

  it('refuses a reminder: canon gates on kind == task, not on the resolved kind', () => {
    expect(isOverdueAlertEligible(endeavorMocks.overdueTouristReminder)).toBe(
      false,
    )
  })

  it('refuses a habit, an event and a blueprint — none is a task', () => {
    expect(isOverdueAlertEligible(endeavorMocks.weekdayHabit)).toBe(false)
    expect(isOverdueAlertEligible(endeavorMocks.todayEvent)).toBe(false)
    expect(isOverdueAlertEligible(endeavorMocks.blockedBlueprint)).toBe(false)
  })
})

describe('overdueAlertId', () => {
  it('keys the alert on the item, so the same item always resolves one id', () => {
    expect(overdueAlertId('endeavor-1')).toBe(`${OVERDUE_ALERT_ID_PREFIX}endeavor-1`)
  })

  it('recognises its own identifiers and disowns everything else', () => {
    expect(isOverdueAlertId(overdueAlertId('endeavor-1'))).toBe(true)
    expect(isOverdueAlertId('morning-push-2026-01-15')).toBe(false)
  })

  it('quotes the task in the body, exactly as canon words it', () => {
    expect(overdueAlertBody('Pay Mortgage')).toBe('"Pay Mortgage" is now overdue.')
  })
})

// ---------------------------------------------------------------------------
// The plan (canon's "recompute the full pending set from scratch")
// ---------------------------------------------------------------------------

describe('reconcileOverdueAlerts', () => {
  it('schedules one alert per eligible item and nothing for the rest', () => {
    const plan = reconcileOverdueAlerts({
      endeavors: [
        endeavorMocks.plannedTask,
        endeavorMocks.bareDraft,
        endeavorMocks.todayEvent,
        endeavorMocks.overdueTouristReminder,
        endeavorMocks.completedWithPerformances,
        alreadyOverdueTask,
      ],
      pendingIdentifiers: [],
      ...grantedGate,
    })

    expect(plan.schedule.map((alert) => alert.id)).toEqual([
      overdueAlertId(endeavorMocks.plannedTask.id),
      overdueAlertId(alreadyOverdueTask.id),
    ])
    expect(plan.withdraw).toEqual([])
  })

  it('delivers an already-overdue item at its own past due time, not later (flow 8)', () => {
    const plan = reconcileOverdueAlerts({
      endeavors: [alreadyOverdueTask],
      pendingIdentifiers: [],
      ...grantedGate,
    })

    const alert = plan.schedule[0]
    expect(alert?.deliverAt).toEqual(alreadyOverdueTask.due)
    expect(alert?.deliverAt.getTime()).toBeLessThan(NOW.getTime())
  })

  it('is idempotent: re-running against the same set produces the same plan (flow 4)', () => {
    const first = reconcileOverdueAlerts({
      endeavors: [endeavorMocks.plannedTask, alreadyOverdueTask],
      pendingIdentifiers: [],
      ...grantedGate,
    })
    const second = reconcileOverdueAlerts({
      endeavors: [endeavorMocks.plannedTask, alreadyOverdueTask],
      pendingIdentifiers: first.schedule.map((alert) => alert.id),
      ...grantedGate,
    })

    expect(second.schedule).toEqual(first.schedule)
    expect(second.withdraw).toEqual([])
  })

  it('withdraws the alert for an item that has been completed (flow 2)', () => {
    const armed = overdueAlertId(endeavorMocks.plannedTask.id)
    const plan = reconcileOverdueAlerts({
      endeavors: [
        makeEndeavor({
          id: endeavorMocks.plannedTask.id,
          title: endeavorMocks.plannedTask.title,
          kind: EndeavorKind.task,
          status: EndeavorStatus.closed,
          due: endeavorMocks.plannedTask.due,
        }),
      ],
      pendingIdentifiers: [armed],
      ...grantedGate,
    })

    expect(plan.withdraw).toEqual([armed])
    expect(plan.schedule).toEqual([])
  })

  it('withdraws the alert for an item that has been deleted (flow 3)', () => {
    const armed = overdueAlertId('endeavor-deleted')
    const plan = reconcileOverdueAlerts({
      endeavors: [endeavorMocks.plannedTask],
      pendingIdentifiers: [armed],
      ...grantedGate,
    })

    expect(plan.withdraw).toEqual([armed])
  })

  it('re-schedules a rescheduled item under the same id, at the new time (flow 3)', () => {
    const armed = overdueAlertId(endeavorMocks.plannedTask.id)
    const plan = reconcileOverdueAlerts({
      endeavors: [rescheduledTask],
      pendingIdentifiers: [armed],
      ...grantedGate,
    })

    expect(plan.withdraw).toEqual([])
    expect(plan.schedule).toHaveLength(1)
    expect(plan.schedule[0]?.id).toBe(armed)
    expect(plan.schedule[0]?.deliverAt).toEqual(rescheduledTask.due)
  })

  it('never touches an identifier it does not own — a future Morning Push survives', () => {
    const plan = reconcileOverdueAlerts({
      endeavors: [],
      pendingIdentifiers: ['morning-push-2026-01-15', overdueAlertId('gone')],
      ...grantedGate,
    })

    expect(plan.withdraw).toEqual([overdueAlertId('gone')])
  })

  it('degrades a duplicate id to last-write-wins rather than double-scheduling', () => {
    const plan = reconcileOverdueAlerts({
      endeavors: [endeavorMocks.plannedTask, rescheduledTask],
      pendingIdentifiers: [],
      ...grantedGate,
    })

    expect(plan.schedule).toHaveLength(1)
    expect(plan.schedule[0]?.deliverAt).toEqual(rescheduledTask.due)
  })
})

// ---------------------------------------------------------------------------
// The gate and the permission (canon flows 5 and 6)
// ---------------------------------------------------------------------------

describe('reconcileOverdueAlerts — gate and permission', () => {
  it('withdraws everything and schedules nothing while the gate is off (flow 6)', () => {
    const armed = [
      overdueAlertId(endeavorMocks.plannedTask.id),
      overdueAlertId(alreadyOverdueTask.id),
    ]
    const plan = reconcileOverdueAlerts({
      endeavors: [endeavorMocks.plannedTask, alreadyOverdueTask],
      pendingIdentifiers: armed,
      isGateEnabled: false,
      permission: 'granted',
    })

    expect(plan.schedule).toEqual([])
    expect(plan.withdraw).toEqual(armed)
  })

  it('re-schedules every eligible item when the gate is switched back on (flow 6)', () => {
    const plan = reconcileOverdueAlerts({
      endeavors: [endeavorMocks.plannedTask, alreadyOverdueTask],
      pendingIdentifiers: [],
      ...grantedGate,
    })

    expect(plan.schedule).toHaveLength(2)
  })

  it('schedules nothing, silently, when permission was denied (flow 5)', () => {
    const plan = reconcileOverdueAlerts({
      endeavors: [endeavorMocks.plannedTask],
      pendingIdentifiers: [],
      isGateEnabled: true,
      permission: 'denied',
    })

    expect(plan).toEqual({ schedule: [], withdraw: [] })
  })

  it('schedules nothing when permission was never asked for', () => {
    const plan = reconcileOverdueAlerts({
      endeavors: [endeavorMocks.plannedTask],
      pendingIdentifiers: [],
      isGateEnabled: true,
      permission: 'default',
    })

    expect(plan.schedule).toEqual([])
  })

  it('schedules nothing on a browser with no Notification API at all', () => {
    const plan = reconcileOverdueAlerts({
      endeavors: [endeavorMocks.plannedTask],
      pendingIdentifiers: [],
      isGateEnabled: true,
      permission: 'unsupported',
    })

    expect(plan.schedule).toEqual([])
  })

  it('leaves an armed alert alone on a denial, rather than tearing it down', () => {
    const armed = overdueAlertId(endeavorMocks.plannedTask.id)
    const plan = reconcileOverdueAlerts({
      endeavors: [endeavorMocks.plannedTask],
      pendingIdentifiers: [armed],
      isGateEnabled: true,
      permission: 'denied',
    })

    expect(plan.withdraw).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// The applier (the half that touches the service)
// ---------------------------------------------------------------------------

describe('applyOverdueAlertReconciliation', () => {
  it('arms one alert per eligible item and reports what it armed', async () => {
    const service = makeStubbedNotificationsService({ permission: 'granted' })

    const report = await applyOverdueAlertReconciliation(service, {
      endeavors: [endeavorMocks.plannedTask, endeavorMocks.bareDraft],
      isGateEnabled: true,
    })

    expect(report.scheduled).toEqual([overdueAlertId(endeavorMocks.plannedTask.id)])
    expect(report.pending).toEqual([overdueAlertId(endeavorMocks.plannedTask.id)])
    expect(service.recordedSchedules()).toHaveLength(1)
  })

  it('makes no scheduling call at all while the gate is off (statusQuo default)', async () => {
    const service = makeStubbedNotificationsService({ permission: 'granted' })

    const report = await applyOverdueAlertReconciliation(service, {
      endeavors: [endeavorMocks.plannedTask, alreadyOverdueTask],
      isGateEnabled: false,
    })

    expect(service.recordedSchedules()).toEqual([])
    expect(report.isGateEnabled).toBe(false)
    expect(report.pending).toEqual([])
  })

  it('makes no scheduling call when permission was denied (flow 5)', async () => {
    const service = makeStubbedNotificationsService({ permission: 'denied' })

    await applyOverdueAlertReconciliation(service, {
      endeavors: [endeavorMocks.plannedTask],
      isGateEnabled: true,
    })

    expect(service.recordedSchedules()).toEqual([])
    expect(service.recordedWithdrawals()).toEqual([])
  })

  it('withdraws a stale alert and arms the survivor in one pass', async () => {
    const stale = overdueAlertId('endeavor-deleted')
    const service = makeStubbedNotificationsService({
      permission: 'granted',
      pending: [stale],
    })

    const report = await applyOverdueAlertReconciliation(service, {
      endeavors: [endeavorMocks.plannedTask],
      isGateEnabled: true,
    })

    expect(service.recordedWithdrawals()).toEqual([stale])
    expect(report.pending).toEqual([overdueAlertId(endeavorMocks.plannedTask.id)])
  })

  it('ends a reschedule armed, not withdrawn — withdrawals run before schedules', async () => {
    const armed = overdueAlertId(endeavorMocks.plannedTask.id)
    const service = makeStubbedNotificationsService({
      permission: 'granted',
      pending: [armed],
    })

    const report = await applyOverdueAlertReconciliation(service, {
      endeavors: [rescheduledTask],
      isGateEnabled: true,
    })

    expect(report.pending).toEqual([armed])
  })

  it('signing out withdraws every alert this feature owns and nothing else', async () => {
    const service = makeStubbedNotificationsService({
      permission: 'granted',
      pending: [overdueAlertId('a'), overdueAlertId('b'), 'morning-push-1'],
    })

    const withdrawn = await service.withdrawAllOverdueAlerts()

    expect(withdrawn).toEqual([overdueAlertId('a'), overdueAlertId('b')])
    expect(await service.pendingIdentifiers()).toEqual(['morning-push-1'])
  })
})
