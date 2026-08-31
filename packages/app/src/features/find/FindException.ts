/**
 * The Find/Tasks surface's typed failure union (`RC-8`, `UZF-8`).
 *
 * Canon spreads these across `FindFeature`'s silent lens failures and
 * `TasksFeature`'s `OpError`/`onFailedDeleting`/`onFailedMarking` arms. They
 * are folded into **one** union here for `RC-24`'s reason: each surface carries
 * a single `load` lifecycle field, and a field typed as a union of unions would
 * let a reader believe a fetch failure and an operation failure can coexist.
 *
 * `recoverable` says whether the surface should offer a retry: a failed write
 * can be retried, an operation aimed at a row that is no longer in the pool
 * cannot (retrying looks the same row up and misses again).
 */
import { type Exception, exception } from '@kro/core'

export type FindException =
  /** The vista's fetch failed. Canon keeps the previous rows and clears the spinner. */
  | Exception<'fetchFailed'>
  /** One row operation (complete, defer, delete, archive…) failed to persist. */
  | Exception<'operationFailed'>
  /** A bulk delete-all / archive-all could not finish every row. */
  | Exception<'bulkOperationFailed'>
  /** The operation names a row that is not in the installed pool — a stale tap. */
  | Exception<'endeavorNotFound'>
  /** The defensive `.rejected` fallback's landing shape (`RC-26`). */
  | Exception<'unknown'>

export const FindExceptions = {
  fetchFailed: (reason: string): FindException =>
    exception('fetchFailed', `Couldn't load your endeavors: ${reason}`, true),

  operationFailed: (reason: string): FindException =>
    exception('operationFailed', `Couldn't save that change: ${reason}`, true),

  bulkOperationFailed: (reason: string): FindException =>
    exception(
      'bulkOperationFailed',
      `Couldn't finish that on every visible endeavor: ${reason}`,
      true,
    ),

  endeavorNotFound: (id: string): FindException =>
    exception(
      'endeavorNotFound',
      `No endeavor with id '${id}' is on this surface.`,
      false,
    ),

  unknown: (message: string): FindException =>
    exception('unknown', message, true),
} as const

/** Narrows an unknown thrown value into this feature's `message` shape. */
export const findExceptionMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)
