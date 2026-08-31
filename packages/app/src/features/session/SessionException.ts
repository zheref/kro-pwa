/**
 * The session feature's typed failure union (`RC-8`, `UZF-8`).
 *
 * One `kind` per failure a session lifecycle step can report. Two of them are
 * **guards** rather than I/O failures — `sessionAlreadyRunning` and
 * `noRunningSession` — and they are modelled here rather than as silent
 * returns so a caller can surface *why* nothing happened. That matters most
 * for the one-session invariant: a second start must be visibly refused, not
 * quietly ignored, or the surface that dispatched it has no way to tell the
 * refusal from a slow start.
 */
import { type Exception, exception } from '@kro/core'

export type SessionException =
  /** Reading the `session.*` preferences or the three gates failed. */
  | Exception<'preferencesLoadFailed'>
  /** Reading the stored endeavor the session launches against failed. */
  | Exception<'launchPrepareFailed'>
  /** Reading or decoding the running-session anchor failed. */
  | Exception<'anchorReadFailed'>
  /** Writing or clearing the running-session anchor failed. */
  | Exception<'anchorWriteFailed'>
  /**
   * A start was requested while a session was already running — the
   * one-session invariant, refused at the storage boundary.
   */
  | Exception<'sessionAlreadyRunning'>
  /** A lifecycle step was requested with no session in flight. */
  | Exception<'noRunningSession'>
  /** Persisting the performance row (or its parent endeavor) failed. */
  | Exception<'performanceRecordFailed'>
  /** Promoting a blank focus session into a stored endeavor failed. */
  | Exception<'promotionFailed'>
  /** Closing the backing endeavor after "Complete Task" failed. */
  | Exception<'markCompleteFailed'>
  /** The defensive `.rejected` fallback's landing shape (`RC-26`). */
  | Exception<'unknown'>

export const SessionExceptions = {
  preferencesLoadFailed: (reason: string): SessionException =>
    exception(
      'preferencesLoadFailed',
      `Couldn't load your session preferences: ${reason}`,
      true,
    ),

  launchPrepareFailed: (reason: string): SessionException =>
    exception(
      'launchPrepareFailed',
      `Couldn't open a session for that task: ${reason}`,
      true,
    ),

  anchorReadFailed: (reason: string): SessionException =>
    exception(
      'anchorReadFailed',
      `Couldn't restore your running session: ${reason}`,
      true,
    ),

  anchorWriteFailed: (reason: string): SessionException =>
    exception(
      'anchorWriteFailed',
      `Couldn't save your session's progress: ${reason}`,
      true,
    ),

  sessionAlreadyRunning: (): SessionException =>
    exception(
      'sessionAlreadyRunning',
      'A session is already running — finish or abort it before starting another.',
      false,
    ),

  noRunningSession: (): SessionException =>
    exception('noRunningSession', 'There is no session running.', false),

  performanceRecordFailed: (reason: string): SessionException =>
    exception(
      'performanceRecordFailed',
      `Couldn't record that session: ${reason}`,
      true,
    ),

  promotionFailed: (reason: string): SessionException =>
    exception('promotionFailed', `Couldn't save that change: ${reason}`, true),

  markCompleteFailed: (reason: string): SessionException =>
    exception(
      'markCompleteFailed',
      `Couldn't mark the task complete: ${reason}`,
      true,
    ),

  unknown: (message: string): SessionException =>
    exception('unknown', message, true),
} as const

/** The one `unknown` → message translation every `.rejected` arm shares. */
export const sessionExceptionMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)
