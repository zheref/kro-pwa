/**
 * The endeavor sync engine's typed failure union (`RC-8`, `UZF-8`).
 *
 * ## Why it sits in `features/auth/` rather than beside the engine
 *
 * Same reason as `AuthException`: `check-uzf-boundaries.mjs` refuses a
 * `services/**` import from a feature, and a Producer must be able to name the
 * exception it resolves. The engine is the Service, so the *Service imports the
 * domain's failure type* rather than the reverse. It sits in the auth feature
 * specifically because that is the slice that orchestrates cloud sync in this
 * repo — the same place canon puts it (`MainFeature` owns both the auth session
 * and the sync effects; there is no separate sync feature on either platform).
 *
 * ## What is deliberately **not** a failure here
 *
 * Two outcomes that read like errors are reported as *states* on the sync
 * report instead, because treating them as exceptions would make an ordinary
 * app launch land in a `failed` lifecycle:
 *
 * - **The flag is off.** `supabaseHosting` is OFF at `statusQuo`, exactly as in
 *   canon, so "the engine did nothing" is the shipping behaviour, not a fault.
 * - **Nobody is signed in.** Signed-out local-only use is the supported mode
 *   (`authenticationEnforced` is OFF). There is nothing to sync and nothing
 *   went wrong.
 *
 * Both are `EndeavorSyncReport.status` values. Only a genuine attempt that
 * could not complete produces one of the cases below.
 */
import { type Exception, exception } from '@kro/core'

export type EndeavorSyncException =
  /** No Supabase project is configured — the engine has no transport. */
  | Exception<'unavailable'>
  /** A cloud operation was attempted with no signed-in session. */
  | Exception<'notSignedIn'>
  /**
   * The account's `owners` row could not be read or created, so no endeavor
   * row can carry the `owner_id` its RLS policy requires.
   */
  | Exception<'ownerUnresolved'>
  /** Reading or writing the local store failed mid-sweep. */
  | Exception<'localStoreFailed'>
  /** The cloud refused the read. */
  | Exception<'pullFailed'>
  /** The cloud refused every write in the sweep. */
  | Exception<'pushFailed'>
  /** The defensive `.rejected` fallback's landing shape (`RC-26`). */
  | Exception<'unknown'>

export const EndeavorSyncExceptions = {
  unavailable: (missing: readonly string[] = []): EndeavorSyncException =>
    exception(
      'unavailable',
      missing.length === 0
        ? 'No Kro Cloud project is configured for this build.'
        : `No Kro Cloud project is configured: ${missing.join(', ')} unset.`,
      false,
    ),

  notSignedIn: (): EndeavorSyncException =>
    exception('notSignedIn', 'No signed-in session.', false),

  ownerUnresolved: (userId: string): EndeavorSyncException =>
    exception(
      'ownerUnresolved',
      `Could not resolve a Kro Cloud owner row for account '${userId}'.`,
      true,
    ),

  localStoreFailed: (reason: string): EndeavorSyncException =>
    exception('localStoreFailed', `On-device storage failed: ${reason}`, true),

  pullFailed: (reason: string): EndeavorSyncException =>
    exception('pullFailed', `Couldn't read from Kro Cloud: ${reason}`, true),

  pushFailed: (reason: string): EndeavorSyncException =>
    exception('pushFailed', `Couldn't write to Kro Cloud: ${reason}`, true),

  unknown: (message: string): EndeavorSyncException =>
    exception('unknown', message.length === 0 ? 'Unexpected error.' : message, true),
} as const

/** Every `kind`, for the exhaustiveness test and the recogniser below. */
export const endeavorSyncExceptionKinds: readonly EndeavorSyncException['kind'][] = [
  'unavailable',
  'notSignedIn',
  'ownerUnresolved',
  'localStoreFailed',
  'pullFailed',
  'pushFailed',
  'unknown',
]

/** Whether an arbitrary caught value already is one of ours. */
export const isEndeavorSyncException = (
  value: unknown,
): value is EndeavorSyncException => {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as { kind?: unknown; message?: unknown; recoverable?: unknown }
  return (
    typeof candidate.kind === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.recoverable === 'boolean' &&
    (endeavorSyncExceptionKinds as readonly string[]).includes(candidate.kind)
  )
}

/**
 * The single translation site for anything the transport or the local store
 * throws (`RC-30`). Values this engine already tagged pass through untouched.
 */
export const endeavorSyncExceptionFrom = (
  error: unknown,
  fallback: (reason: string) => EndeavorSyncException = EndeavorSyncExceptions.unknown,
): EndeavorSyncException => {
  if (isEndeavorSyncException(error)) return error
  if (error instanceof TypeError) {
    return fallback('the network is unavailable')
  }
  return fallback(error instanceof Error ? error.message : String(error))
}
