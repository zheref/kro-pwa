/**
 * The overdue-alert reconciliation engine — canon
 * `MainProducer.produceReconcileOverdueNotificationsEffect` and
 * `Endeavor.isOverdueNotificationEligible`, extracted as a **pure function**
 * (`UZF-10`: no clock, no service, no store — every input is passed in).
 *
 * `docs/Features/Notifications.md` states the model this file is:
 *
 * > *every time the full set of the user's items changes (an item is added,
 * > completed, deleted, or rescheduled — for any reason, on any screen), the
 * > set of pending overdue alerts is recomputed **from scratch** and brought in
 * > line with the current, true set of overdue-eligible items: missing ones are
 * > scheduled, no-longer-eligible ones are withdrawn.*
 *
 * Two properties follow from "from scratch", and both are load-bearing:
 *
 * - **Idempotence.** Running the plan twice against the same item set produces
 *   the same plan. There is no incremental diff to drift, so a re-fetch, a
 *   pull-to-refresh or an app relaunch cannot double-notify (canon flow 4).
 * - **One alert per item.** The identifier is derived from the item
 *   (`overdue-<id>`), so scheduling the same item again *replaces* its alert
 *   rather than adding a second one — which is why the plan re-schedules every
 *   eligible item every time instead of trying to work out which ones are new.
 *
 * The prefix is what lets the plan tell *its own* pending alerts apart from any
 * other identified notification (a future Morning Push), exactly as canon's
 * `overdueNotificationIdPrefix` does: only prefixed identifiers are ever
 * withdrawn.
 */
import type { Endeavor } from '@kro/core'
import { EndeavorKind, hasBeenCompleted } from '@kro/core'
import type {
  NotificationPermissionState,
  PendingAlert,
} from './NotificationsService'

/** Canon's `overdueNotificationIdPrefix`, preserved verbatim. */
export const OVERDUE_ALERT_ID_PREFIX = 'overdue-'

/** Canon's `overdueNotificationId(for:)`. */
export const overdueAlertId = (endeavorId: string): string =>
  OVERDUE_ALERT_ID_PREFIX + endeavorId

/** Whether an identifier belongs to this feature's alerts. */
export const isOverdueAlertId = (identifier: string): boolean =>
  identifier.startsWith(OVERDUE_ALERT_ID_PREFIX)

/**
 * Canon's `Endeavor.isOverdueNotificationEligible`, ported clause for clause:
 *
 * ```swift
 * guard kind == .task else { return false }
 * guard !hasBeenCompleted else { return false }
 * return due != nil
 * ```
 *
 * Note it reads `kind`, **not** the resolved kind, and that it is deliberately
 * *not* gated on the due date having already passed — a task due in the future
 * is eligible (the alert is scheduled ahead), and a task already past due when
 * first seen stays eligible so it still nudges once.
 */
export const isOverdueAlertEligible = (endeavor: Endeavor): boolean =>
  endeavor.kind === EndeavorKind.task &&
  !hasBeenCompleted(endeavor) &&
  endeavor.due !== null

/** Canon's notification copy: title `Overdue`, body quoting the task. */
export const overdueAlertTitle = 'Overdue'

export const overdueAlertBody = (endeavorTitle: string): string =>
  `"${endeavorTitle}" is now overdue.`

/** What the engine is asked to reconcile against. */
export interface OverdueAlertReconciliationInput {
  /** The current, full item set. Never a filtered view. */
  readonly endeavors: readonly Endeavor[]
  /** Every identifier the notification service currently has armed. */
  readonly pendingIdentifiers: readonly string[]
  /**
   * The `notifications` flag AND `general.overdueAlerts` AND
   * `do.notifyOnOverdue`, already AND'd by `overdueNotificationsGate`.
   */
  readonly isGateEnabled: boolean
  readonly permission: NotificationPermissionState
}

/** The diff a caller applies. Both halves may be empty. */
export interface OverdueAlertPlan {
  readonly schedule: readonly PendingAlert[]
  readonly withdraw: readonly string[]
}

const EMPTY_PLAN: OverdueAlertPlan = { schedule: [], withdraw: [] }

/**
 * Recomputes the full pending set and returns the diff against what is armed.
 *
 * Three early exits, in canon's own order:
 *
 * 1. **Gate off** → withdraw everything this feature owns, schedule nothing.
 *    Canon: *"any previously-scheduled overdue alerts are withdrawn the next
 *    time the item set changes."*
 * 2. **Permission not granted** → do nothing at all, silently. Canon returns
 *    before it computes the eligible set, so it neither schedules nor
 *    withdraws; a denial is not a reason to tear down alerts the user may
 *    already have pending from a granted session.
 * 3. Otherwise → schedule one alert per eligible item and withdraw every
 *    prefixed pending identifier that no longer maps to one.
 *
 * A duplicate id in `endeavors` degrades to last-write-wins rather than
 * throwing — canon makes the same choice, for the same reason: this runs on
 * *every* item-set change and must never be the thing that breaks the app.
 */
export const reconcileOverdueAlerts = (
  input: OverdueAlertReconciliationInput,
): OverdueAlertPlan => {
  const ownedPending = input.pendingIdentifiers.filter(isOverdueAlertId)

  if (!input.isGateEnabled) {
    return { schedule: [], withdraw: ownedPending }
  }

  if (input.permission !== 'granted') {
    return EMPTY_PLAN
  }

  const eligible = new Map<string, PendingAlert>()
  for (const endeavor of input.endeavors) {
    if (!isOverdueAlertEligible(endeavor)) continue
    // `due` is non-null by the eligibility predicate above; the check keeps the
    // narrowing honest instead of asserting it.
    const due = endeavor.due
    if (due === null) continue
    const id = overdueAlertId(endeavor.id)
    eligible.set(id, {
      id,
      title: overdueAlertTitle,
      body: overdueAlertBody(endeavor.title),
      deliverAt: due,
    })
  }

  return {
    schedule: [...eligible.values()],
    withdraw: ownedPending.filter((id) => !eligible.has(id)),
  }
}

// ---------------------------------------------------------------------------
// The applier — the half that touches the world
// ---------------------------------------------------------------------------

/** What a caller asks a `NotificationsService` to reconcile. */
export interface OverdueAlertReconciliationRequest {
  /** The current, full item set. */
  readonly endeavors: readonly Endeavor[]
  /**
   * The already-AND'd `overdueNotificationsGate` — the `notifications` flag
   * AND `general.overdueAlerts` AND `do.notifyOnOverdue`. Resolved by the
   * Producer, because reading a flag registry and a preferences store is a
   * feature-tier concern, not a notification-boundary one.
   */
  readonly isGateEnabled: boolean
}

/** What one reconciliation pass did. */
export interface OverdueAlertReconciliationReport {
  readonly permission: NotificationPermissionState
  readonly isGateEnabled: boolean
  /** Identifiers scheduled (or re-scheduled, which replaces). */
  readonly scheduled: readonly string[]
  readonly withdrawn: readonly string[]
  /** Every overdue-alert identifier armed after the pass. */
  readonly pending: readonly string[]
}

/** The narrow slice of `NotificationsService` the applier needs. */
export interface OverdueAlertReconciliationPorts {
  permissionState(): NotificationPermissionState
  pendingIdentifiers(): Promise<readonly string[]>
  schedule(alert: PendingAlert): Promise<void>
  withdraw(identifiers: readonly string[]): Promise<void>
}

/**
 * Runs the engine against the live pending set and applies the diff.
 *
 * Shared by both `NotificationsService` bindings so the *decision* is written
 * once — a stub that reconciled differently from the live binding would make
 * every reconciliation test a test of the stub.
 *
 * Withdrawals run before schedules, matching canon's order, so a pass that
 * both drops and re-adds an identifier (an item rescheduled to a new due time)
 * ends armed rather than withdrawn.
 */
export const applyOverdueAlertReconciliation = async (
  ports: OverdueAlertReconciliationPorts,
  request: OverdueAlertReconciliationRequest,
): Promise<OverdueAlertReconciliationReport> => {
  const permission = ports.permissionState()
  const pendingBefore = await ports.pendingIdentifiers()

  const plan = reconcileOverdueAlerts({
    endeavors: request.endeavors,
    pendingIdentifiers: pendingBefore,
    isGateEnabled: request.isGateEnabled,
    permission,
  })

  if (plan.withdraw.length > 0) await ports.withdraw(plan.withdraw)
  for (const alert of plan.schedule) await ports.schedule(alert)

  const pendingAfter = (await ports.pendingIdentifiers()).filter(isOverdueAlertId)

  return {
    permission,
    isGateEnabled: request.isGateEnabled,
    scheduled: plan.schedule.map((alert) => alert.id),
    withdrawn: plan.withdraw,
    pending: pendingAfter,
  }
}
