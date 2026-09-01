/**
 * SCAFFOLDING — the demo feature's `…Exception` union (`RC-8`) and the worked
 * example of the shape every real feature union copies.
 *
 * Three things are load-bearing here for feature children:
 *   1. the union is **closed** — every failure the feature can surface is a
 *      member, so state never holds a raw `Error` or a bare `string`;
 *   2. members are built by **factories**, never by literals scattered across
 *      Producers, so the copy and the `recoverable` flag live in one place; and
 *   3. user-facing copy is derived by a `switch` closed with `assertNever`
 *      (`RC-9`) — adding a member is a compile error until the copy is written.
 */
import { assertNever } from '../library/assertNever'
import { type Exception, exception } from '../library/exception'

export type GreetingException =
  | Exception<'offline'>
  | Exception<'notFound'>
  | Exception<'unauthorized'>
  | Exception<'malformed'>
  | Exception<'unknown'>

export const GreetingExceptions = {
  offline: (): GreetingException =>
    exception('offline', 'The greeting service is unreachable.', true),

  notFound: (): GreetingException =>
    exception(
      'notFound',
      'The greeting service has no greeting for that recipient.',
      false,
    ),

  unauthorized: (): GreetingException =>
    exception(
      'unauthorized',
      'The greeting service refused the request.',
      false,
    ),

  malformed: (detail: string): GreetingException =>
    exception('malformed', detail, false),

  unknown: (message: string): GreetingException =>
    exception('unknown', message, true),
}

/**
 * User-facing copy per exception kind. Lives in the platform-free tier so both a
 * DOM surface and a headless test read the same sentence, and is the reference
 * for `RC-9`: the `default` arm is `assertNever`, so a new union member fails
 * `tsc` here before it can reach a screen untranslated.
 */
export function greetingExceptionCopy(value: GreetingException): string {
  switch (value.kind) {
    case 'offline':
      return 'You are offline — the greeting will load when you reconnect.'
    case 'notFound':
      return 'We could not find a greeting for that name.'
    case 'unauthorized':
      return 'You are not allowed to read that greeting.'
    case 'malformed':
      return 'That greeting arrived in a shape we do not understand.'
    case 'unknown':
      return 'Something went wrong loading the greeting.'
    default:
      return assertNever(value)
  }
}
