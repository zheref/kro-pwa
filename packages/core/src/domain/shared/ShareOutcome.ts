/**
 * The share hand-off's domain vocabulary — what it says, and what it did.
 *
 * It lives here rather than beside the Service that performs it for a
 * structural reason: `check-uzf-boundaries.mjs` refuses a Producer that imports
 * anything under `services/`, because a Service reaches a Producer only through
 * `ThunkExtra` (`RC-6`, `RC-21`) — and a Producer still has to *name* the value
 * it resolves. So the union is domain vocabulary, the Service returns it, and
 * the Producer names it without ever importing the boundary that produced it.
 *
 * Canon presents `UIActivityViewController` and pops its child when the sheet
 * is dismissed *"(cancel or completion)"* — the two are deliberately not
 * distinguished, which is why `shared` and `dismissed` carry the same weight
 * here and differ only in the copy a surface may choose to show.
 */

export const ShareOutcome = {
  /** The share sheet completed. */
  shared: 'shared',
  /** The user dismissed the share sheet. Canon treats this as completion. */
  dismissed: 'dismissed',
  /** No share sheet; the blurb went to the clipboard instead. */
  copied: 'copied',
  /** Neither capability exists, or both failed. Nothing left the app. */
  unavailable: 'unavailable',
} as const

export type ShareOutcome = (typeof ShareOutcome)[keyof typeof ShareOutcome]

/** Every outcome, in the order they are documented above. */
export const shareOutcomes: readonly ShareOutcome[] = [
  ShareOutcome.shared,
  ShareOutcome.dismissed,
  ShareOutcome.copied,
  ShareOutcome.unavailable,
]

/**
 * The status line a surface shows once the hand-off resolved, or `null` when
 * there is nothing to say.
 *
 * `shared` and `dismissed` both say nothing: the sheet appeared and the user
 * decided, which needs no narration. The other two are the cases where what
 * happened is not what the control promised.
 */
export const shareOutcomeNotice = (outcome: ShareOutcome): string | null => {
  switch (outcome) {
    case ShareOutcome.shared:
    case ShareOutcome.dismissed:
      return null
    case ShareOutcome.copied:
      return 'Sharing is unavailable here, so the message was copied to your clipboard.'
    case ShareOutcome.unavailable:
      return 'Sharing is unavailable here, and the message could not be copied.'
  }
}

/**
 * `TriageFeature.shareText(for:)` — the Kro-branded blurb, verbatim.
 *
 * It lives beside the outcome rather than in one feature, because two surfaces
 * hand the same sentence off: Triage's Delegate quadrant and Find's `share`
 * row operation. A feature importing a sibling feature's module is what
 * `UZF-6` forbids outright, so the copy is domain vocabulary and both read it.
 */
export const endeavorShareText = (endeavorTitle: string): string =>
  `I'd like you to help with "${endeavorTitle}". (Shared from Kro.)`
