/**
 * `ThirstService` — the stub as a little state machine (mirrors
 * `AuthService.test.ts`'s own section), plus the live service against a
 * minimal fake `SupabaseClient` for the wire-shape work no stub exercises:
 * the `web`-tagged insert, the `23505` convergence, the RPC row fold, and
 * the failure-shape handling this issue asked to prove.
 */
import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { makeStubbedSupabaseClientProvider } from '../../supabase/SupabaseClientProvider'
import type { SupabaseClientProvider } from '../../supabase/SupabaseClientProvider'
import {
  makeLiveThirstService,
  makeStubbedThirstService,
} from '../ThirstService'

// ---------------------------------------------------------------------------
// Stub — a little state machine, mirroring AuthService.test.ts
// ---------------------------------------------------------------------------

describe('the stubbed service as a vote-state machine', () => {
  it('reports not-yet-voted for a signed-in user with no prior vote', async () => {
    const service = makeStubbedThirstService({ signedIn: true })
    expect(await service.hasVoted('matrix')).toBe(false)
  })

  it('records the vote so a later hasVoted check finds it', async () => {
    const service = makeStubbedThirstService({ signedIn: true })
    await service.castVote('matrix', 'vote-1')
    expect(await service.hasVoted('matrix')).toBe(true)
    expect(service.votedFeatureKeys()).toEqual(['matrix'])
  })

  it('a repeat vote for the same feature is a quiet no-op, not a second entry', async () => {
    const service = makeStubbedThirstService({ signedIn: true })
    await service.castVote('matrix', 'vote-1')
    await service.castVote('matrix', 'vote-2')
    expect((await service.fetchCounts('matrix')).total).toBe(1)
  })

  it('rejects castVote/hasVoted with notSignedIn when signed out', async () => {
    const service = makeStubbedThirstService({ signedIn: false })
    await expect(service.castVote('matrix', 'vote-1')).rejects.toMatchObject({
      kind: 'notSignedIn',
    })
    await expect(service.hasVoted('matrix')).rejects.toMatchObject({
      kind: 'notSignedIn',
    })
  })

  it('fetchCounts never requires a session — public data', async () => {
    const service = makeStubbedThirstService({ signedIn: false })
    await expect(service.fetchCounts('matrix')).resolves.toMatchObject({
      featureKey: 'matrix',
      total: 0,
    })
  })

  it('records every operation it was asked to perform, in order', async () => {
    const service = makeStubbedThirstService({ signedIn: true })
    await service.hasVoted('matrix')
    await service.castVote('matrix', 'vote-1')
    await service.fetchCounts('matrix')
    expect(service.operations()).toEqual(['hasVoted', 'castVote', 'fetchCounts'])
  })

  it('can be scripted to fail one operation and not the others', async () => {
    const service = makeStubbedThirstService({
      signedIn: true,
      failures: { fetchCounts: new Error('rpc unavailable') },
    })
    await expect(service.fetchCounts('matrix')).rejects.toThrow('rpc unavailable')
    await expect(service.hasVoted('matrix')).resolves.toBe(false)
  })

  it('starts from a seeded counts fixture', async () => {
    const service = makeStubbedThirstService({
      initialCounts: { matrix: { featureKey: 'matrix', total: 5, perPlatform: { ios: 5 } } },
    })
    expect((await service.fetchCounts('matrix')).total).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// Live — against the honest "no project configured" stub
// ---------------------------------------------------------------------------

describe('the live service with no project configured', () => {
  const service = makeLiveThirstService({
    clientProvider: makeStubbedSupabaseClientProvider(),
  })

  it('reports notSignedIn on castVote rather than crashing', async () => {
    await expect(service.castVote('matrix', 'vote-1')).rejects.toMatchObject({
      kind: 'notSignedIn',
    })
  })

  it('reports notSignedIn on hasVoted', async () => {
    await expect(service.hasVoted('matrix')).rejects.toMatchObject({
      kind: 'notSignedIn',
    })
  })

  it('fetchCounts degrades to an empty result — public data with nothing behind it', async () => {
    await expect(service.fetchCounts('matrix')).resolves.toEqual({
      featureKey: 'matrix',
      total: 0,
      perPlatform: {},
    })
  })
})

// ---------------------------------------------------------------------------
// Live — against a minimal fake, configured client
// ---------------------------------------------------------------------------

interface FakeClientConfig {
  readonly session?: { readonly user: { readonly id: string; readonly email: string | null } } | null
  readonly insertError?: { readonly code?: string; readonly message: string } | null
  readonly onInsert?: (payload: unknown) => void
  readonly selectRows?: readonly { readonly id: string }[]
  readonly selectError?: { readonly message: string } | null
  readonly rpcRows?: readonly Record<string, unknown>[]
  readonly rpcError?: { readonly message: string } | null
  /** Called with whatever `AbortSignal` a query's `.abortSignal(...)` chain
   * was given — the way to prove signal forwarding actually reached the
   * query builder, not just that the Service accepted the option. */
  readonly onAbortSignal?: (signal: AbortSignal) => void
}

/**
 * A minimal thenable + chainable double for a Postgrest/RPC query builder:
 * `await` resolves it (matching how the live Service awaits the builder
 * directly), and `.abortSignal(signal)` is chainable and observable, the
 * same shape real supabase-js query builders expose.
 */
const fakeQuery = (
  result: { readonly data?: unknown; readonly error: unknown },
  onAbortSignal?: (signal: AbortSignal) => void,
) => {
  const query = {
    abortSignal(signal: AbortSignal) {
      onAbortSignal?.(signal)
      return query
    },
    then(
      resolve: (value: typeof result) => void,
      reject?: (reason: unknown) => void,
    ) {
      return Promise.resolve(result).then(resolve, reject)
    },
  }
  return query
}

const fakeClient = (config: FakeClientConfig): SupabaseClient => {
  const client = {
    auth: {
      getSession: async () => ({
        data: { session: config.session === undefined ? null : config.session },
        error: null,
      }),
    },
    from: (_table: string) => ({
      insert: (payload: unknown) => {
        config.onInsert?.(payload)
        return fakeQuery({ error: config.insertError ?? null }, config.onAbortSignal)
      },
      select: (_columns: string) => ({
        eq: (_column: string, _value: string) =>
          fakeQuery(
            { data: config.selectRows ?? [], error: config.selectError ?? null },
            config.onAbortSignal,
          ),
      }),
    }),
    rpc: (_fn: string, _params: Record<string, unknown>) =>
      fakeQuery(
        { data: config.rpcRows ?? [], error: config.rpcError ?? null },
        config.onAbortSignal,
      ),
  }
  return client as unknown as SupabaseClient
}

const providerFor = (client: SupabaseClient): SupabaseClientProvider => ({
  availability: () => ({ kind: 'configured', configuration: { url: 'https://x', anonKey: 'x' } }),
  client: () => client,
})

const SESSION = { user: { id: 'user-1', email: 'ada@example.com' } }

describe('requireSignedInClient — getSession() failing is a transport error, not "signed out"', () => {
  it('maps a getSession() failure to a typed exception rather than throwing the raw Supabase error', async () => {
    const client = {
      auth: {
        getSession: async () => ({
          data: { session: null },
          error: Object.assign(new Error('network unreachable'), { code: 'unreachable' }),
        }),
      },
    } as unknown as SupabaseClient
    const service = makeLiveThirstService({ clientProvider: providerFor(client) })
    await expect(service.castVote('matrix', 'vote-1')).rejects.toMatchObject({
      kind: 'unknown',
      message: 'network unreachable',
    })
  })
})

describe('the live service, configured, signed in', () => {
  it('castVote writes the web platform tag against the canon table — no KroApple change needed', async () => {
    const onInsert = vi.fn()
    const service = makeLiveThirstService({
      clientProvider: providerFor(fakeClient({ session: SESSION, onInsert })),
    })
    await service.castVote('matrix', 'vote-1')
    expect(onInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'vote-1',
        feature_key: 'matrix',
        platform: 'web',
        feature_title: 'Priority Matrix',
        username: 'ada@example.com',
      }),
    )
  })

  it('a unique-constraint conflict (23505) converges quietly — the server\'s own vote-once guarantee', async () => {
    const service = makeLiveThirstService({
      clientProvider: providerFor(
        fakeClient({ session: SESSION, insertError: { code: '23505', message: 'dup' } }),
      ),
    })
    await expect(service.castVote('matrix', 'vote-1')).resolves.toBeUndefined()
  })

  /**
   * Proves the failure-shape handling the issue asked to check: IF the
   * `web` platform value were ever rejected by the canon migration's CHECK
   * constraint (it is not — see `ThirstService.ts`'s header, verified
   * against `zheref/KroApple@2117efc`), a rejected insert degrades to a
   * typed exception rather than throwing an opaque Postgrest error or
   * crashing the vote flow. Scripted here via the same `23514`
   * (`check_violation`) code Postgres would actually report.
   */
  it('an unexpected platform-check failure degrades to a typed exception, never a crash', async () => {
    // A real Postgrest error is an `Error` subclass; build the fake the same
    // way so `toThirstException`'s `instanceof Error` branch is genuinely
    // exercised, not the plain-object fallback.
    const checkViolation = Object.assign(
      new Error('new row violates check constraint "votes_platform_check"'),
      { code: '23514' },
    )
    const service = makeLiveThirstService({
      clientProvider: providerFor(
        fakeClient({ session: SESSION, insertError: checkViolation }),
      ),
    })
    await expect(service.castVote('matrix', 'vote-1')).rejects.toMatchObject({
      kind: 'unknown',
      message: expect.stringContaining('votes_platform_check'),
    })
  })

  it('forwards the caller\'s AbortSignal to the insert — a cancelled thunk actually cancels the request', async () => {
    const controller = new AbortController()
    const onAbortSignal = vi.fn()
    const service = makeLiveThirstService({
      clientProvider: providerFor(fakeClient({ session: SESSION, onAbortSignal })),
    })
    await service.castVote('matrix', 'vote-1', { signal: controller.signal })
    expect(onAbortSignal).toHaveBeenCalledWith(controller.signal)
  })

  it('hasVoted reports true when RLS returns a matching row', async () => {
    const service = makeLiveThirstService({
      clientProvider: providerFor(fakeClient({ session: SESSION, selectRows: [{ id: 'v1' }] })),
    })
    await expect(service.hasVoted('matrix')).resolves.toBe(true)
  })

  it('hasVoted reports false when no row matches', async () => {
    const service = makeLiveThirstService({
      clientProvider: providerFor(fakeClient({ session: SESSION, selectRows: [] })),
    })
    await expect(service.hasVoted('matrix')).resolves.toBe(false)
  })

  it('a select failure degrades to a typed exception', async () => {
    const service = makeLiveThirstService({
      clientProvider: providerFor(
        fakeClient({ session: SESSION, selectError: { message: 'timeout' } }),
      ),
    })
    await expect(service.hasVoted('matrix')).rejects.toMatchObject({ kind: 'unknown' })
  })

  it('forwards the caller\'s AbortSignal to the select', async () => {
    const controller = new AbortController()
    const onAbortSignal = vi.fn()
    const service = makeLiveThirstService({
      clientProvider: providerFor(fakeClient({ session: SESSION, onAbortSignal })),
    })
    await service.hasVoted('matrix', { signal: controller.signal })
    expect(onAbortSignal).toHaveBeenCalledWith(controller.signal)
  })
})

describe('the live service, fetchCounts (public, no session required)', () => {
  it('folds the RPC rows into total + per-platform counts', async () => {
    const service = makeLiveThirstService({
      clientProvider: providerFor(
        fakeClient({
          rpcRows: [
            { feature_key: 'matrix', platform: 'ios', vote_count: 30, total_count: 42 },
            { feature_key: 'matrix', platform: 'android', vote_count: 12, total_count: 42 },
          ],
        }),
      ),
    })
    await expect(service.fetchCounts('matrix')).resolves.toEqual({
      featureKey: 'matrix',
      total: 42,
      perPlatform: { ios: 30, android: 12 },
    })
  })

  it('ignores a row with an unrecognized platform string rather than crashing', async () => {
    const service = makeLiveThirstService({
      clientProvider: providerFor(
        fakeClient({
          rpcRows: [
            { feature_key: 'matrix', platform: 'ios', vote_count: 1, total_count: 2 },
            { feature_key: 'matrix', platform: 'linux', vote_count: 1, total_count: 2 },
          ],
        }),
      ),
    })
    const counts = await service.fetchCounts('matrix')
    expect(counts.perPlatform).toEqual({ ios: 1 })
  })

  it('resolves the empty shape for a feature with no rows at all', async () => {
    const service = makeLiveThirstService({
      clientProvider: providerFor(fakeClient({ rpcRows: [] })),
    })
    await expect(service.fetchCounts('matrix')).resolves.toEqual({
      featureKey: 'matrix',
      total: 0,
      perPlatform: {},
    })
  })

  it('an RPC failure degrades to a typed exception', async () => {
    const service = makeLiveThirstService({
      clientProvider: providerFor(fakeClient({ rpcError: { message: 'function not found' } })),
    })
    await expect(service.fetchCounts('matrix')).rejects.toMatchObject({ kind: 'unknown' })
  })

  it('forwards the caller\'s AbortSignal to the RPC call', async () => {
    const controller = new AbortController()
    const onAbortSignal = vi.fn()
    const service = makeLiveThirstService({
      clientProvider: providerFor(fakeClient({ onAbortSignal })),
    })
    await service.fetchCounts('matrix', { signal: controller.signal })
    expect(onAbortSignal).toHaveBeenCalledWith(controller.signal)
  })

  it('a browser transport failure (TypeError) degrades to offline', async () => {
    const client = {
      rpc: async () => {
        throw new TypeError('Failed to fetch')
      },
    } as unknown as SupabaseClient
    const service = makeLiveThirstService({ clientProvider: providerFor(client) })
    await expect(service.fetchCounts('matrix')).rejects.toMatchObject({ kind: 'offline' })
  })
})
