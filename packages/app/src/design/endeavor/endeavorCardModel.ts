/**
 * `EndeavorCardModel` and the urgency / reward projections behind it — the port
 * of KroApple's `KroUI/Models/Endeavor+UI.swift` plus the model struct at the
 * head of `KroUI/Components/EndeavorCard.swift`.
 *
 * WHY THESE LIVE IN THE DESIGN TIER AND NOT IN `@kro/core`.
 * Canon put them in `KroUI`, not `KroCore`, with the reason written at the top
 * of the file: they "return UI-shape types … or strings tuned for card
 * rendering". `computedSymbol` is a keyword table that picks an emoji;
 * `computedUrgency` is a two-hour badge threshold. Neither is a business rule
 * the domain owes anyone — they are how a card decides what to draw. The port
 * keeps the same split, which is also what keeps `@kro/core` free of a
 * presentation concept it would otherwise have to version.
 *
 * `RC-14` and the domain boundary. Every component in this kit takes an
 * `EndeavorCardModel` — plain values, no methods, no store — never an
 * `Endeavor`. `endeavorCardModelFrom` is the ONE place the domain type is read,
 * and a caller that already has a view model never needs `@kro/core` at all.
 * That is canon's own `EndeavorCardModel.init(from:)` seam, kept.
 *
 * The clock is a parameter everywhere, matching `@kro/core`'s own rule: canon
 * reads `Date()` inside `computedUrgency`, which makes the badge matrix
 * impossible to test and impossible to story-board.
 */

import type { Endeavor, EndeavorStatus } from '@kro/core'
import { EndeavorKind } from '@kro/core'

/* ------------------------------------------------------------------------ */
/* Urgency                                                                   */
/* ------------------------------------------------------------------------ */

/** Canon's `EndeavorUrgency`. Derived from due-date proximity, never stored. */
export const EndeavorUrgency = {
  low: 'low',
  medium: 'medium',
  high: 'high',
} as const

export type EndeavorUrgency =
  (typeof EndeavorUrgency)[keyof typeof EndeavorUrgency]

/** `allCases`, in canon declaration order. Drives the story matrix. */
export const endeavorUrgencies: readonly EndeavorUrgency[] = [
  EndeavorUrgency.low,
  EndeavorUrgency.medium,
  EndeavorUrgency.high,
]

/** `EndeavorUrgency.displayTitle`. */
export function urgencyDisplayTitle(urgency: EndeavorUrgency): string {
  switch (urgency) {
    case EndeavorUrgency.low:
      return 'Low'
    case EndeavorUrgency.medium:
      return 'Medium'
    case EndeavorUrgency.high:
      return 'High'
  }
}

/** `EndeavorUrgency.iconName` — SF Symbol, resolved through `endeavorIcon`. */
export function urgencyIconSymbol(urgency: EndeavorUrgency) {
  switch (urgency) {
    case EndeavorUrgency.low:
      return 'arrow.down.circle' as const
    case EndeavorUrgency.medium:
      return 'exclamationmark.circle' as const
    case EndeavorUrgency.high:
      return 'exclamationmark.circle.fill' as const
  }
}

/**
 * `EndeavorUrgency.showsWarningIndicator` — the floating yellow circle.
 *
 * MEDIUM ONLY, and that is not a typo in canon: High already shouts through the
 * red pill, so the extra floating glyph is spent on the level that would
 * otherwise read as ordinary. `EndeavorCard.md` states it as a rule.
 */
export function urgencyShowsWarning(urgency: EndeavorUrgency): boolean {
  return urgency === EndeavorUrgency.medium
}

/** Hours between `now` and `due`; negative once the moment has passed. */
const hoursUntil = (due: Date, now: Date): number =>
  (due.getTime() - now.getTime()) / 3_600_000

/**
 * `Endeavor.computedUrgency` — overdue is High, due inside two hours is Medium,
 * everything else (including "no due date at all") is Low.
 */
export function computedUrgency(
  endeavor: Pick<Endeavor, 'due'>,
  now: Date,
): EndeavorUrgency {
  const { due } = endeavor
  if (due === null) return EndeavorUrgency.low
  if (due.getTime() < now.getTime()) return EndeavorUrgency.high
  return hoursUntil(due, now) <= 2
    ? EndeavorUrgency.medium
    : EndeavorUrgency.low
}

/* ------------------------------------------------------------------------ */
/* Reward                                                                    */
/* ------------------------------------------------------------------------ */

/** Canon's default when an endeavor names no session points. */
export const DEFAULT_REWARD_POINTS = 10

/** `Endeavor.computedReward` — `sessionPoints ?? 10`. */
export function computedReward(
  endeavor: Pick<Endeavor, 'sessionPoints'>,
): number {
  return endeavor.sessionPoints ?? DEFAULT_REWARD_POINTS
}

/* ------------------------------------------------------------------------ */
/* Title and symbol                                                          */
/* ------------------------------------------------------------------------ */

/**
 * A leading emoji, if the title opens with one.
 *
 * Canon tests the first Unicode scalar for `isEmoji && isEmojiPresentation`, or
 * `isEmoji && !isNumber` — the second clause exists purely to keep "1", "#" and
 * "*" (which Swift reports as emoji, because of the keycap sequences) out. The
 * web equivalent of "emoji, but not a digit or a keycap base" is
 * `\p{Extended_Pictographic}`, which excludes exactly those characters by
 * definition, so one property escape replaces both clauses.
 *
 * The trailing group consumes variation selectors, skin-tone modifiers and ZWJ
 * sequences, so "👩‍💻" and "🏋️" come back whole rather than as their first
 * scalar — a bug Swift's `Character`-based iteration does not have.
 */
const LEADING_EMOJI =
  /^\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier}|\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*/u

export function leadingEmoji(title: string): string | null {
  return LEADING_EMOJI.exec(title)?.[0] ?? null
}

/** `Endeavor.displayTitle` — the title with its leading emoji stripped. */
export function displayTitle(title: string): string {
  const emoji = leadingEmoji(title)
  if (emoji === null) return title
  return title.slice(emoji.length).trimStart()
}

/**
 * `Endeavor.computedSymbol` — the leading emoji, else a keyword match, else
 * the clipboard fallback.
 *
 * The table is canon's, in canon's order, and order matters: "review the code"
 * matches `review` before `read`, and a reshuffle silently changes what a card
 * draws.
 */
const SYMBOL_KEYWORDS: ReadonlyArray<readonly [readonly string[], string]> = [
  [['present', 'slide'], '📊'],
  [['review', 'pull request', 'code'], '💻'],
  [['grocer', 'shop', 'buy'], '🛒'],
  [['tax', 'document', 'receipt'], '🧾'],
  [['email', 'reply', 'mail'], '✉️'],
  [['renew', 'member', 'subscri'], '🎫'],
  [['call', 'phone'], '📞'],
  [['clean', 'laundry'], '🧹'],
  [['cook', 'breakfast', 'lunch'], '🍳'],
  [['pay', 'mortgage', 'bill'], '💰'],
  [['exercise', 'gym', 'workout'], '🏋️'],
  [['read', 'book'], '📚'],
  [['write', 'blog'], '✍️'],
  [['meet'], '🤝'],
]

/** Canon's `return "📋"` — the symbol an endeavor gets when nothing matches. */
export const FALLBACK_SYMBOL = '📋'

export function computedSymbol(title: string): string {
  const emoji = leadingEmoji(title)
  if (emoji !== null) return emoji

  const lower = title.toLowerCase()
  for (const [keywords, symbol] of SYMBOL_KEYWORDS) {
    if (keywords.some((keyword) => lower.includes(keyword))) return symbol
  }
  return FALLBACK_SYMBOL
}

/* ------------------------------------------------------------------------ */
/* The card model                                                            */
/* ------------------------------------------------------------------------ */

/**
 * Everything a card or row needs to render one endeavor — canon's
 * `EndeavorCardModel`, which is described there as "architecture-free" for the
 * same reason it is `readonly` here.
 *
 * `reward` is the point amount rather than canon's one-field `EndeavorReward`
 * struct: the struct exists in Swift to hang `displayString` off, and that
 * string ("⚡50") is assembled by the badge here from a glyph and a number, so
 * the wrapper would carry nothing.
 */
export interface EndeavorCardModel {
  readonly id: string
  readonly urgency: EndeavorUrgency
  /** Reward points. Canon's `EndeavorReward.amount`. */
  readonly reward: number
  /** The emoji drawn large in the card's centre. */
  readonly symbol: string
  readonly title: string
  /** Events read from `start`; tasks from `due`. Canon's `start ?? due`. */
  readonly dueTime: Date | null
  /** Seconds. */
  readonly duration: number | null
  readonly status: EndeavorStatus
  /** The floating yellow circle at (−6, −6). */
  readonly showWarning: boolean
  /** Events cannot be "completed" — they are skipped. */
  readonly isEvent: boolean
}

/**
 * `EndeavorCardModel.init(from:)`.
 *
 * The one place in this kit that reads an `Endeavor`. `now` is explicit because
 * `urgency` and `showWarning` are both clock-relative and would otherwise make
 * every snapshot of this kit a function of when the suite ran.
 */
export function endeavorCardModelFrom(
  endeavor: Endeavor,
  now: Date,
): EndeavorCardModel {
  const urgency = computedUrgency(endeavor, now)
  return {
    id: endeavor.id,
    urgency,
    reward: computedReward(endeavor),
    symbol: computedSymbol(endeavor.title),
    title: displayTitle(endeavor.title),
    dueTime: endeavor.start ?? endeavor.due,
    duration: endeavor.duration,
    status: endeavor.status,
    showWarning: urgencyShowsWarning(urgency),
    isEvent: endeavor.kind === EndeavorKind.calendarEvent,
  }
}
