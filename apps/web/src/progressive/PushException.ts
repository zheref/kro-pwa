/**
 * The push-delivery failure union (`RC-8`).
 *
 * Lives beside the Server Actions rather than inside them because a
 * `'use server'` module may export **only** async functions — a factory object
 * exported from `actions.ts` would be a build error, not a style choice.
 */
import { type Exception, exception } from '@kro/core'

export type PushException =
  /** `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` are not configured. */
  | Exception<'notConfigured'>
  /** No device has subscribed, so there is nothing to deliver to. */
  | Exception<'noSubscription'>
  /** The push service rejected the delivery (gone, rate-limited, malformed). */
  | Exception<'deliveryFailed'>

export const PushExceptions = {
  notConfigured: (): PushException =>
    exception(
      'notConfigured',
      'Web push is not configured on this deployment.',
      false,
    ),

  noSubscription: (): PushException =>
    exception(
      'noSubscription',
      'This device has not subscribed to push notifications.',
      true,
    ),

  deliveryFailed: (reason: string): PushException =>
    exception('deliveryFailed', `The push service refused: ${reason}`, true),
} as const
