/**
 * The auth surface's typed failure union (`RC-8`, `UZF-8`) — canon
 * `KroAuthError` in `Kro/Dependencies/SupabaseAuthService.swift`, ported case
 * for case, plus the two cases the **web** adds.
 *
 * ## Why this lives in the feature and not beside the Service
 *
 * `packages/app/scripts/check-uzf-boundaries.mjs` refuses any import of a
 * `services/**` module from outside `services/`, `library/store.ts` and tests
 * (`RC-6`/`RC-21`). A Producer must name the exception it resolves, so the
 * union has to be reachable from `features/`, which puts it here — the same
 * place `TriageException` already sits, and the same direction of dependency:
 * the **Service imports the domain's failure type**, not the other way round.
 *
 * ## The Service throws these; the Producer resolves them
 *
 * `RC-33` keeps the `Result` boundary in the Producer, not in the Service. So
 * `AuthService`'s operations throw, and they throw *these values* where they
 * know the answer (an unconfigured project, a user-cancelled sheet). Everything
 * else arrives as whatever supabase-js threw and is translated exactly once, by
 * `authExceptionFrom` below — canon's `mapAuthError`, which is a message-shape
 * matcher for the same reason: GoTrue does not expose a stable machine-readable
 * code for these, so the string is what there is.
 *
 * ## Two web-only cases
 *
 * - **`unavailable`** — no Supabase project is configured (`SEC-1`: the URL and
 *   anon key come from the environment and a checkout has neither). Canon has
 *   no equivalent because the iOS build resolves its connection from a bundled
 *   resolver and `fatalError`s if it cannot. On the web, signed-out local-only
 *   use is a first-class mode (`authenticationEnforced` is OFF), so "there is
 *   no cloud here" is a *state* the UI reports, never a crash. `recoverable` is
 *   `false`: no amount of retrying fixes an unset environment variable.
 * - **`cancelled`** — canon has `userCancelled` and treats it as *not an error
 *   to show in UI* (`errorDescription` returns `nil`). Kept as a case rather
 *   than swallowed at the Service boundary, because the slice still has to stop
 *   its spinner; `authExceptionCopy` returns `null` for it, which is how the
 *   "no message" half of canon's behaviour is preserved.
 */
import { type Exception, exception } from '@kro/core'

export type AuthException =
  /** No Supabase project is configured — auth is cleanly unavailable. */
  | Exception<'unavailable'>
  /** A cloud operation was attempted with no signed-in session. */
  | Exception<'notSignedIn'>
  /** Apple returned no identity token. */
  | Exception<'noIdentityToken'>
  /** The profile row could not be created or fetched after authenticating. */
  | Exception<'userCreationFailed'>
  /** The stored session expired and refresh failed. */
  | Exception<'sessionExpired'>
  /** The user dismissed the provider's sheet — not an error to show. */
  | Exception<'cancelled'>
  /** Email or password was wrong. */
  | Exception<'invalidCredentials'>
  /** Sign-up used an email that already has an account. */
  | Exception<'emailAlreadyInUse'>
  /** The chosen password is too weak. */
  | Exception<'weakPassword'>
  /** The network is unavailable. */
  | Exception<'networkUnavailable'>
  /** The OAuth provider rejected the sign-in. */
  | Exception<'providerRejected'>
  /** The form was submitted with a field the flow requires left blank. */
  | Exception<'incompleteForm'>
  /** Anything else — carries the server's message for logs. */
  | Exception<'unknown'>

export const AuthExceptions = {
  unavailable: (missing: readonly string[] = []): AuthException =>
    exception(
      'unavailable',
      missing.length === 0
        ? 'No Kro Cloud project is configured for this build.'
        : `No Kro Cloud project is configured: ${missing.join(', ')} unset.`,
      false,
    ),

  notSignedIn: (): AuthException =>
    exception('notSignedIn', 'No signed-in session.', false),

  noIdentityToken: (): AuthException =>
    exception('noIdentityToken', 'Apple returned no identity token.', true),

  userCreationFailed: (reason: string): AuthException =>
    exception('userCreationFailed', `Account setup failed: ${reason}`, true),

  sessionExpired: (): AuthException =>
    exception('sessionExpired', 'The stored session expired.', false),

  cancelled: (): AuthException =>
    exception('cancelled', 'The sign-in sheet was dismissed.', true),

  invalidCredentials: (): AuthException =>
    exception('invalidCredentials', 'Incorrect email or password.', true),

  emailAlreadyInUse: (): AuthException =>
    exception('emailAlreadyInUse', 'That email already has an account.', true),

  weakPassword: (detail: string): AuthException =>
    exception('weakPassword', detail, true),

  networkUnavailable: (): AuthException =>
    exception('networkUnavailable', 'No internet connection.', true),

  providerRejected: (provider: string): AuthException =>
    exception('providerRejected', `${provider} sign-in was rejected.`, true),

  incompleteForm: (detail: string): AuthException =>
    exception('incompleteForm', detail, true),

  unknown: (message: string): AuthException =>
    exception(
      'unknown',
      message.length === 0 ? 'Unexpected error.' : message,
      true,
    ),
} as const

/** Every `kind` in the union, for the exhaustiveness tests and the debug list. */
export const authExceptionKinds: readonly AuthException['kind'][] = [
  'unavailable',
  'notSignedIn',
  'noIdentityToken',
  'userCreationFailed',
  'sessionExpired',
  'cancelled',
  'invalidCredentials',
  'emailAlreadyInUse',
  'weakPassword',
  'networkUnavailable',
  'providerRejected',
  'incompleteForm',
  'unknown',
]

/** Whether an arbitrary caught value already is one of ours. */
export const isAuthException = (value: unknown): value is AuthException => {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as {
    kind?: unknown
    message?: unknown
    recoverable?: unknown
  }
  return (
    typeof candidate.kind === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.recoverable === 'boolean' &&
    (authExceptionKinds as readonly string[]).includes(candidate.kind)
  )
}
