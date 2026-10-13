/**
 * The early-access flow's closed `…Exception` union (`RC-8`).
 *
 * `message` is the user-facing sentence, written once per kind in the factory
 * below — a view reads it, it never assembles its own. `unknown` takes an
 * optional sentence for the few call sites that know a better one (the route's
 * "that was not JSON"); the Mapper never passes a caught error's own text, so
 * a transport error string can never reach the page.
 */
import { assertNever } from '../library/assertNever'
import { type Exception, exception } from '../library/exception'

export type EarlyAccessException =
  | Exception<'invalidEmail'>
  | Exception<'alreadyJoined'>
  | Exception<'offline'>
  | Exception<'unavailable'>
  | Exception<'unknown'>

export type EarlyAccessExceptionKind = EarlyAccessException['kind']

export const EarlyAccessExceptions = {
  invalidEmail: (): EarlyAccessException =>
    exception(
      'invalidEmail',
      'That email address does not look right — check it and try again.',
      true,
    ),

  alreadyJoined: (): EarlyAccessException =>
    exception(
      'alreadyJoined',
      'You are already on the list — we will write when Kro is ready for you.',
      false,
    ),

  offline: (): EarlyAccessException =>
    exception(
      'offline',
      'You appear to be offline. Reconnect and try again.',
      true,
    ),

  unavailable: (): EarlyAccessException =>
    exception(
      'unavailable',
      'Early access sign-up is not open on this site yet. Please try again later.',
      true,
    ),

  unknown: (
    message = 'Something went wrong joining the list. Please try again.',
  ): EarlyAccessException => exception('unknown', message, true),

  /**
   * Rebuilds the exception for a wire `kind` (the route's error body), or
   * `null` when the kind is not one this union declares.
   */
  fromKind(kind: unknown): EarlyAccessException | null {
    if (typeof kind !== 'string') return null
    switch (kind) {
      case 'invalidEmail':
        return EarlyAccessExceptions.invalidEmail()
      case 'alreadyJoined':
        return EarlyAccessExceptions.alreadyJoined()
      case 'offline':
        return EarlyAccessExceptions.offline()
      case 'unavailable':
        return EarlyAccessExceptions.unavailable()
      case 'unknown':
        return EarlyAccessExceptions.unknown()
      default:
        return null
    }
  },

  /** The HTTP status `/api/early-access` answers a failure of this kind with. */
  httpStatus(value: EarlyAccessException): number {
    switch (value.kind) {
      case 'invalidEmail':
        return 400
      case 'alreadyJoined':
        return 409
      case 'unavailable':
        return 503
      case 'offline':
        // Server-side "offline" means the sink was unreachable.
        return 502
      case 'unknown':
        return 500
      default:
        return assertNever(value)
    }
  },
}
