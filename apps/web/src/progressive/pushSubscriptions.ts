/**
 * Where a device's push subscription is kept — **in memory, on purpose, and
 * only until this issue's successor replaces it.**
 *
 * ## Why this is not a database
 *
 * KC-IS-#34 declares push-server infrastructure out of scope ("push-server
 * infrastructure decisions (G5 if needed)"), and it is a genuine decision, not
 * an omission: a real subscription store needs a table in the Kro Cloud schema,
 * whose canon lives in `zheref/KroApple`, not here — this repo is a schema
 * *client* and writes no migration. Persisting subscriptions is therefore
 * blocked on the auth & sync child (KC-IS-#31) and on a schema owner.
 *
 * The seed this replaces had the same in-memory `let` with the same comment
 * ("in a production environment, you would want to store the subscription in a
 * database"). What changes here is honesty about the consequences, which are
 * severe enough to be worth stating rather than discovering:
 *
 * - **A subscription does not survive a server restart, and does not exist on
 *   a second instance.** On a serverless host every invocation may be a fresh
 *   instance, so in practice a delivery works only within one warm instance's
 *   lifetime.
 * - **It is process-global, not per-user.** One registry means one device. It
 *   is adequate for wiring the plumbing end to end and for tests; it is not
 *   adequate for two people.
 *
 * Kept behind a tiny module rather than a bare `let` in `actions.ts` for two
 * reasons: a `'use server'` module may export only async functions, and a
 * suite needs `reset()` to run two delivery tests without one leaking into the
 * next.
 */
import type { PushSubscription } from 'web-push'

let subscription: PushSubscription | null = null

/** The currently-registered subscription, or `null` when there is none. */
export const currentPushSubscription = (): PushSubscription | null =>
  subscription

export const rememberPushSubscription = (next: PushSubscription): void => {
  subscription = next
}

export const forgetPushSubscription = (): boolean => {
  const had = subscription !== null
  subscription = null
  return had
}

/** Test-only: drops the registry so one suite cannot see another's device. */
export const resetPushSubscriptions = (): void => {
  subscription = null
}
