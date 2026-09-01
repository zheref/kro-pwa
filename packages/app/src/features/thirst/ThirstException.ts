/**
 * The Thirst vote surface's typed failure union (`RC-8`, `UZF-8`) — canon
 * `ThirstException` (`Kro/Dependencies/ThirstClient.swift`), minus
 * `.alreadyVoted`: this port's `castVote`/`hasVoted` never surface that case
 * as a failure — a repeat vote converges quietly (canon's own comment: *"A
 * second vote … resolves quietly as already-voted rather than throwing"*),
 * so there is nothing here for it to carry.
 *
 * `ThirstService`'s operations throw these directly where they know the
 * answer (no signed-in session), exactly as `AuthService`/`AuthException`
 * does; `toThirstException` below is the single translation site for
 * everything else (`RC-30`).
 */
import {
  type Exception,
  assertNever,
  exception,
  toUnknownException,
} from '@kro/core'

export type ThirstException =
  /** No signed-in session — voting (and checking whether one already voted)
   * needs one; the public counts read does not. */
  | Exception<'notSignedIn'>
  /** The network is unavailable. */
  | Exception<'offline'>
  /** Anything else — carries the server's message for logs. */
  | Exception<'unknown'>

export const ThirstExceptions = {
  notSignedIn: (): ThirstException =>
    exception('notSignedIn', 'Sign in to vote for upcoming features.', false),

  offline: (): ThirstException =>
    exception('offline', 'No internet connection. Please try again.', true),

  unknown: (message: string): ThirstException =>
    exception(
      'unknown',
      message.length === 0 ? 'Something went wrong while voting.' : message,
      true,
    ),
} as const

/** Every `kind` in the union, for the exhaustiveness tests and the type guard. */
export const thirstExceptionKinds: readonly ThirstException['kind'][] = [
  'notSignedIn',
  'offline',
  'unknown',
]

/** Whether an arbitrary caught value already is one of ours. */
export function isThirstException(value: unknown): value is ThirstException {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as {
    kind?: unknown
    message?: unknown
    recoverable?: unknown
  }
  return (
    typeof candidate.kind === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.recoverable === 'boolean' &&
    (thirstExceptionKinds as readonly string[]).includes(candidate.kind)
  )
}

/**
 * `ThirstClient.map` — the Service already knows `notSignedIn`; a browser
 * transport failure (opaque `TypeError`, the same signal `AuthMapper.ts`
 * reads) degrades to `offline`; everything else is `unknown`.
 */
export function toThirstException(error: unknown): ThirstException {
  if (isThirstException(error)) return error
  if (error instanceof TypeError) return ThirstExceptions.offline()
  return ThirstExceptions.unknown(toUnknownException(error).message)
}

/**
 * User-facing copy, derived from `kind` only — never from `.message`
 * (`RC-8`) — canon's `ThirstException.errorDescription`.
 */
export function thirstExceptionCopy(value: ThirstException): string {
  switch (value.kind) {
    case 'notSignedIn':
      return 'Sign in to vote for upcoming features.'
    case 'offline':
      return 'No internet connection. Please try again.'
    case 'unknown':
      return 'Something went wrong while voting.'
    default:
      return assertNever(value)
  }
}
