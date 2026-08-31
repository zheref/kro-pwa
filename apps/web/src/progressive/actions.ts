'use server'

/**
 * The push-server half, as Server Actions — Producer-equivalents that call a
 * boundary and return a `Result`, never a bare value (`RC-43`).
 *
 * Rebuilt for KC-IS-#34. Three defects in the seed this replaces:
 *
 *   - **`'<mailto:me@zheref.io>'`** — the angle brackets were literal
 *     characters in the VAPID subject, so `setVapidDetails` was configured with
 *     a subject no push service accepts. The same class of bug as the service
 *     worker's `'<https://kro.app>'`, in the same seed.
 *   - **VAPID configured at module scope with `process.env.…!`** — importing the
 *     module on a deployment without the keys threw during evaluation, taking
 *     the route down rather than degrading. Configuration is now lazy and
 *     absence is a typed `notConfigured` result.
 *   - **`sendNotification` threw on "no subscription"** — a Server Action that
 *     throws gives its caller a stack trace instead of an outcome. Every action
 *     here resolves `Result`.
 *
 * The payload shape matches what `public/sw.js`'s `push` handler reads:
 * `{ title, body, icon?, tag? }`. `tag` is what makes one-alert-per-item true
 * at the OS level, so it is carried through rather than dropped.
 */
import { type Result, err, ok } from '@kro/core'
import webpush, { type PushSubscription } from 'web-push'
import { type PushException, PushExceptions } from './PushException'
import {
  currentPushSubscription,
  forgetPushSubscription,
  rememberPushSubscription,
} from './pushSubscriptions'

/** The push payload `public/sw.js` knows how to display. */
export interface PushPayload {
  readonly title: string
  readonly body: string
  readonly icon?: string
  readonly tag?: string
}

/**
 * Configures `web-push` on first use, or reports that this deployment has no
 * keys. Not exported: a `'use server'` module may export only async functions.
 */
let configured = false
const configure = (): boolean => {
  if (configured) return true

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const secretKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:me@zheref.io'
  if (!publicKey || !secretKey) return false

  webpush.setVapidDetails(subject, publicKey, secretKey)
  configured = true
  return true
}

/** Registers this device's push subscription. */
export async function subscribeUser(
  subscription: PushSubscription,
): Promise<Result<true, PushException>> {
  rememberPushSubscription(subscription)
  return ok(true)
}

/**
 * Drops the registered subscription. Reports `noSubscription` when there was
 * nothing to drop, rather than pretending it removed something.
 */
export async function unsubscribeUser(): Promise<Result<true, PushException>> {
  return forgetPushSubscription()
    ? ok(true)
    : err(PushExceptions.noSubscription())
}

/**
 * Delivers one push to the registered device.
 *
 * Every failure is a typed `Result`: no keys, no device, or a refusal from the
 * push service. None of them throws, so a caller renders an outcome rather than
 * catching.
 */
export async function sendPushNotification(
  payload: PushPayload,
): Promise<Result<true, PushException>> {
  if (!configure()) return err(PushExceptions.notConfigured())

  const subscription = currentPushSubscription()
  if (!subscription) return err(PushExceptions.noSubscription())

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload))
    return ok(true)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return err(PushExceptions.deliveryFailed(reason))
  }
}
