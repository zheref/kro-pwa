/**
 * Where the Supabase project's URL and anon key come from — and, just as
 * importantly, where they never come from.
 *
 * `SEC-1` is the whole reason this file exists rather than a `createClient(...)`
 * call with two string literals in it: **no credential is written into the
 * source tree**, so the only way a build learns which project it talks to is the
 * environment. The two variables are `NEXT_PUBLIC_`-prefixed because the browser
 * genuinely needs them — the anon key is a *publishable* key whose authority is
 * whatever Row Level Security grants an anonymous caller (`SEC-6`), not a
 * secret. The service-role key, which is a secret, is never read here, never
 * named here, and has no business in a client bundle at all.
 *
 * ## Missing configuration is a state, not a crash
 *
 * The issue is explicit: *missing env = auth features cleanly unavailable, not a
 * crash*. A developer cloning this repo, a preview deploy that has not been
 * given the variables yet, and a server render that never sees `NEXT_PUBLIC_*`
 * at all are three routine situations, and in all three the app must still run
 * local-only (the epic's `authenticationEnforced` is OFF — signed-out use is the
 * supported mode, not a degraded one). So the reader answers a **discriminated
 * outcome** (`RC-24`) rather than throwing or returning a half-built config:
 * `configured` carries both values, `unconfigured` names exactly which variables
 * were missing so the operator can fix it in one pass.
 *
 * ## Why the environment arrives as a port
 *
 * `@kro/app` compiles with `types: []` — there is no `process` in its type
 * universe, and there is deliberately no `next/config` either (`RC-40`). An
 * injected `EnvironmentProvider` is therefore both the architecturally correct
 * shape (`RC-47`: synchronous, cheap, no `Promise`) and the only one that
 * type-checks. It also makes every test in this package state the environment it
 * is asking about instead of mutating a global that the next test inherits.
 */

/**
 * A synchronous read of one environment variable — `UZF-16`'s Provider, not a
 * Service: it cannot fail, cannot block and returns no `Promise` (`RC-47`).
 */
export interface EnvironmentProvider {
  /** The variable's value, or `undefined` when it is unset. */
  read(name: string): string | undefined
}

/** The project URL variable. Public by design — it is a hostname. */
export const SUPABASE_URL_VARIABLE = 'NEXT_PUBLIC_SUPABASE_URL'

/**
 * The **anon** (publishable) key variable. Its authority is whatever RLS grants
 * an anonymous caller; it is not the service-role key and must never be one.
 */
export const SUPABASE_ANON_KEY_VARIABLE = 'NEXT_PUBLIC_SUPABASE_ANON_KEY'

/** Both variables, in the order an error message should list them. */
export const supabaseEnvironmentVariables: readonly string[] = [
  SUPABASE_URL_VARIABLE,
  SUPABASE_ANON_KEY_VARIABLE,
]

/** A resolved project. Both fields are non-empty by construction. */
export interface SupabaseConfiguration {
  readonly url: string
  readonly anonKey: string
}

/**
 * The reader's answer — one discriminated field, never a `config | null` beside
 * an `error` (`RC-24`, `UZF-9`).
 */
export type SupabaseAvailability =
  | { readonly kind: 'configured'; readonly configuration: SupabaseConfiguration }
  /** `missing` names the variables that were absent, blank, or unusable. */
  | { readonly kind: 'unconfigured'; readonly missing: readonly string[] }

/**
 * Reads a variable, treating a blank or whitespace-only value as absent.
 *
 * An empty string is what a `.env` line with nothing after the `=` produces, and
 * what a CI secret that failed to interpolate produces. Both mean "not
 * configured"; letting either through would build a client that fails on its
 * first request with an opaque transport error instead of failing here with the
 * variable's name.
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
 * Whether a string is a usable Supabase project URL.
 *
 * `new URL(...)` accepts far more than an HTTP endpoint (`mailto:`, `file:`,
 * bare `foo:bar`), so the protocol is checked explicitly. A misconfigured URL is
 * reported as *missing* rather than as its own case on purpose: the operator's
 * fix is the same — set the variable correctly — and a second case would only
 * widen the surface every caller has to switch over (`RC-9`).
 */
const isUsableProjectUrl = (candidate: string): boolean => {
  try {
    const parsed = new URL(candidate)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * Resolve the project from an environment.
 *
 * Never throws, never logs, and never puts either value into a message — the
 * `missing` list carries variable **names**, so an error surfaced to a user or a
 * log line cannot leak a key (`SEC-1`, `SEC-5`).
 */
export const supabaseAvailabilityFrom = (
  environment: EnvironmentProvider,
): SupabaseAvailability => {
  const url = presentValue(environment, SUPABASE_URL_VARIABLE)
  const anonKey = presentValue(environment, SUPABASE_ANON_KEY_VARIABLE)

  const missing: string[] = []
  if (url === null || !isUsableProjectUrl(url)) missing.push(SUPABASE_URL_VARIABLE)
  if (anonKey === null) missing.push(SUPABASE_ANON_KEY_VARIABLE)

  if (url === null || anonKey === null || missing.length > 0) {
    return { kind: 'unconfigured', missing }
  }
  return { kind: 'configured', configuration: { url, anonKey } }
}

/** An `EnvironmentProvider` over a plain record — the shape every test uses. */
export const makeRecordEnvironment = (
  values: Readonly<Record<string, string | undefined>>,
): EnvironmentProvider => ({
  read: (name) => values[name],
})

/**
 * The ambient process environment, read defensively.
 *
 * This package has no Node types (`types: []`) and runs in three places that
 * disagree about what `process` is: the browser (where the bundler has already
 * substituted `process.env.NEXT_PUBLIC_*` with literals), the Next.js server
 * runtime (where `process.env` is real), and Vitest. The read is therefore
 * structural and guarded — a runtime with no `process` answers `undefined` for
 * every variable, which lands on `unconfigured`, which is a supported state.
 *
 * **Why the whole record is not simply spread:** in the browser the bundler
 * replaces *individual* `process.env.X` member expressions at build time; there
 * is no runtime object to enumerate. Reading by name keeps this correct on both
 * sides of that substitution.
 */
/**
 * The two public variables read via LITERAL member expressions: Next.js
 * inlines `process.env.NEXT_PUBLIC_*` only where it appears as a static
 * member access, so a dynamic `env[name]` read returns `undefined` in
 * client bundles even when the variable is set at build time.
 */
const staticPublicEnvironment: Readonly<Record<string, string | undefined>> = {
  NEXT_PUBLIC_SUPABASE_URL:
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : undefined,
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      : undefined,
}

export const processEnvironment: EnvironmentProvider = {
  read: (name) => {
    if (name in staticPublicEnvironment) return staticPublicEnvironment[name]
    const host = globalThis as {
      readonly process?: { readonly env?: Readonly<Record<string, string | undefined>> }
    }
    return host.process?.env?.[name]
  },
}
