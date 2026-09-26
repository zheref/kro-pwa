/**
 * The Day Progress failure union (`RC-8`, `UZF-8`).
 *
 * One read feeds the whole screen, so there is one real failure — the local
 * store could not be read — plus the shared `unknown` landing shape the
 * defensive `.rejected` arm needs (`RC-26`). User copy is derived per `kind`
 * by `dayProgressExceptionCopy`, never read from `message`.
 */
import { type Exception, assertNever, exception } from '@kro/core'

export type DayProgressException =
  /** The on-device store could not be read. */
  | Exception<'loadFailed'>
  /** The defensive `.rejected` fallback's landing shape (`RC-26`). */
  | Exception<'unknown'>

export const DayProgressExceptions = {
  loadFailed: (reason: string): DayProgressException =>
    exception('loadFailed', `Couldn't read your activity: ${reason}`, true),
  unknown: (message: string): DayProgressException =>
    exception('unknown', message, true),
} as const

/** The user-facing sentence for a failure, chosen by `kind` (`RC-8`). */
export const dayProgressExceptionCopy = (
  failure: DayProgressException,
): string => {
  switch (failure.kind) {
    case 'loadFailed':
      return "Couldn't load your activity for this day."
    case 'unknown':
      return 'Something went wrong loading your day.'
    default:
      return assertNever(failure)
  }
}

/** Narrows an unknown thrown value into this feature's `message` shape. */
export const dayProgressExceptionMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)
