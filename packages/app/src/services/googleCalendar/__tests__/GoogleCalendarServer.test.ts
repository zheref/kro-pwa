import { describe, expect, it } from 'vitest'
import { makeRecordEnvironment } from '../../supabase/SupabaseEnvironment'
import { makeStubbedGoogleHttpTransport } from '../GoogleCalendarApiService'
import { googleCalendarEnvironmentVariableNames as names } from '../GoogleCalendarEnvironment'
import { startGoogleAuthorization } from '../GoogleCalendarRouteHandlers'
import { makeGoogleRouteDependencies } from '../GoogleCalendarServer'
import { makeStubbedGoogleOAuthService } from '../GoogleOAuthService'
import { STUBBED_VAULT_PREFIX, makeStubbedTokenVault } from '../GoogleTokenVault'

const CONFIGURED = {
  [names.clientId]: 'client-id.apps.googleusercontent.com',
  [names.clientSecret]: 'not-a-real-value',
  [names.tokenKey]: 'not-a-real-key',
}

describe('wiring the server-side dependencies', () => {
  it('resolves the environment from an injected provider', () => {
    const deps = makeGoogleRouteDependencies({
      environmentProvider: makeRecordEnvironment(CONFIGURED),
    })
    expect(deps.environment.kind).toBe('configured')
  })

  it('succeeds with NO environment at all — unconfigured is a value', async () => {
    // A deployment with no Google client serves the app normally and reports
    // the integration as unavailable. It must not throw at construction.
    const deps = makeGoogleRouteDependencies({
      environmentProvider: makeRecordEnvironment({}),
    })
    expect(deps.environment.kind).toBe('unconfigured')
    const result = await startGoogleAuthorization(
      { url: 'https://kro.app/api/google/connect', cookieHeader: null },
      deps,
    )
    expect(result.ok).toBe(false)
  })

  it('installs a real vault when configured, and an inert one when not', async () => {
    const configured = makeGoogleRouteDependencies({
      environmentProvider: makeRecordEnvironment(CONFIGURED),
    })
    const unconfigured = makeGoogleRouteDependencies({
      environmentProvider: makeRecordEnvironment({}),
    })
    // The stub marks itself, so an accidental production use is visible.
    expect(await unconfigured.vault.seal('x')).toContain(STUBBED_VAULT_PREFIX)
    expect(await configured.vault.seal('x')).not.toContain(STUBBED_VAULT_PREFIX)
  })

  it('is a FACTORY, not a singleton — two calls build two dependency sets', () => {
    // The `makeStore` argument: a module-level constant could only be wired to
    // the live bindings, so every route spec in CI would talk to Google.
    const first = makeGoogleRouteDependencies({
      environmentProvider: makeRecordEnvironment(CONFIGURED),
    })
    const second = makeGoogleRouteDependencies({
      environmentProvider: makeRecordEnvironment(CONFIGURED),
    })
    expect(first).not.toBe(second)
    expect(first.vault).not.toBe(second.vault)
  })

  it('lets a spec substitute every collaborator', () => {
    const vault = makeStubbedTokenVault()
    const oauth = makeStubbedGoogleOAuthService()
    const deps = makeGoogleRouteDependencies({
      environmentProvider: makeRecordEnvironment(CONFIGURED),
      vault,
      oauth,
    })
    expect(deps.vault).toBe(vault)
    expect(deps.oauth).toBe(oauth)
  })

  it('threads an injected HTTP transport into the calendar client', async () => {
    const deps = makeGoogleRouteDependencies({
      environmentProvider: makeRecordEnvironment(CONFIGURED),
      httpTransport: makeStubbedGoogleHttpTransport({
        routes: [{ match: 'calendarList', body: { items: [{ id: 'only' }] } }],
      }),
    })
    const calendars = await deps.api.listCalendars({ accessToken: 'irrelevant' })
    expect(calendars.map((entry) => entry.id)).toEqual(['only'])
  })

  it('always provides a crypto source, even on a runtime that has none', () => {
    // `ambientCryptoSource()` is typed as possibly null; a route may not crash
    // on it. The fallback rejects every operation instead.
    const deps = makeGoogleRouteDependencies({
      environmentProvider: makeRecordEnvironment(CONFIGURED),
      crypto: null as never,
    })
    expect(deps.crypto).toBeDefined()
  })
})
