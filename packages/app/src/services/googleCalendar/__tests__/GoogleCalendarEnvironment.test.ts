import { describe, expect, it } from 'vitest'
import { makeRecordEnvironment } from '../../supabase/SupabaseEnvironment'
import {
  googleCalendarEnvironmentFrom,
  googleCalendarEnvironmentVariableNames as names,
  googleCalendarProcessEnvironment,
  requiredGoogleCalendarVariables,
} from '../GoogleCalendarEnvironment'

const complete = {
  [names.clientId]: 'client-id.apps.googleusercontent.com',
  [names.clientSecret]: 'not-a-real-value',
  [names.tokenKey]: 'not-a-real-key',
}

describe('resolving the Google Calendar client from the environment', () => {
  it('reports configured when all three required variables are present', () => {
    const resolved = googleCalendarEnvironmentFrom(
      makeRecordEnvironment(complete),
    )
    expect(resolved.kind).toBe('configured')
    if (resolved.kind !== 'configured') return
    expect(resolved.configuration.clientId).toBe(complete[names.clientId])
    // The redirect URI is optional — the flow derives one from the origin.
    expect(resolved.configuration.redirectUri).toBeNull()
  })

  it('carries an explicitly configured redirect URI through', () => {
    const resolved = googleCalendarEnvironmentFrom(
      makeRecordEnvironment({
        ...complete,
        [names.redirectUri]: 'https://kro.app/api/google/callback',
      }),
    )
    expect(resolved.kind).toBe('configured')
    if (resolved.kind !== 'configured') return
    expect(resolved.configuration.redirectUri).toBe(
      'https://kro.app/api/google/callback',
    )
  })

  it('reports unconfigured on a fresh clone with nothing set', () => {
    // The developer-clone case the issue calls a supported state.
    const resolved = googleCalendarEnvironmentFrom(makeRecordEnvironment({}))
    expect(resolved.kind).toBe('unconfigured')
    if (resolved.kind !== 'unconfigured') return
    expect(resolved.missing).toEqual(requiredGoogleCalendarVariables)
  })

  it('names only the variable that is actually missing', () => {
    const resolved = googleCalendarEnvironmentFrom(
      makeRecordEnvironment({
        [names.clientId]: complete[names.clientId],
        [names.tokenKey]: complete[names.tokenKey],
      }),
    )
    expect(resolved.kind).toBe('unconfigured')
    if (resolved.kind !== 'unconfigured') return
    expect(resolved.missing).toEqual([names.clientSecret])
  })

  it('treats a blank value as absent (a CI secret that failed to interpolate)', () => {
    const resolved = googleCalendarEnvironmentFrom(
      makeRecordEnvironment({ ...complete, [names.tokenKey]: '   ' }),
    )
    expect(resolved.kind).toBe('unconfigured')
    if (resolved.kind !== 'unconfigured') return
    expect(resolved.missing).toEqual([names.tokenKey])
  })

  it('trims surrounding whitespace a copy-paste leaves behind', () => {
    const resolved = googleCalendarEnvironmentFrom(
      makeRecordEnvironment({ ...complete, [names.clientId]: '  abc  ' }),
    )
    expect(resolved.kind).toBe('configured')
    if (resolved.kind !== 'configured') return
    expect(resolved.configuration.clientId).toBe('abc')
  })

  it('rejects a redirect URI that is not an http(s) URL', () => {
    const resolved = googleCalendarEnvironmentFrom(
      makeRecordEnvironment({ ...complete, [names.redirectUri]: 'not a url' }),
    )
    expect(resolved.kind).toBe('unconfigured')
    if (resolved.kind !== 'unconfigured') return
    expect(resolved.missing).toEqual([names.redirectUri])
  })

  it('never puts a value into the missing list — only variable names', () => {
    // SEC-5: an operator log or a UI message built from `missing` cannot leak
    // key material, because `missing` holds names.
    const resolved = googleCalendarEnvironmentFrom(
      makeRecordEnvironment({
        [names.clientSecret]: 'a-secret-value-that-must-not-appear',
      }),
    )
    expect(resolved.kind).toBe('unconfigured')
    if (resolved.kind !== 'unconfigured') return
    expect(resolved.missing.join(' ')).not.toContain('a-secret-value')
  })
})

describe('the ambient server environment reader', () => {
  it('answers undefined for a variable nothing set', () => {
    expect(
      googleCalendarProcessEnvironment.read('KRO_DEFINITELY_UNSET_VARIABLE'),
    ).toBeUndefined()
  })

  it('reads a variable the process does have', () => {
    // Under Vitest `process` is real, so this proves the structural read works
    // rather than always answering undefined.
    process.env.KRO_TEST_GOOGLE_PROBE = 'present'
    try {
      expect(
        googleCalendarProcessEnvironment.read('KRO_TEST_GOOGLE_PROBE'),
      ).toBe('present')
    } finally {
      process.env.KRO_TEST_GOOGLE_PROBE = undefined
    }
  })

  it('lands on unconfigured in a runtime with no process at all (the browser)', () => {
    // None of these variables is NEXT_PUBLIC_, so a client bundle sees nothing
    // — which must degrade to `unconfigured`, never to a partial client.
    const browserLike = { read: () => undefined }
    expect(googleCalendarEnvironmentFrom(browserLike).kind).toBe('unconfigured')
  })
})
