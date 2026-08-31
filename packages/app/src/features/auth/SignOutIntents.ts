/**
 * What sign-out asks the platform tier to do, expressed as **intents** rather
 * than as calls — canon `MainProducer.produceClearOverdueNotificationsEffect`.
 *
 * Canon withdraws every pending `"overdue-"`-prefixed local notification on
 * sign-out, and its comment says exactly why: an already-scheduled request
 * *"embeds the raw task title"* and would otherwise fire after a **different**
 * user signs into the same shared device (`SEC-8` / CWE-668). That is the same
 * guarantee the preferences wipe gives, extended to the OS notification queue,
 * which `Preferences.clearAll()` cannot reach.
 *
 * kro-pwa has no notification service yet — PWA platform services are KC-IS-#34
 * — so this issue cannot *perform* the withdrawal. The two dishonest options
 * would be to skip it (and ship a sign-out that leaks the previous account's
 * task titles the moment #34 lands) or to invent a service #34 then has to
 * match. The third option is this: sign-out **emits the intent**, the slice
 * records it, and #34's service consumes it. The intent is data, so the
 * security property is testable today — `signOutIntents()` returning the
 * withdrawal is what the test asserts — and #34's work is to honour a contract
 * that already exists rather than to remember a requirement.
 *
 * `withdrawnPrefix` is canon's `overdueNotificationIdPrefix` verbatim
 * (`"overdue-"`), because the ids are minted as `prefix + endeavor.id` and both
 * ends have to agree on the string.
 */

/** Canon's `overdueNotificationIdPrefix`. */
export const OVERDUE_NOTIFICATION_ID_PREFIX = 'overdue-'

/**
 * One platform action sign-out requires but this issue does not own.
 *
 * A discriminated union with one member today (`RC-24`): naming the shape now
 * costs nothing and means #34 adds a member instead of changing the contract.
 */
export type SignOutIntent = {
  readonly kind: 'withdrawPendingAlerts'
  /** Every pending notification whose identifier starts with this is cancelled. */
  readonly withdrawnPrefix: string
}

/** The intents a sign-out raises, in the order they should be performed. */
export const signOutIntents = (): readonly SignOutIntent[] => [
  {
    kind: 'withdrawPendingAlerts',
    withdrawnPrefix: OVERDUE_NOTIFICATION_ID_PREFIX,
  },
]

/** Whether an identifier is one a sign-out withdrawal covers. */
export const isWithdrawnAlertIdentifier = (
  identifier: string,
  intent: SignOutIntent,
): boolean => identifier.startsWith(intent.withdrawnPrefix)
