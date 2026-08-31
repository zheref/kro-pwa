/**
 * The capture/Inbox surface's typed failure union (`RC-8`, `UZF-8`).
 *
 * Canon declares no exception type for this flow at all: `MainFeature`'s
 * capture branch cannot fail (it appends to an in-memory array), and its
 * persistence effects swallow their errors. On web the store *is* the host —
 * a capture that does not reach IndexedDB has not happened — so every boundary
 * this feature crosses gets a named failure rather than a silent one.
 *
 * One union, one `kind` discriminant, one exhaustive `switch` (`RC-9`), for the
 * reason `RC-24` gives: the slice carries a single `load` lifecycle field, and
 * a field typed as a union of several unions would let a reader believe a
 * capture failure and a scheduling failure can coexist.
 *
 * `recoverable` says whether the surface should offer a retry. Every write
 * failure is recoverable — the user can press the button again — while a
 * missing endeavor is not: the row is gone, and retrying reads the same
 * absence.
 */
import { type Exception, exception } from '@kro/core'

export type CaptureException =
  /** Reading the endeavor pool or the last-used destination failed. */
  | Exception<'contextLoadFailed'>
  /** The prompt was submitted while something still blocked it. */
  | Exception<'invalidCapture'>
  /** Persisting the captured endeavor failed — nothing was captured. */
  | Exception<'captureFailed'>
  /** The row an operation names is not in the pool — a stale row id. */
  | Exception<'endeavorNotFound'>
  /** Persisting an Add-for-Today scheduling failed. */
  | Exception<'schedulingFailed'>
  /** Restoring the prior scheduling failed; the endeavor stays scheduled. */
  | Exception<'undoFailed'>
  /** A row operation this surface does not implement was requested. */
  | Exception<'unsupportedOperation'>
  /** Persisting a row operation (complete / delete) failed. */
  | Exception<'operationFailed'>
  /** The defensive `.rejected` fallback's landing shape (`RC-26`). */
  | Exception<'unknown'>

export const CaptureExceptions = {
  contextLoadFailed: (reason: string): CaptureException =>
    exception('contextLoadFailed', `Couldn't open your Inbox: ${reason}`, true),

  invalidCapture: (blockedReason: string): CaptureException =>
    exception('invalidCapture', blockedReason, true),

  captureFailed: (reason: string): CaptureException =>
    exception('captureFailed', `Couldn't save that: ${reason}`, true),

  endeavorNotFound: (id: string): CaptureException =>
    exception(
      'endeavorNotFound',
      `No endeavor with id '${id}' is in the Inbox.`,
      false,
    ),

  schedulingFailed: (reason: string): CaptureException =>
    exception(
      'schedulingFailed',
      `Couldn't schedule that for today: ${reason}`,
      true,
    ),

  undoFailed: (reason: string): CaptureException =>
    exception('undoFailed', `Couldn't undo that scheduling: ${reason}`, true),

  unsupportedOperation: (operation: string): CaptureException =>
    exception(
      'unsupportedOperation',
      `The Inbox can't perform '${operation}' here.`,
      false,
    ),

  operationFailed: (reason: string): CaptureException =>
    exception('operationFailed', `Couldn't apply that action: ${reason}`, true),

  unknown: (message: string): CaptureException =>
    exception('unknown', message, true),
} as const
