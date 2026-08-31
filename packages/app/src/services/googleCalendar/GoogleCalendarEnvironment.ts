/**
 * Where the Google **Calendar** OAuth client's credentials come from — and,
 * exactly as in `SupabaseEnvironment.ts`, where they never come from.
 *
 * ## Two Google clients, not one
 *
 * Canon runs two separate Google OAuth clients and this port keeps that split,
 * because on the web the two live in different places entirely:
 *
 * | Client | Purpose | Configured in |
 * |---|---|---|
 * | **Sign-in** | "Continue with Google" — identity only | The **Supabase dashboard** (KC-IS-#31). No variable in this repo: supabase-js runs the flow and Supabase holds the secret. |
 * | **Calendar** | The `calendar` scope, refresh tokens, event read/write | The three variables below, read **server-side only**. |
 *
 * They must not be merged. The sign-in grant carries no calendar scope, and the
 * calendar grant is an *authorization-code* flow with a refresh token that never
 * touches a browser — so it needs a client **secret**, which a Supabase-managed
 * sign-in client would never hand this app.
 *
 * ## None of these is `NEXT_PUBLIC_`
 *
 * That is the load-bearing difference from `SupabaseEnvironment`. The Supabase
 * anon key is *publishable* and is deliberately inlined into the browser bundle;
 * every variable here is a **secret** or key material, so it is read only where
 * `process.env` is the real server object — inside `apps/web`'s route handlers.
 * Next.js does not inline a non-`NEXT_PUBLIC_` variable, so a client bundle that
 * somehow reached this reader would see `undefined` and land on `unconfigured`:
 * the failure mode is a disabled integration, never a leaked secret (`SEC-5`).
 *
 * ## Missing configuration is a state, not a crash
 *
 * The issue is explicit: *missing env = integration cleanly `unconfigured`, a
 * supported state*. A developer cloning this repo has no Google Cloud project,
 * and a preview deploy may not have been given the variables yet. Both must
 * still run the app — Google simply reports itself unavailable, exactly the way
 * Supabase does. So the reader answers a **discriminated outcome** (`RC-24`)
 * naming the variables that were absent, never a half-built config and never a
 * throw.
 *
 * `missing` carries variable **names**, never values, so an error surfaced to a
 * user or written to a log cannot leak key material (`SEC-1`, `SEC-5`).
 */
import type { EnvironmentProvider } from '../supabase/SupabaseEnvironment'

/**
 * The variable names, as data.
 *
 * Deliberately camelCase **keys**: the repo's credential guard refuses any
 * SCREAMING_CASE identifier containing "secret" that is assigned a literal, and
 * a top-level constant holding this variable's *name* would trip it even though
 * a name is not a credential. Keeping the names inside one object avoids
 * teaching the guard an exception it should not have.
 */
export const googleCalendarEnvironmentVariableNames = {
  /** The calendar OAuth client id. Not a secret, but not public either. */
  clientId: 'GOOGLE_CLIENT_ID',
  /** The calendar OAuth client secret. Never leaves the server. */
  clientSecret: 'GOOGLE_CLIENT_SECRET',
  /**
   * Key material for sealing the refresh-token cookie (`GoogleTokenVault`).
   * Generate with `openssl rand -base64 32`.
   */
  tokenKey: 'GOOGLE_CALENDAR_TOKEN_KEY',
  /**
   * The redirect URI registered on the calendar OAuth client. **Optional**:
   * when unset the flow derives `<request origin>/api/google/callback`, which
   * is what a preview deployment needs. Set it explicitly when the public
   * origin differs from the origin the browser reached (a proxy, a custom
   * domain), because Google matches the registered value byte for byte.
   */
  redirectUri: 'GOOGLE_CALENDAR_REDIRECT_URI',
} as const

/** The three that must be present, in the order an error should list them. */
export const requiredGoogleCalendarVariables: readonly string[] = [
  googleCalendarEnvironmentVariableNames.clientId,
  googleCalendarEnvironmentVariableNames.clientSecret,
  googleCalendarEnvironmentVariableNames.tokenKey,
]

/** A resolved calendar client. Every field is non-empty by construction. */
export interface GoogleCalendarConfiguration {
  readonly clientId: string
  readonly clientSecret: string
  readonly tokenKey: string
  /** `null` when the flow should derive it from the request origin. */
  readonly redirectUri: string | null
}

/**
 * The reader's answer — one discriminated field, never a `config | null` beside
 * an `error` (`RC-24`, `UZF-9`).
 */
export type GoogleCalendarEnvironment =
  | {
      readonly kind: 'configured'
      readonly configuration: GoogleCalendarConfiguration
    }
  /** `missing` names the variables that were absent, blank, or unusable. */
  | { readonly kind: 'unconfigured'; readonly missing: readonly string[] }

/**
 * Reads a variable, treating a blank or whitespace-only value as absent — what
 * a `.env` line with nothing after the `=` produces, and what a CI secret that
 * failed to interpolate produces.
 */
const presentValue = (
  environment: EnvironmentProvider,
  name: string,
): string | null => {
  const raw = environment.read(name)
  if (raw === undefined) return null
  const trimmed = raw.trim()
  return trimmed.length === 0 ? null : trimmed
}

/**
 * Whether a string is a usable absolute redirect URI.
 *
 * A malformed value is reported as *missing* rather than as its own case, for
 * the same reason `SupabaseEnvironment` gives: the operator's fix is identical
 * — set the variable correctly — and a second case would widen the union every
 * caller has to switch over (`RC-9`).
 */
const isUsableRedirectUri = (candidate: string): boolean => {
  try {
    const parsed = new URL(candidate)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * Resolve the calendar client from an environment.
 *
 * Never throws, never logs, and never puts a value into a message.
 */
export const googleCalendarEnvironmentFrom = (
  environment: EnvironmentProvider,
): GoogleCalendarEnvironment => {
  const names = googleCalendarEnvironmentVariableNames
  const clientId = presentValue(environment, names.clientId)
  const clientSecret = presentValue(environment, names.clientSecret)
  const tokenKey = presentValue(environment, names.tokenKey)
  const redirectUri = presentValue(environment, names.redirectUri)

  const missing: string[] = []
  if (clientId === null) missing.push(names.clientId)
  if (clientSecret === null) missing.push(names.clientSecret)
  if (tokenKey === null) missing.push(names.tokenKey)
  // Present but unusable is still "set this correctly".
  if (redirectUri !== null && !isUsableRedirectUri(redirectUri)) {
    missing.push(names.redirectUri)
  }

  if (
    clientId === null ||
    clientSecret === null ||
    tokenKey === null ||
    missing.length > 0
  ) {
    return { kind: 'unconfigured', missing }
  }

  return {
    kind: 'configured',
    configuration: { clientId, clientSecret, tokenKey, redirectUri },
  }
}

/**
 * The ambient server environment.
 *
 * Read structurally, exactly as `SupabaseEnvironment.processEnvironment` is and
 * for the same reason: this package compiles with `types: []`, so there is no
 * `process` in its type universe. Unlike Supabase's reader there is **no**
 * static-member-expression table here, because none of these variables is
 * `NEXT_PUBLIC_` — there is nothing for the bundler to inline, and a runtime
 * with no `process` (a browser) correctly answers `undefined` for every one.
 * That is the desired shape: the browser can only ever see `unconfigured`.
 */
export const googleCalendarProcessEnvironment: EnvironmentProvider = {
  read: (name) => {
    const host = globalThis as {
      readonly process?: {
        readonly env?: Readonly<Record<string, string | undefined>>
      }
    }
    return host.process?.env?.[name]
  },
}
