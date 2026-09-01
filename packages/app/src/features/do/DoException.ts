/**
 * The Do surface's typed failure union (`RC-8`, `UZF-8`).
 *
 * Canon declares three separate enums at the head of `Kro/Application/Do/
 * DoProducer.swift` — `DoTuningException`, `DoClearExpiredException` and
 * `DoEndeavorsFetchException`. They are folded into **one** union here for the
 * reason `RC-24` gives: the slice carries a single `load` lifecycle field, and
 * a field typed as a union of three unions would let a reader believe a
 * clear-expired failure and a fetch failure can coexist. One union, one
 * `kind` discriminant, one exhaustive `switch` (`RC-9`).
 *
 * Every member keeps canon's own copy verbatim, and `recoverable` says whether
 * the surface should offer a retry — the two mutation failures are recoverable
 * (the user can try again), a malformed persisted row is not (retrying reads
 * the same bad row).
 */
import { type Exception, exception } from '@kro/core'

export type DoException =
  /** Reading the Do preferences failed. Canon `DoTuningException.loadFailed`. */
  | Exception<'preferencesLoadFailed'>
  /** The whole-day read failed. Canon `DoEndeavorsFetchException.loadFailed`. */
  | Exception<'fetchFailed'>
  /** Clear Expired could not close every target. Canon `.mutationFailed`. */
  | Exception<'clearExpiredMutationFailed'>
  /** Targets closed, but the follow-up refetch failed. Canon `.refreshFailed`. */
  | Exception<'clearExpiredRefreshFailed'>
  /** Persisting one completion failed. */
  | Exception<'markCompleteFailed'>
  /** The completed endeavor is not in the pool — a stale card key. */
  | Exception<'endeavorNotFound'>
  /** The defensive `.rejected` fallback's landing shape (`RC-26`). */
  | Exception<'unknown'>

export const DoExceptions = {
  preferencesLoadFailed: (reason: string): DoException =>
    exception(
      'preferencesLoadFailed',
      `Couldn't load your Do preferences: ${reason}`,
      true,
    ),

  fetchFailed: (reason: string): DoException =>
    exception('fetchFailed', `Couldn't refresh the Do screen: ${reason}`, true),

  clearExpiredMutationFailed: (): DoException =>
    exception(
      'clearExpiredMutationFailed',
      "Couldn't clear every expired endeavor.",
      true,
    ),

  clearExpiredRefreshFailed: (): DoException =>
    exception(
      'clearExpiredRefreshFailed',
      "Expired endeavors were cleared, but today's occurrences couldn't be refreshed.",
      true,
    ),

  markCompleteFailed: (reason: string): DoException =>
    exception(
      'markCompleteFailed',
      `Couldn't save that completion: ${reason}`,
      true,
    ),

  endeavorNotFound: (id: string): DoException =>
    exception(
      'endeavorNotFound',
      `No endeavor with id '${id}' is on the Do surface.`,
      false,
    ),

  unknown: (message: string): DoException =>
    exception('unknown', message, true),
} as const
