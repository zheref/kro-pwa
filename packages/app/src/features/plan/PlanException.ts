/**
 * The Plan feature's closed exception union (`RC-8`).
 *
 * `State` never carries a raw `string` or `Error` for a user-facing problem;
 * it carries one of these, and the copy a surface shows is derived from `kind`
 * here rather than assembled in a view.
 *
 * ## Why a failed window carries the day it was for
 *
 * Canon's buffer failures are `PlanTimelineBufferException.loadFailed(center:)`
 * and `PlanGoogleBufferException.unauthorized(center:)` — the *window* travels
 * with the failure. The reason is the activity signal: a superseded response
 * must settle only its **own** in-flight marker, never the marker belonging to
 * the request that replaced it. Canon says it directly: *"a failed window still
 * has to settle the in-flight marker, or the toolbar's activity spinner would
 * spin forever"*, and *"only this window's marker settles."*
 *
 * A `kind`-only exception could not express that, so `preloadFailed` carries
 * `centerDayKey`. It is the day **key** rather than a `Date` because the value
 * lands in Redux state, where a plain string is what the serializable check and
 * the cache index both want.
 */
import type { Exception } from '@kro/core'
import { assertNever, exception } from '@kro/core'
import type { PlanDayKey } from './PlanCalendar'

export type PlanException =
  /** The authoritative day's read failed. Retryable. */
  | Exception<'dayLoadFailed'>
  | Exception<'matrixLoadFailed'>
  /** A read-ahead window failed. Carries the day it was centred on. */
  | (Exception<'preloadFailed'> & { readonly centerDayKey: PlanDayKey })
  /** A stored row could not be decoded into a domain endeavor. */
  | Exception<'malformedRow'>
  /** Anything the mapping did not recognise (`RC-26`'s defensive arm). */
  | Exception<'unknown'>

export const PlanExceptions = {
  dayLoadFailed: (message: string): PlanException =>
    exception('dayLoadFailed', message, true),
  matrixLoadFailed: (message: string): PlanException =>
    exception('matrixLoadFailed', message, true),

  preloadFailed: (
    centerDayKey: PlanDayKey,
    message: string,
  ): PlanException => ({
    ...exception('preloadFailed', message, true),
    centerDayKey,
  }),

  malformedRow: (message: string): PlanException =>
    exception('malformedRow', message, false),

  unknown: (message: string): PlanException =>
    exception('unknown', message, true),
}

/** Normalises an arbitrary caught value. The one place `unknown` is minted. */
export const planExceptionFrom = (error: unknown): PlanException => {
  if (error instanceof Error) return PlanExceptions.unknown(error.message)
  if (typeof error === 'string') return PlanExceptions.unknown(error)
  return PlanExceptions.unknown(String(error))
}

/**
 * The sentence a surface shows. Derived per `kind`, never read from `message`
 * — `message` is developer detail for a log (`RC-8`).
 */
export const planExceptionCopy = (value: PlanException): string => {
  switch (value.kind) {
    case 'dayLoadFailed':
      return "We couldn't load this day. Pull to refresh to try again."
    case 'matrixLoadFailed':
      return "We couldn't load the priority matrix. Try again."
    case 'preloadFailed':
      return "We couldn't load the days around this one."
    case 'malformedRow':
      return 'Some items on this day could not be read.'
    case 'unknown':
      return 'Something went wrong loading your plan.'
    default:
      return assertNever(value)
  }
}
