/**
 * The server-side composition root for the Google Calendar routes.
 *
 * `apps/web`'s seven `route.ts` files each need the same four services wired the
 * same way. Building them in each file would be four copies of the same
 * decision; building them here means a route file is a `Request` adapter and
 * nothing else, which is what keeps the whole logic surface testable without an
 * HTTP runtime (`RC-43`).
 *
 * ## Not a singleton
 *
 * `makeGoogleRouteDependencies()` is a factory for the same reason `makeStore`
 * is (`RC-22`): a module-level `export const dependencies = …` could only ever
 * be wired to the live bindings, so every route spec in CI would talk to
 * Google. Every argument is overridable, and a spec passes stubs.
 *
 * It is also cheap to call per request — the vault caches its derived key per
 * instance and everything else is an object literal — so a route calling it
 * inside the handler rather than at module scope costs nothing and avoids
 * holding a key handle across a serverless invocation boundary.
 *
 * ## `unconfigured` is a value, never a throw
 *
 * The factory succeeds even with no environment at all. `deps.environment` then
 * carries `{ kind: 'unconfigured', missing }` and every handler answers the
 * typed `unconfigured` failure. A deployment with no Google client serves the
 * app normally and reports the integration as unavailable — the issue's
 * *"missing env = integration cleanly `unconfigured`, a supported state"*.
 */
import {
  type GoogleCalendarApiService,
  type GoogleHttpTransport,
  makeLiveGoogleCalendarApiService,
} from './GoogleCalendarApiService'
import {
  type GoogleCalendarEnvironment,
  googleCalendarEnvironmentFrom,
  googleCalendarProcessEnvironment,
} from './GoogleCalendarEnvironment'
import type { GoogleRouteDependencies } from './GoogleCalendarRouteHandlers'
import {
  type GoogleFormTransport,
  type GoogleOAuthService,
  makeLiveGoogleOAuthService,
  makeStubbedGoogleOAuthService,
} from './GoogleOAuthService'
import {
  type CryptoSource,
  type GoogleTokenVault,
  ambientCryptoSource,
  makeStubbedTokenVault,
  makeWebCryptoTokenVault,
} from './GoogleTokenVault'
import type { EnvironmentProvider } from '../supabase/SupabaseEnvironment'

export interface GoogleRouteDependencyOverrides {
  readonly environment?: GoogleCalendarEnvironment
  readonly environmentProvider?: EnvironmentProvider
  readonly vault?: GoogleTokenVault
  readonly oauth?: GoogleOAuthService
  readonly api?: GoogleCalendarApiService
  readonly crypto?: CryptoSource
  readonly httpTransport?: GoogleHttpTransport
  readonly formTransport?: GoogleFormTransport
}

/**
 * A no-op crypto source, used only when the runtime has none.
 *
 * There is no such runtime among the ones this app targets — Web Crypto is in
 * every browser and in Node ≥ 18 — but `ambientCryptoSource()` is typed as
 * possibly `null` and a route may not crash on it. Every operation rejects, so
 * an impossible runtime degrades to "authorization fails" rather than to a 500
 * with a stack trace.
 */
const unavailableCrypto: CryptoSource = {
  subtle: {
    digest: () => Promise.reject(new Error('No Web Crypto implementation.')),
  } as unknown as SubtleCrypto,
  getRandomValues: () => {
    throw new Error('No Web Crypto implementation.')
  },
}

/**
 * Build everything the handlers need.
 *
 * The vault's key is the one place the environment's `tokenKey` is used; when
 * the environment is `unconfigured` there is no key, so the stub is installed
 * and every `open` answers `null`. That is inert rather than dangerous: no
 * handler gets past `configurationOf` on an unconfigured deployment, so nothing
 * is ever sealed with it.
 */
export const makeGoogleRouteDependencies = (
  overrides: GoogleRouteDependencyOverrides = {},
): GoogleRouteDependencies => {
  const environment =
    overrides.environment ??
    googleCalendarEnvironmentFrom(
      overrides.environmentProvider ?? googleCalendarProcessEnvironment,
    )

  const vault =
    overrides.vault ??
    (environment.kind === 'configured'
      ? makeWebCryptoTokenVault({
          secret: environment.configuration.tokenKey,
          crypto: overrides.crypto ?? ambientCryptoSource(),
        })
      : makeStubbedTokenVault())

  const oauth =
    overrides.oauth ??
    (environment.kind === 'configured'
      ? makeLiveGoogleOAuthService({
          clientId: environment.configuration.clientId,
          clientSecret: environment.configuration.clientSecret,
          ...(overrides.formTransport === undefined
            ? {}
            : { transport: overrides.formTransport }),
        })
      : makeStubbedGoogleOAuthService({ exchangeOutcome: 'invalidGrant' }))

  const api =
    overrides.api ??
    makeLiveGoogleCalendarApiService(overrides.httpTransport)

  return {
    environment,
    vault,
    oauth,
    api,
    crypto: overrides.crypto ?? ambientCryptoSource() ?? unavailableCrypto,
  }
}
