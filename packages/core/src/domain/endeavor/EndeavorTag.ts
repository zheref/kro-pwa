/**
 * `Endeavor.Tag` and `Endeavor.AttentionLevel` — canon
 * `KroCore/Model/Endeavor/Endeavor.swift`.
 *
 * Tags are **single-letter** raw values on the wire (`"O"`, `"D"`, `"S"`,
 * `"R"`, `"P"`, `"E"`) — canon encodes `tags?.map { $0.rawValue }` and decodes
 * with `compactMap { Tag(rawValue: $0) }`, silently dropping anything it does
 * not recognise. The letters are the compatibility surface with KroApple and
 * KroAndroid; the case names are for humans.
 *
 * `attentionLevel` and `allowsForBackground` are `internal` in canon (no
 * `public` modifier) but are the derived logic this port owes #7, so they are
 * exported here. Two canon results are worth noticing before assuming a bug:
 * `.medium` is declared on `AttentionLevel` but **no tag maps to it**, and
 * `.replica` maps to `.unknown`, so `allowsForBackground` is `false` for it —
 * an unknown attention level is not treated as a permissive one.
 */
import { assertNever } from '../../library/assertNever'

export const AttentionLevel = {
  auto: 'auto',
  medium: 'medium',
  demanding: 'demanding',
  unknown: 'unknown',
} as const

export type AttentionLevel =
  (typeof AttentionLevel)[keyof typeof AttentionLevel]

/** `AttentionLevel` cases, in canon declaration order. */
export const attentionLevels: readonly AttentionLevel[] = [
  AttentionLevel.auto,
  AttentionLevel.medium,
  AttentionLevel.demanding,
  AttentionLevel.unknown,
]

export const EndeavorTag = {
  onDesk: 'O',
  duringPerformanceActivity: 'D',
  session: 'S',
  replica: 'R',
  passive: 'P',
  engaging: 'E',
} as const

export type EndeavorTag = (typeof EndeavorTag)[keyof typeof EndeavorTag]

/** `Tag.allCases`, in canon declaration order. */
export const endeavorTags: readonly EndeavorTag[] = [
  EndeavorTag.onDesk,
  EndeavorTag.duringPerformanceActivity,
  EndeavorTag.session,
  EndeavorTag.replica,
  EndeavorTag.passive,
  EndeavorTag.engaging,
]

/**
 * `Tag(rawValue:)` — narrows a raw letter, or `null` when it names no case.
 * Canon's decoder `compactMap`s over this, so an unknown letter is dropped
 * rather than failing the whole record.
 */
export const endeavorTagFromRawValue = (raw: string): EndeavorTag | null =>
  endeavorTags.find((tag) => tag === raw) ?? null

/** Decodes a raw letter array the way canon's `init(from:)` does: lossily. */
export const endeavorTagsFromRawValues = (
  raws: readonly string[],
): readonly EndeavorTag[] =>
  raws
    .map(endeavorTagFromRawValue)
    .filter((tag): tag is EndeavorTag => tag !== null)

/** `Tag.attentionLevel`. */
export const endeavorTagAttentionLevel = (
  tag: EndeavorTag,
): AttentionLevel => {
  switch (tag) {
    case EndeavorTag.onDesk:
    case EndeavorTag.duringPerformanceActivity:
      return AttentionLevel.auto
    case EndeavorTag.session:
      return AttentionLevel.auto
    case EndeavorTag.replica:
      return AttentionLevel.unknown
    case EndeavorTag.passive:
      return AttentionLevel.auto
    case EndeavorTag.engaging:
      return AttentionLevel.demanding
    default:
      return assertNever(tag)
  }
}

/**
 * `Tag.allowsForBackground` — true only for `auto` and `medium` attention.
 * `engaging` (demanding) and `replica` (unknown) both answer `false`.
 */
export const endeavorTagAllowsForBackground = (tag: EndeavorTag): boolean => {
  const level = endeavorTagAttentionLevel(tag)
  return level === AttentionLevel.auto || level === AttentionLevel.medium
}
