/**
 * The Day Timeline failure union (`RC-8`, `UZF-8`).
 *
 * One read feeds the pane — today's events from every Plan host — so there is
 * one real failure plus the shared `unknown` landing shape the defensive
 * `.rejected` arm needs (`RC-26`). User copy is derived per `kind` by
 * `dayTimelineExceptionCopy`, never read from `message`.
 */
import { type Exception, assertNever, exception } from '@kro/core'

export type DayTimelineException =
  /** Today's events could not be read. */
  | Exception<'loadFailed'>
  /** The defensive `.rejected` fallback's landing shape (`RC-26`). */
  | Exception<'unknown'>

export const DayTimelineExceptions = {
  loadFailed: (reason: string): DayTimelineException =>
    exception('loadFailed', `Couldn't read today's events: ${reason}`, true),
  unknown: (message: string): DayTimelineException =>
    exception('unknown', message, true),
} as const

/** The one-line sentence the pane shows for a failure, chosen by `kind`. */
export const dayTimelineExceptionCopy = (
  failure: DayTimelineException,
): string => {
  switch (failure.kind) {
    case 'loadFailed':
      return "Couldn't load today's timeline."
    case 'unknown':
      return 'Something went wrong loading today.'
    default:
      return assertNever(failure)
  }
}

/** Narrows an unknown thrown value into this feature's `message` shape. */
export const dayTimelineExceptionMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)
