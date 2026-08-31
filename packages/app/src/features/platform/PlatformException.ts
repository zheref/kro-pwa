/**
 * The platform tier's typed failure union (`RC-8`, `UZF-8`).
 *
 * Deliberately small, because most of this tier has **no** user-facing failure
 * mode: canon's audio, haptic and screen-wake effects are all fire-and-forget
 * (`"a screen-wake toggle has no observable failure to surface"`), and
 * reconciliation is *"a best-effort background sync, not a user-facing
 * operation"*. So the kinds here cover only the three places where a caller
 * genuinely needs to know something did not happen:
 *
 * - a status probe that could not read the platform at all,
 * - a reconciliation pass whose scheduling threw,
 * - an install prompt that could not be raised.
 *
 * A **denied permission is not an exception.** Canon flow 5 is explicit:
 * *"Nothing is scheduled, silently. No error, no crash, no retry prompt."* It
 * is a state (`notificationPermission: 'denied'`), which is why it lives in
 * `PlatformState` and not here.
 */
import { type Exception, exception } from '@kro/core'

export type PlatformException =
  /** Reading permission / install / pending state failed. */
  | Exception<'statusProbeFailed'>
  /** A reconciliation pass threw while scheduling or withdrawing. */
  | Exception<'reconciliationFailed'>
  /** Withdrawing the pending alerts on sign-out threw. */
  | Exception<'withdrawalFailed'>
  /** Raising the install prompt threw. */
  | Exception<'installPromptFailed'>
  /** The permission prompt itself threw (not: the user said no). */
  | Exception<'permissionRequestFailed'>
  /** The defensive `.rejected` fallback's landing shape (`RC-26`). */
  | Exception<'unknown'>

export const PlatformExceptions = {
  statusProbeFailed: (reason: string): PlatformException =>
    exception(
      'statusProbeFailed',
      `Couldn't read this device's notification and install state: ${reason}`,
      true,
    ),

  reconciliationFailed: (reason: string): PlatformException =>
    exception(
      'reconciliationFailed',
      `Couldn't update your overdue alerts: ${reason}`,
      true,
    ),

  withdrawalFailed: (reason: string): PlatformException =>
    exception(
      'withdrawalFailed',
      `Couldn't clear the pending overdue alerts: ${reason}`,
      true,
    ),

  installPromptFailed: (reason: string): PlatformException =>
    exception(
      'installPromptFailed',
      `Couldn't open the install prompt: ${reason}`,
      true,
    ),

  permissionRequestFailed: (reason: string): PlatformException =>
    exception(
      'permissionRequestFailed',
      `Couldn't ask for notification permission: ${reason}`,
      true,
    ),

  unknown: (message: string): PlatformException =>
    exception('unknown', message, true),
} as const
