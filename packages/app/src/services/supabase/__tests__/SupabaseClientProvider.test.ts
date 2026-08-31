import { describe, expect, it } from 'vitest'
import {
  makeLiveSupabaseClientProvider,
  makeStubbedSupabaseClientProvider,
  stubbedSupabaseClientProvider,
} from '../SupabaseClientProvider'
import {
  SUPABASE_ANON_KEY_VARIABLE,
  SUPABASE_URL_VARIABLE,
  makeRecordEnvironment,
} from '../SupabaseEnvironment'

const configuredEnvironment = makeRecordEnvironment({
  [SUPABASE_URL_VARIABLE]: 'https://project.supabase.co',
  // Not a real key: a syntactically plausible placeholder so `createClient`
  // has something to hold. Nothing in this suite makes a request.
  [SUPABASE_ANON_KEY_VARIABLE]: 'anon-key-for-tests',
})

describe('the live provider with no project configured', () => {
  const provider = makeLiveSupabaseClientProvider({
    environment: makeRecordEnvironment({}),
  })

  it('answers a null client instead of throwing — signed-out local use must still work', () => {
    expect(provider.client()).toBeNull()
  })

  it('reports which variables are missing, so the operator fixes both in one pass', () => {
    expect(provider.availability()).toEqual({
      kind: 'unconfigured',
      missing: [SUPABASE_URL_VARIABLE, SUPABASE_ANON_KEY_VARIABLE],
    })
  })

  it('stays null across repeated calls rather than retrying into an exception', () => {
    expect(provider.client()).toBeNull()
    expect(provider.client()).toBeNull()
  })
})

describe('the live provider with a project configured', () => {
  it('builds a client and memoises it, so one session has one auth listener', () => {
    const provider = makeLiveSupabaseClientProvider({
      environment: configuredEnvironment,
    })

    const first = provider.client()
    const second = provider.client()

    expect(first).not.toBeNull()
    expect(second).toBe(first)
  })

  it('reports the resolved project without building anything', () => {
    const provider = makeLiveSupabaseClientProvider({
      environment: configuredEnvironment,
    })
    const availability = provider.availability()
    expect(availability.kind).toBe('configured')
  })

  it('constructs nothing at factory time — building ThunkExtra must not be a side effect', () => {
    let reads = 0
    const counting = {
      read: (name: string) => {
        reads += 1
        return configuredEnvironment.read(name)
      },
    }
    makeLiveSupabaseClientProvider({ environment: counting })
    expect(reads).toBe(0)
  })
})

describe('the stubbed provider', () => {
  it('reports an unconfigured project by default — the honest description of a stub', () => {
    expect(stubbedSupabaseClientProvider.availability()).toEqual({
      kind: 'unconfigured',
      missing: [],
    })
  })

  it('answers a null client even when told to report a configured project', () => {
    const provider = makeStubbedSupabaseClientProvider({
      availability: {
        kind: 'configured',
        configuration: { url: 'https://project.supabase.co', anonKey: 'k' },
      },
    })
    expect(provider.availability().kind).toBe('configured')
    expect(provider.client()).toBeNull()
  })

  it('has no path to the network at all, on repeated calls', () => {
    expect(stubbedSupabaseClientProvider.client()).toBeNull()
    expect(stubbedSupabaseClientProvider.client()).toBeNull()
  })
})
