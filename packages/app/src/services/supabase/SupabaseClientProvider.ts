/**
 * The one place a `SupabaseClient` is constructed — canon's
 * `SupabaseClientManager` / `ObjectsClient.initialize()`, minus the
 * `fatalError` (see below).
 *
 * Everything that talks to Kro Cloud in this package — `AuthService`,
 * `SettingsSyncService`, the endeavor transport — takes this provider rather
 * than a client, for three reasons:
 *
 * 1. **Construction is lazy and memoised.** Building `liveThunkExtra` is module
 *    evaluation; opening a client there would make importing the store a side
 *    effect, the same objection `makeStore(extra)` exists to answer (`RC-22`)
 *    and the same one `liveLocalStore` already answers for IndexedDB.
 * 2. **An unconfigured project is a `null` client, not a throw.** Canon's
 *    `getClient()` calls `fatalError("SupabaseClient not initialized")`, which
 *    is a reasonable choice for an app whose bundle ships its own connection
 *    resolver and a wrong one for a web app that must stay fully usable
 *    signed-out with no environment at all. Every operation on top of this
 *    checks for `null` and answers a typed `unavailable` exception instead.
 * 3. **The stub returns `null` for `client()` unconditionally**, which is what
 *    makes "with the flag off, zero network calls" provable rather than
 *    asserted: a suite wired to `stubbedThunkExtra` has no client to call
 *    through even if some future edit forgets a gate.
 *
 * ## Session persistence is the browser's, deliberately
 *
 * `persistSession` + `autoRefreshToken` + `detectSessionInUrl` are on, and the
 * PKCE flow is selected. That combination is what makes the **web** OAuth flow
 * (Google, and Apple when no id token is at hand) work at all: the provider
 * redirects back with a `code` in the URL, `detectSessionInUrl` exchanges it,
 * and the session lands in storage before the app's own restore runs. Tokens
 * live in supabase-js's own storage and are never copied into Redux state,
 * never logged and never put into a URL we build (`SEC-1`, `SEC-5`) — the state
 * tier only ever sees the domain `User`.
 */
import { type SupabaseClient, createClient } from '@supabase/supabase-js'
import {
  type EnvironmentProvider,
  type SupabaseAvailability,
  processEnvironment,
  supabaseAvailabilityFrom,
} from './SupabaseEnvironment'

export interface SupabaseClientProvider {
  /** Whether a project is configured, and which variables are missing if not. */
  availability(): SupabaseAvailability
  /**
   * The client for the configured project, or `null` when there is none.
   * Memoised: repeated calls return the same instance, so one browser session
   * has one auth storage listener rather than one per operation.
   */
  client(): SupabaseClient | null
}

export interface LiveSupabaseClientProviderOptions {
  /** Defaults to the ambient process environment. Tests pass a record. */
  readonly environment?: EnvironmentProvider
}

/**
 * The live provider.
 *
 * `availability()` is re-read on every call rather than captured once, so a
 * server render (no `NEXT_PUBLIC_*`) and a browser render (substituted at build
 * time) each get the honest answer from the same module instance.
 */
export const makeLiveSupabaseClientProvider = (
  options: LiveSupabaseClientProviderOptions = {},
): SupabaseClientProvider => {
  const environment = options.environment ?? processEnvironment
  let memoised: SupabaseClient | null = null

  const availability = (): SupabaseAvailability =>
    supabaseAvailabilityFrom(environment)

  return {
    availability,
    client: () => {
      if (memoised !== null) return memoised
      const resolved = availability()
      if (resolved.kind === 'unconfigured') return null
      memoised = createClient(
        resolved.configuration.url,
        resolved.configuration.anonKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            // The redirect leg of the web OAuth flow: supabase-js exchanges the
            // `code` it finds in the URL for a session on first load.
            detectSessionInUrl: true,
            flowType: 'pkce',
          },
        },
      )
      return memoised
    },
  }
}

/** The binding `ThunkExtra` defaults to. Constructs nothing until used. */
export const liveSupabaseClientProvider: SupabaseClientProvider =
  makeLiveSupabaseClientProvider()

export interface StubbedSupabaseClientProviderOptions {
  /**
   * What `availability()` reports. Defaults to `unconfigured` with **no**
   * missing variables named — the honest description of a stub: nothing is
   * missing, there simply is no project.
   */
  readonly availability?: SupabaseAvailability
}

/**
 * The test/preview binding (`RC-33`).
 *
 * `client()` is `null` **always**, including when `availability()` is told to
 * report `configured`: a suite may need to exercise the "a project is
 * configured" branch, and it must be impossible for that to produce a real
 * client. There is no code path from this module to the network.
 */
export const makeStubbedSupabaseClientProvider = (
  options: StubbedSupabaseClientProviderOptions = {},
): SupabaseClientProvider => {
  const availability: SupabaseAvailability = options.availability ?? {
    kind: 'unconfigured',
    missing: [],
  }
  return {
    availability: () => availability,
    client: () => null,
  }
}

/** The default stub — an unconfigured project, i.e. auth cleanly unavailable. */
export const stubbedSupabaseClientProvider: SupabaseClientProvider =
  makeStubbedSupabaseClientProvider()
