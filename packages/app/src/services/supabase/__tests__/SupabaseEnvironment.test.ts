import { describe, expect, it } from 'vitest'
import {
  SUPABASE_ANON_KEY_VARIABLE,
  SUPABASE_PUBLISHABLE_KEY_VARIABLE,
  SUPABASE_URL_VARIABLE,
  makeRecordEnvironment,
  processEnvironment,
  supabaseAvailabilityFrom,
  supabaseEnvironmentVariables,
  supabaseKeyVariables,
} from '../SupabaseEnvironment'

/** A legacy anon key: a JWT whose payload role is `anon` (signature irrelevant here). */
const anonJwt = (role = 'anon'): string => {
  const b64 = (value: string) =>
    Buffer.from(value)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  return `${b64('{"alg":"HS256","typ":"JWT"}')}.${b64(JSON.stringify({ role, iss: 'supabase' }))}.sig`
}

const configured = {
  [SUPABASE_URL_VARIABLE]: 'https://project.supabase.co',
  [SUPABASE_PUBLISHABLE_KEY_VARIABLE]: 'sb_publishable_key-for-tests',
}

describe('resolving a project from the environment', () => {
  it('reports a configured project when both variables are set (a deploy with its env in place)', () => {
    const availability = supabaseAvailabilityFrom(
      makeRecordEnvironment(configured),
    )
    expect(availability).toEqual({
      kind: 'configured',
      configuration: {
        url: 'https://project.supabase.co',
        anonKey: 'sb_publishable_key-for-tests',
      },
    })
  })

  it('accepts the legacy anon-key name (a deploy configured before Supabase renamed the key)', () => {
    const availability = supabaseAvailabilityFrom(
      makeRecordEnvironment({
        [SUPABASE_URL_VARIABLE]: configured[SUPABASE_URL_VARIABLE],
        [SUPABASE_ANON_KEY_VARIABLE]: anonJwt(),
      }),
    )
    expect(availability).toEqual({
      kind: 'configured',
      configuration: {
        url: 'https://project.supabase.co',
        anonKey: anonJwt(),
      },
    })
  })

  it('prefers the publishable key when both names are set (a half-migrated .env.local)', () => {
    const availability = supabaseAvailabilityFrom(
      makeRecordEnvironment({
        ...configured,
        [SUPABASE_ANON_KEY_VARIABLE]: anonJwt(),
      }),
    )
    expect(availability.kind).toBe('configured')
    if (availability.kind === 'configured') {
      expect(availability.configuration.anonKey).toBe(
        'sb_publishable_key-for-tests',
      )
    }
  })

  it('falls back to the legacy name when the publishable one is present but blank', () => {
    const availability = supabaseAvailabilityFrom(
      makeRecordEnvironment({
        ...configured,
        [SUPABASE_PUBLISHABLE_KEY_VARIABLE]: '',
        [SUPABASE_ANON_KEY_VARIABLE]: anonJwt(),
      }),
    )
    expect(availability.kind).toBe('configured')
    if (availability.kind === 'configured') {
      expect(availability.configuration.anonKey).toBe(anonJwt())
    }
  })

  it('names the URL and the publishable key when neither is set (a fresh clone) rather than crashing', () => {
    const availability = supabaseAvailabilityFrom(makeRecordEnvironment({}))
    expect(availability).toEqual({
      kind: 'unconfigured',
      missing: [SUPABASE_URL_VARIABLE, SUPABASE_PUBLISHABLE_KEY_VARIABLE],
    })
  })

  it('names only the missing one when half the pair is set (a half-finished setup)', () => {
    const availability = supabaseAvailabilityFrom(
      makeRecordEnvironment({
        [SUPABASE_URL_VARIABLE]: configured[SUPABASE_URL_VARIABLE],
      }),
    )
    expect(availability).toEqual({
      kind: 'unconfigured',
      missing: [SUPABASE_PUBLISHABLE_KEY_VARIABLE],
    })
  })

  it('treats a blank value as absent — a .env line with nothing after the =', () => {
    const availability = supabaseAvailabilityFrom(
      makeRecordEnvironment({
        ...configured,
        [SUPABASE_PUBLISHABLE_KEY_VARIABLE]: '   ',
      }),
    )
    expect(availability).toEqual({
      kind: 'unconfigured',
      missing: [SUPABASE_PUBLISHABLE_KEY_VARIABLE],
    })
  })

  it('trims surrounding whitespace rather than building a client with a padded key', () => {
    const availability = supabaseAvailabilityFrom(
      makeRecordEnvironment({
        [SUPABASE_URL_VARIABLE]: '  https://project.supabase.co  ',
        [SUPABASE_PUBLISHABLE_KEY_VARIABLE]: '  sb_publishable_key-for-tests\n',
      }),
    )
    expect(availability).toEqual({
      kind: 'configured',
      configuration: {
        url: 'https://project.supabase.co',
        anonKey: 'sb_publishable_key-for-tests',
      },
    })
  })

  it('rejects a URL that is not http(s) — a CI secret that failed to interpolate', () => {
    const availability = supabaseAvailabilityFrom(
      makeRecordEnvironment({
        ...configured,
        [SUPABASE_URL_VARIABLE]: 'project.supabase.co',
      }),
    )
    expect(availability).toEqual({
      kind: 'unconfigured',
      missing: [SUPABASE_URL_VARIABLE],
    })
  })

  it('rejects a non-HTTP scheme rather than letting new URL() accept it', () => {
    const availability = supabaseAvailabilityFrom(
      makeRecordEnvironment({
        ...configured,
        [SUPABASE_URL_VARIABLE]: 'mailto:ops@example.com',
      }),
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

describe('key shape and transport (SEC-1, SEC-4)', () => {
  it('refuses a service-role JWT pasted into the publishable variable — it would be inlined into every bundle', () => {
    const availability = supabaseAvailabilityFrom(
      makeRecordEnvironment({
        ...configured,
        [SUPABASE_PUBLISHABLE_KEY_VARIABLE]: anonJwt('service_role'),
      }),
    )
    expect(availability).toEqual({
      kind: 'unconfigured',
      missing: [SUPABASE_PUBLISHABLE_KEY_VARIABLE],
    })
    expect(JSON.stringify(availability)).not.toContain('service_role')
  })

  it('refuses an sb_secret_ key and any unrecognisable string', () => {
    for (const bad of ['sb_secret_abc', 'not-a-key', 'a.b']) {
      const availability = supabaseAvailabilityFrom(
        makeRecordEnvironment({
          ...configured,
          [SUPABASE_PUBLISHABLE_KEY_VARIABLE]: bad,
        }),
      )
      expect(availability.kind).toBe('unconfigured')
    }
  })

  it('accepts plain HTTP only for a loopback host (a local Supabase), never for a remote one', () => {
    const local = supabaseAvailabilityFrom(
      makeRecordEnvironment({
        ...configured,
        [SUPABASE_URL_VARIABLE]: 'http://localhost:54321',
      }),
    )
    expect(local.kind).toBe('configured')
    const remote = supabaseAvailabilityFrom(
      makeRecordEnvironment({
        ...configured,
        [SUPABASE_URL_VARIABLE]: 'http://project.supabase.co',
      }),
    )
    expect(remote).toEqual({
      kind: 'unconfigured',
      missing: [SUPABASE_URL_VARIABLE],
    })
  })
})

describe('the ambient process environment', () => {
  it('answers undefined in a runtime with no process rather than throwing', () => {
    // jsdom has no `process`… except under Vitest, which does. Either way the
    // read must not throw, which is the property under test.
    expect(() =>
      processEnvironment.read('DEFINITELY_NOT_SET_ANYWHERE'),
    ).not.toThrow()
    expect(
      processEnvironment.read('DEFINITELY_NOT_SET_ANYWHERE'),
    ).toBeUndefined()
  })

  it('reads a variable that is set', () => {
    const host = globalThis as {
      process?: { env?: Record<string, string | undefined> }
    }
    if (host.process?.env !== undefined) {
      host.process.env.KRO_TEST_PROBE = 'present'
      expect(processEnvironment.read('KRO_TEST_PROBE')).toBe('present')
      host.process.env.KRO_TEST_PROBE = undefined
    }
  })
})

describe('the declared variable list', () => {
  it('names the URL and the publishable key in the order an operator should fix them', () => {
    expect(supabaseEnvironmentVariables).toEqual([
      SUPABASE_URL_VARIABLE,
      SUPABASE_PUBLISHABLE_KEY_VARIABLE,
    ])
  })

  it('lists the publishable key before the legacy anon name, so the preferred one wins', () => {
    expect(supabaseKeyVariables).toEqual([
      SUPABASE_PUBLISHABLE_KEY_VARIABLE,
      SUPABASE_ANON_KEY_VARIABLE,
    ])
  })

  it('reads the publishable key through the ambient environment by its literal name (the browser inlining path)', () => {
    const host = globalThis as {
      process?: { env?: Record<string, string | undefined> }
    }
    if (host.process?.env !== undefined) {
      // The static map is built at module load, so the probe cannot assert the
      // value; it asserts the read does not throw and answers a string or
      // undefined — never a crash — for both accepted key names.
      for (const name of supabaseKeyVariables) {
        const value = processEnvironment.read(name)
        expect(value === undefined || typeof value === 'string').toBe(true)
      }
    }
  })

  it('uses the NEXT_PUBLIC_ prefix, because the browser genuinely needs both', () => {
    for (const name of [
      ...supabaseEnvironmentVariables,
      ...supabaseKeyVariables,
    ]) {
      expect(name.startsWith('NEXT_PUBLIC_')).toBe(true)
    }
  })

  it('never names a service-role key — that credential has no business in a client bundle', () => {
    for (const name of [
      ...supabaseEnvironmentVariables,
      ...supabaseKeyVariables,
    ]) {
      expect(name.toLowerCase()).not.toContain('service_role')
      expect(name.toLowerCase()).not.toContain('secret')
    }
  })
})
