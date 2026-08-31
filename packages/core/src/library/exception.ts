/**
 * The shape every UZF `…Exception` union member shares (`RC-8`).
 *
 * State and completion events never carry a raw `string` or `Error` to describe
 * a user-facing problem — they carry a discriminated `…Exception`. Each feature
 * declares its own closed union in `models/…Exception.ts`, built from this shape
 * plus a factory object, e.g.
 *
 * ```ts
 * export type GreetingException =
 *   | Exception<'offline'>
 *   | Exception<'notFound'>
 *
 * export const GreetingExceptions = {
 *   offline: () => exception('offline', 'You are offline.', true),
 *   notFound: () => exception('notFound', 'No greeting for that name.', false),
 * }
 * ```
 *
 * `kind` is the discriminant a `switch` narrows on (always closed by
 * `assertNever`, `RC-9`), `message` is developer-facing detail for logs, and
 * `recoverable` says whether the surface should offer a retry affordance.
 * User-facing copy is derived per `kind`, never read from `message`.
 */
export interface Exception<Kind extends string = string> {
  readonly kind: Kind
  readonly message: string
  readonly recoverable: boolean
}

/** Builds one member of a feature's `…Exception` union. */
export const exception = <Kind extends string>(
  kind: Kind,
  message: string,
  recoverable = true,
): Exception<Kind> => ({ kind, message, recoverable })

/**
 * The shared `unknown` fallback every feature union is expected to include, so a
 * defensive `.rejected` reducer arm has a typed value to shift into (`RC-26`).
 */
export const unknownException = (message: string): Exception<'unknown'> =>
  exception('unknown', message, true)

/**
 * Normalizes an arbitrary caught value into the `unknown` exception. Mappers call
 * this as the last arm of `toException`; it is never a substitute for mapping a
 * recognized failure to its own `kind`.
 */
export const toUnknownException = (error: unknown): Exception<'unknown'> => {
  if (error instanceof Error) return unknownException(error.message)
  if (typeof error === 'string') return unknownException(error)
  return unknownException(String(error))
}
