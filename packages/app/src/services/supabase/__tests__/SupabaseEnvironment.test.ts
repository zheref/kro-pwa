import { describe, expect, it } from 'vitest'
import {
  SUPABASE_ANON_KEY_VARIABLE,
  SUPABASE_URL_VARIABLE,
  makeRecordEnvironment,
  processEnvironment,
  supabaseAvailabilityFrom,
  supabaseEnvironmentVariables,
} from '../SupabaseEnvironment'

const configured = {
  [SUPABASE_URL_VARIABLE]: 'https://project.supabase.co',
  [SUPABASE_ANON_KEY_VARIABLE]: 'anon-key-for-tests',
}

describe('resolving a project from the environment', () => {
  it('reports a configured project when both variables are set (a deploy with its env in place)', () => {
    const availability = supabaseAvailabilityFrom(makeRecordEnvironment(configured))
    expect(availability).toEqual({
      kind: 'configured',
      configuration: {
        url: 'https://project.supabase.co',
        anonKey: 'anon-key-for-tests',
      },
    })
  })

  it('names both variables when neither is set (a fresh clone) rather than crashing', () => {
    const availability = supabaseAvailabilityFrom(makeRecordEnvironment({}))
    expect(availability).toEqual({
      kind: 'unconfigured',
      missing: [SUPABASE_URL_VARIABLE, SUPABASE_ANON_KEY_VARIABLE],
    })
  })

  it('names only the missing one when half the pair is set (a half-finished setup)', () => {
    const availability = supabaseAvailabilityFrom(
      makeRecordEnvironment({ [SUPABASE_URL_VARIABLE]: configured[SUPABASE_URL_VARIABLE] }),
    )
    expect(availability).toEqual({
      kind: 'unconfigured',
      missing: [SUPABASE_ANON_KEY_VARIABLE],
    })
  })

  it('treats a blank value as absent — a .env line with nothing after the =', () => {
    const availability = supabaseAvailabilityFrom(
      makeRecordEnvironment({ ...configured, [SUPABASE_ANON_KEY_VARIABLE]: '   ' }),
    )
    expect(availability).toEqual({
      kind: 'unconfigured',
      missing: [SUPABASE_ANON_KEY_VARIABLE],
    })
  })

  it('trims surrounding whitespace rather than building a client with a padded key', () => {
    const availability = supabaseAvailabilityFrom(
      makeRecordEnvironment({
        [SUPABASE_URL_VARIABLE]: '  https://project.supabase.co  ',
        [SUPABASE_ANON_KEY_VARIABLE]: '  anon-key-for-tests\n',
      }),
    )
    expect(availability).toEqual({
      kind: 'configured',
      configuration: {
        url: 'https://project.supabase.co',
        anonKey: 'anon-key-for-tests',
      },
    })
  })

  it('rejects a URL that is not http(s) — a CI secret that failed to interpolate', () => {
    const availability = supabaseAvailabilityFrom(
      makeRecordEnvironment({ ...configured, [SUPABASE_URL_VARIABLE]: 'project.supabase.co' }),
    )
    expect(availability).toEqual({
      kind: 'unconfigured',
      missing: [SUPABASE_URL_VARIABLE],
    })
  })

  it('rejects a non-HTTP scheme rather than letting new URL() accept it', () => {
    const availability = supabaseAvailabilityFrom(
      makeRecordEnvironment({ ...configured, [SUPABASE_URL_VARIABLE]: 'mailto:ops@example.com' }),
    )
    expect(availability.kind).toBe('unconfigured')
  })

  it('never puts a value into the failure — only variable names, so a log cannot leak a key', () => {
    const availability = supabaseAvailabilityFrom(
      makeRecordEnvironment({ [SUPABASE_URL_VARIABLE]: 'not-a-url' }),
    )
    expect(JSON.stringify(availability)).not.toContain('not-a-url')
  })
})

describe('the ambient process environment', () => {
  it('answers undefined in a runtime with no process rather than throwing', () => {
    // jsdom has no `process`… except under Vitest, which does. Either way the
    // read must not throw, which is the property under test.
    expect(() => processEnvironment.read('DEFINITELY_NOT_SET_ANYWHERE')).not.toThrow()
    expect(processEnvironment.read('DEFINITELY_NOT_SET_ANYWHERE')).toBeUndefined()
  })

  it('reads a variable that is set', () => {
    const host = globalThis as { process?: { env?: Record<string, string | undefined> } }
    if (host.process?.env !== undefined) {
      host.process.env.KRO_TEST_PROBE = 'present'
      expect(processEnvironment.read('KRO_TEST_PROBE')).toBe('present')
      host.process.env.KRO_TEST_PROBE = undefined
    }
  })
})

describe('the declared variable list', () => {
  it('names both variables in the order an operator should fix them', () => {
    expect(supabaseEnvironmentVariables).toEqual([
      SUPABASE_URL_VARIABLE,
      SUPABASE_ANON_KEY_VARIABLE,
    ])
  })

  it('uses the NEXT_PUBLIC_ prefix, because the browser genuinely needs both', () => {
    for (const name of supabaseEnvironmentVariables) {
      expect(name.startsWith('NEXT_PUBLIC_')).toBe(true)
    }
  })

  it('never names a service-role key — that credential has no business in a client bundle', () => {
    for (const name of supabaseEnvironmentVariables) {
      expect(name.toLowerCase()).not.toContain('service_role')
      expect(name.toLowerCase()).not.toContain('secret')
    }
  })
})
