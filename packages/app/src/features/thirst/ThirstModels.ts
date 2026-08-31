/**
 * Thirst's domain shapes — canon `KroCore/Model/VotePlatform.swift` +
 * `FeatureVoteCounts.swift` (epic #83), ported for `#35`.
 *
 * ## Why these live in the feature and not in `@kro/core`
 *
 * `07-models-mocks-mappers.md` puts a domain Model in `packages/core/models/`
 * by default. That package is outside this issue's declared file lane
 * (`packages/app/src/features/thirst/**`,
 * `packages/app/src/services/thirst/**` only), so `VotePlatform` and
 * `FeatureVoteCounts` are co-located here instead — the same exception
 * `07`'s Mapper rule already carves out for a mapping that is "genuinely
 * feature-local". Named as a divergence in the PR; promoting these two types
 * into `@kro/core` (alongside `User`/`AuthProvider`, which Auth's own domain
 * types already prove the pattern for) is a natural follow-up once a session
 * holds that lane.
 */
import { assertNever } from '@kro/core'

/**
 * The platform a vote was cast from — canon's `ios | android | web |
 * windows`, already the accepted `votes.platform` CHECK-constraint set
 * (`zheref/KroApple@2117efc`'s
 * `supabase/migrations/20260607000000_thirst_backend.sql`). This app always
 * casts `web` (`ThirstService.ts`).
 */
export const VotePlatform = {
  ios: 'ios',
  android: 'android',
  web: 'web',
  windows: 'windows',
} as const

export type VotePlatform = (typeof VotePlatform)[keyof typeof VotePlatform]

/** Canon's declaration order — also the order platform chips render in. */
export const ALL_VOTE_PLATFORMS: readonly VotePlatform[] = [
  VotePlatform.ios,
  VotePlatform.android,
  VotePlatform.web,
  VotePlatform.windows,
]

/** The label a platform chip's accessible name reads. */
export function votePlatformLabel(platform: VotePlatform): string {
  switch (platform) {
    case VotePlatform.ios:
      return 'iOS'
    case VotePlatform.android:
      return 'Android'
    case VotePlatform.web:
      return 'Web'
    case VotePlatform.windows:
      return 'Windows'
    default:
      return assertNever(platform)
  }
}

/** Aggregated Thirst vote counts for one feature — canon's `FeatureVoteCounts`. */
export interface FeatureVoteCounts {
  readonly featureKey: string
  readonly total: number
  readonly perPlatform: Readonly<Partial<Record<VotePlatform, number>>>
}

/** No votes yet — canon's `FeatureVoteCounts.empty(featureKey:)`. */
export function emptyFeatureVoteCounts(featureKey: string): FeatureVoteCounts {
  return { featureKey, total: 0, perPlatform: {} }
}

/** Canon's `FeatureVoteCounts.count(for:)`. */
export function countFor(counts: FeatureVoteCounts, platform: VotePlatform): number {
  return counts.perPlatform[platform] ?? 0
}

/**
 * The local optimistic bump a confirmed `web` vote applies — canon's
 * `applyVoteResult`'s `perPlatform[.ios, default: 0] += 1`, ported to the
 * platform this app casts from. Pure: takes the prior counts (or `null`, for
 * a vote confirmed before any count ever loaded) and returns a new value.
 */
export function bumpVotePlatform(
  counts: FeatureVoteCounts | null,
  featureKey: string,
  platform: VotePlatform,
): FeatureVoteCounts {
  const base = counts ?? emptyFeatureVoteCounts(featureKey)
  return {
    ...base,
    total: base.total + 1,
    perPlatform: { ...base.perPlatform, [platform]: countFor(base, platform) + 1 },
  }
}

/** One platform's slice of the count, for the breakdown row. */
export interface PlatformVoteTally {
  readonly platform: VotePlatform
  readonly count: number
}

/**
 * Per-platform tallies for the breakdown row, in canon's stable platform
 * order, including only platforms with at least one vote — canon's
 * `perPlatformTalliesSelector`.
 */
export function perPlatformTalliesFor(
  counts: FeatureVoteCounts,
): readonly PlatformVoteTally[] {
  return ALL_VOTE_PLATFORMS.map((platform) => ({
    platform,
    count: countFor(counts, platform),
  })).filter((tally) => tally.count > 0)
}

/**
 * The composed status a vote surface renders — canon's `ThirstVoteStatus`
 * (`KroUI/ComingSoon/ComingSoonView.swift`), as a discriminated union rather
 * than an enum-with-associated-value so the `unavailable` message is typed
 * rather than read back out of a `switch`.
 */
export type ThirstVoteStatus =
  | { readonly kind: 'loading' }
  | { readonly kind: 'votable' }
  | { readonly kind: 'voted' }
  | { readonly kind: 'unavailable'; readonly message: string }
  | { readonly kind: 'notVotable' }
