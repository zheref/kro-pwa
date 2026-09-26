/**
 * The Endeavor Activity failure union (`RC-8`, `UZF-8`) — closed, with its
 * factory. User copy is derived from `kind` here, in the domain tier, and the
 * Fragment only ever renders `message`.
 */
import { type Exception, assertNever, exception } from '@kro/core'

export type EndeavorActivityException =
  /** The endeavor asked about is not stored on this device. */
  | Exception<'endeavorNotFound'>
  /** Reading the on-device store failed. */
  | Exception<'loadFailed'>
  /** The defensive `.rejected` fallback's landing shape (`RC-26`). */
  | Exception<'unknown'>

export const EndeavorActivityExceptions = {
  endeavorNotFound: (id: string): EndeavorActivityException =>
    exception(
      'endeavorNotFound',
      `No endeavor with id '${id}' is stored on this device.`,
      false,
    ),

  loadFailed: (reason: string): EndeavorActivityException =>
    exception('loadFailed', `Couldn't load activity: ${reason}`, true),

  unknown: (message: string): EndeavorActivityException =>
    exception('unknown', message, true),
}

/**
 * The user-facing line for a failed read — derived from `kind`, never from
 * `message`, which carries storage internals for logs and tests (`RC-8`).
 */
export const endeavorActivityFailureCopy = (
  exception: EndeavorActivityException,
): string => {
  switch (exception.kind) {
    case 'endeavorNotFound':
      return 'This endeavor is no longer on this device.'
    case 'loadFailed':
      return "Couldn't load this endeavor's activity."
    case 'unknown':
      return 'Something went wrong loading this activity.'
    default:
      return assertNever(exception)
  }
}
