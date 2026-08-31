/**
 * `ThirstService` — port of KroApple's `ThirstClient.swift` (epic #83,
 * sub-issue #87) to the web, tagged with the `web` `VotePlatform`.
 *
 * ## The `web` platform tag needs no KroApple-side change
 *
 * The issue that scoped this PR asked to check the canon migration's
 * platform enum and name any needed KroApple-side addition. Checked against
 * `zheref/KroApple@2117efc` (re-fetched at build time; the epic's pin was
 * `2c1ee45`, an ancestor with no Thirst-relevant diff):
 *
 *   - `supabase/migrations/20260607000000_thirst_backend.sql`'s
 *     `votes_platform_check` constraint already accepts
 *     `'ios' | 'android' | 'web' | 'windows'`.
 *   - `KroCore/Model/VotePlatform.swift`'s client-side enum already declares
 *     `case web`.
 *
 * So **no KroApple-side enum addition is needed** for this PR — the
 * assumption in the issue's "Note" does not hold for the canon this repo
 * pinned. `castVote` below writes `platform: 'web'` directly against the
 * live constraint; `ThirstService.test.ts`'s "unexpected platform-check
 * failure" case still proves the failure-shape handling exists (a rejected
 * insert degrades to a typed `unknown` exception, never a crash) for the
 * hypothetical the issue asked about, using the stub's scriptable failure —
 * see that test for the citation.
 *
 * ## No local vote-once cache
 *
 * Canon's `ThirstLocalCache` (a `UserDefaults` dictionary) exists so a
 * repeat tap is a no-op without a round-trip. This port skips it: the
 * server's `unique(feature_key, user_id)` constraint plus `hasVoted` already
 * make a repeat vote a no-op (`castVote`'s `23505` branch below), and a
 * second, browser-local cache would be new state to keep honest for no
 * behavior this issue's acceptance criteria ask for.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { ThirstExceptions, toThirstException } from '../../features/thirst/ThirstException'
import {
  type FeatureVoteCounts,
  type VotePlatform,
  emptyFeatureVoteCounts,
} from '../../features/thirst/ThirstModels'
import { thirstFeatureTitle } from '../../features/thirst/ThirstRegistry'
import type { SupabaseClientProvider } from '../supabase/SupabaseClientProvider'

const VOTES_TABLE = 'votes'
const VOTE_COUNTS_RPC = 'get_feature_vote_counts'
/** This app always casts from the web — canon's own accepted enum value. */
const WEB_VOTE_PLATFORM: VotePlatform = 'web'
/** Postgres `unique_violation` — the server's own vote-once guarantee
 * (`votes_feature_user_unique`). */
const UNIQUE_VIOLATION = '23505'

export interface ThirstServiceOperationOptions {
  readonly signal?: AbortSignal
}

export interface ThirstService {
  /** Casts the signed-in user's vote for `featureKey`, tagged `web`. `id` is
   * caller-minted (`RC-4`: a Service reads no random source — the Page
   * mints it). A vote already on the server (unique-constraint conflict)
   * converges quietly, matching canon's `castVote`. */
  castVote(
    featureKey: string,
    id: string,
    options?: ThirstServiceOperationOptions,
  ): Promise<void>
  /** Whether the signed-in user has already voted for `featureKey`. */
  hasVoted(
    featureKey: string,
    options?: ThirstServiceOperationOptions,
  ): Promise<boolean>
  /** Total + per-platform counts. Public — no session required. */
  fetchCounts(
    featureKey: string,
    options?: ThirstServiceOperationOptions,
  ): Promise<FeatureVoteCounts>
}

/** The `get_feature_vote_counts` RPC's row shape — wire, snake_case, exactly
 * as PostgREST returns it. */
interface VoteCountRow {
  readonly feature_key: string
  readonly platform: string
  readonly vote_count: number
  readonly total_count: number
}

const isVotePlatform = (value: string): value is VotePlatform =>
  value === 'ios' || value === 'android' || value === 'web' || value === 'windows'

const foldVoteCountRows = (
  featureKey: string,
  rows: readonly VoteCountRow[],
): FeatureVoteCounts => {
  if (rows.length === 0) return emptyFeatureVoteCounts(featureKey)
  const perPlatform: Partial<Record<VotePlatform, number>> = {}
  for (const row of rows) {
    if (!isVotePlatform(row.platform)) continue
    perPlatform[row.platform] = (perPlatform[row.platform] ?? 0) + row.vote_count
  }
  return { featureKey, total: rows[0]?.total_count ?? 0, perPlatform }
}

// ---------------------------------------------------------------------------
// Live
// ---------------------------------------------------------------------------

export interface LiveThirstServiceOptions {
  readonly clientProvider: SupabaseClientProvider
}

/**
 * A signed-in client, or the typed "sign in to vote" failure — canon's
 * `guard let currentUser else { throw .notSignedIn }`, widened to also cover
 * an unconfigured project: with no client at all there is no session to
 * have, which reads identically to this surface.
 */
const requireSignedInClient = async (
  provider: SupabaseClientProvider,
): Promise<{ readonly client: SupabaseClient; readonly username: string }> => {
  const client = provider.client()
  if (client === null) throw ThirstExceptions.notSignedIn()
  const { data, error } = await client.auth.getSession()
  if (error !== null) throw error
  const user = data.session?.user
  if (user === undefined) throw ThirstExceptions.notSignedIn()
  return { client, username: user.email ?? user.id }
}

export const makeLiveThirstService = (options: LiveThirstServiceOptions): ThirstService => {
  const { clientProvider } = options

  return {
    async castVote(featureKey, id) {
      const { client, username } = await requireSignedInClient(clientProvider)
      try {
        const { error } = await client.from(VOTES_TABLE).insert({
          id,
          feature_title: thirstFeatureTitle(featureKey) ?? featureKey,
          feature_key: featureKey,
          username,
          platform: WEB_VOTE_PLATFORM,
        })
        if (error !== null) {
          if (error.code === UNIQUE_VIOLATION) return
          throw error
        }
      } catch (error) {
        throw toThirstException(error)
      }
    },

    async hasVoted(featureKey) {
      const { client } = await requireSignedInClient(clientProvider)
      try {
        // RLS scopes SELECT to the caller's own rows (`votes_select_self`),
        // so any match means the current user has voted.
        const { data, error } = await client
          .from(VOTES_TABLE)
          .select('id')
          .eq('feature_key', featureKey)
        if (error !== null) throw error
        return (data ?? []).length > 0
      } catch (error) {
        throw toThirstException(error)
      }
    },

    async fetchCounts(featureKey) {
      const client = clientProvider.client()
      // Public data; an unconfigured project simply has none to show — not
      // a failure (mirrors `AuthService.signOut`'s "no client, nothing to
      // do" shape).
      if (client === null) return emptyFeatureVoteCounts(featureKey)
      try {
        const { data, error } = await client.rpc(VOTE_COUNTS_RPC, {
          p_feature_key: featureKey,
        })
        if (error !== null) throw error
        return foldVoteCountRows(featureKey, (data ?? []) as readonly VoteCountRow[])
      } catch (error) {
        throw toThirstException(error)
      }
    },
  }
}

// `library/store.ts` builds the live binding itself — `makeLiveThirstService({
// clientProvider: liveSupabaseClientProvider })` — the same shape
// `makeLiveAuthService` uses, rather than this module exporting a
// module-scoped singleton (which would have to guess which provider to
// close over).

// ---------------------------------------------------------------------------
// Stub
// ---------------------------------------------------------------------------

export type ThirstOperation = 'castVote' | 'hasVoted' | 'fetchCounts'

export interface StubbedThirstServiceOptions {
  /** Whether the stub reports a signed-in session. Defaults to `false` — the
   * honest default for a build with no project, matching
   * `stubbedAuthService`. */
  readonly signedIn?: boolean
  readonly initialCounts?: Readonly<Record<string, FeatureVoteCounts>>
  readonly initialVotedFeatureKeys?: readonly string[]
  /** Operations that should fail, and with what. */
  readonly failures?: Partial<Record<ThirstOperation, unknown>>
}

/** A stub that also records what was asked of it. */
export interface StubbedThirstService extends ThirstService {
  /** Every operation invoked, in order — the spy half of the double. */
  operations(): readonly ThirstOperation[]
  votedFeatureKeys(): readonly string[]
}

/**
 * The test/preview binding (`RC-33`).
 *
 * A real little state machine, not a bag of constants: `castVote` records
 * the id and bumps the `web` tally, `hasVoted` reports it back, so the
 * slice's arms are driven end to end without a network.
 */
export const makeStubbedThirstService = (
  options: StubbedThirstServiceOptions = {},
): StubbedThirstService => {
  const signedIn = options.signedIn ?? false
  const voted = new Set(options.initialVotedFeatureKeys ?? [])
  const counts = new Map<string, FeatureVoteCounts>(
    Object.entries(options.initialCounts ?? {}),
  )
  const invoked: ThirstOperation[] = []

  const record = (operation: ThirstOperation): void => {
    invoked.push(operation)
    const failure = options.failures?.[operation]
    if (failure !== undefined) throw failure
  }

  return {
    operations: () => [...invoked],
    votedFeatureKeys: () => [...voted],

    async castVote(featureKey, _id) {
      record('castVote')
      if (!signedIn) throw ThirstExceptions.notSignedIn()
      if (voted.has(featureKey)) return
      voted.add(featureKey)
      const current = counts.get(featureKey) ?? emptyFeatureVoteCounts(featureKey)
      counts.set(featureKey, {
        ...current,
        total: current.total + 1,
        perPlatform: {
          ...current.perPlatform,
          [WEB_VOTE_PLATFORM]: (current.perPlatform[WEB_VOTE_PLATFORM] ?? 0) + 1,
        },
      })
    },

    async hasVoted(featureKey) {
      record('hasVoted')
      if (!signedIn) throw ThirstExceptions.notSignedIn()
      return voted.has(featureKey)
    },

    async fetchCounts(featureKey) {
      record('fetchCounts')
      return counts.get(featureKey) ?? emptyFeatureVoteCounts(featureKey)
    },
  }
}

/** The default stub — signed out, no counts anywhere. */
export const stubbedThirstService: ThirstService = makeStubbedThirstService()
