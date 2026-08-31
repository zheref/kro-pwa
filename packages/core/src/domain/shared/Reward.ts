/**
 * `Reward` — canon `KroCore/Model/Reward.swift`.
 *
 * A user-defined prize claimed by spending earned points. Rewards are
 * independent of endeavors; only `pointsRequired` links them to the Earn
 * surface (#27/#28).
 *
 * Two canon defaults cannot survive the crossing into a platform-free tier:
 * `id: String = UUID().uuidString` and `dateAdded: Date = Date()`. Neither a
 * UUID source nor a clock exists here — `lib: ["ES2022"]`, `types: []` — and
 * smuggling one in would make every construction non-deterministic under test.
 * So both are **required** parameters, minted by the caller (the app tier owns
 * identity and time). `rewardSuggestions` therefore carries stable, readable
 * ids instead of freshly generated ones.
 */

export interface Reward {
  readonly id: string
  readonly title: string
  /** Emoji glyph displayed on the reward card. */
  readonly glyph: string
  /** How many points the user needs in order to claim this reward. */
  readonly pointsRequired: number
  readonly notes: string | null
  readonly dateAdded: Date
}

export interface RewardDraft {
  readonly id: string
  readonly title: string
  readonly glyph: string
  readonly pointsRequired: number
  readonly notes?: string | null
  readonly dateAdded: Date
}

/** Builds a `Reward`, defaulting only the field canon defaults to `nil`. */
export const makeReward = (draft: RewardDraft): Reward => ({
  id: draft.id,
  title: draft.title,
  glyph: draft.glyph,
  pointsRequired: draft.pointsRequired,
  notes: draft.notes ?? null,
  dateAdded: draft.dateAdded,
})

/**
 * `Reward.copyForInsertion()` — a fresh entry for the user's catalog, carrying
 * the suggestion's copy but the caller's identity and timestamp.
 */
export const rewardForInsertion = (
  reward: Reward,
  identity: { readonly id: string; readonly dateAdded: Date },
): Reward => ({
  id: identity.id,
  title: reward.title,
  glyph: reward.glyph,
  pointsRequired: reward.pointsRequired,
  notes: reward.notes,
  dateAdded: identity.dateAdded,
})

/**
 * The epoch stamped on every catalog suggestion. A suggestion is a template,
 * not an owned reward: it has no meaningful "added" moment until the user
 * inserts it, at which point `rewardForInsertion` replaces this.
 */
const SUGGESTION_EPOCH = new Date(0)

const suggestion = (
  id: string,
  title: string,
  glyph: string,
  pointsRequired: number,
): Reward => ({
  id,
  title,
  glyph,
  pointsRequired,
  notes: null,
  dateAdded: SUGGESTION_EPOCH,
})

/**
 * `Reward.suggestionsCatalog` — the opinionated starter set surfaced when the
 * user's catalog is empty. Titles, glyphs, point costs and order are canon.
 */
export const rewardSuggestions: readonly Reward[] = [
  suggestion('reward-suggestion-ps5-pro', 'Get a PS5 Pro', '🎮', 5000),
  suggestion('reward-suggestion-beach', 'Go to the Beach', '🏖️', 800),
  suggestion('reward-suggestion-intimate-time', 'Intimate Time', '💞', 600),
  suggestion('reward-suggestion-watch-tv', 'Watch TV', '📺', 100),
  suggestion(
    'reward-suggestion-doom-scroll',
    'Doom Scroll for 30 minutes',
    '📱',
    150,
  ),
  suggestion('reward-suggestion-cheat-meal', 'Have a Cheat Meal', '🍔', 400),
  suggestion('reward-suggestion-sneakers', 'New Pair of Sneakers', '👟', 1500),
  suggestion('reward-suggestion-movie-night', 'Movie Night', '🍿', 300),
  suggestion('reward-suggestion-spa-day', 'Spa Day', '💆', 1200),
  suggestion('reward-suggestion-takeout', 'Order Takeout', '🥡', 350),
  suggestion('reward-suggestion-boba-tea', 'Boba Tea', '🧋', 80),
  suggestion('reward-suggestion-weekend-trip', 'Weekend Trip', '🧳', 3500),
  suggestion('reward-suggestion-long-nap', 'Long Nap', '💤', 200),
  suggestion('reward-suggestion-gaming-marathon', 'Gaming Marathon', '🕹️', 700),
  suggestion('reward-suggestion-new-book', 'New Book', '📚', 450),
]
