/**
 * The Suggestions lane — the port of canon's `applyGenerateSuggestions`
 * (`Kro/Application/Do/DoShifters.swift`), specified by `DoLanes.md` § 1.
 *
 * Integration nudges: one card per connectable source, *"suppressed once
 * dismissed for the session"*, and hidden entirely once the user has connected
 * that source. The whole lane is additionally gated on the
 * `do.showSuggestions` preference, and canon shows it only when at least one
 * card survives — an empty lane is not an empty state, it is no lane.
 *
 * ## Which sources exist on web
 *
 * Canon offers three: Google Calendar, Apple Reminders and Apple Calendar. The
 * epic puts both Apple hosts permanently out of scope for this product —
 * EventKit has no web counterpart and *"Google Calendar is the flagship
 * external host"* — so this port declares the one source that can actually be
 * connected here. Adding a source later is a member on `DoSuggestionSource`
 * plus a branch in `generateDoSuggestions`; nothing else changes, which is why
 * the per-source dismissal set is keyed by source rather than by a minted card
 * id.
 *
 * Canon keys dismissal on `SuggestionCardModel.id`, a hash of the card's copy.
 * Keying on the **source** instead is deliberate: it means re-wording a nudge
 * cannot resurrect one the user already dismissed.
 */

export const DoSuggestionSource = {
  googleCalendar: 'googleCalendar',
} as const

export type DoSuggestionSource =
  (typeof DoSuggestionSource)[keyof typeof DoSuggestionSource]

export const doSuggestionSources: readonly DoSuggestionSource[] = [
  DoSuggestionSource.googleCalendar,
]

/**
 * One nudge. The copy is canon's, verbatim; it lives in the domain tier rather
 * than the view because `RC-8`'s reasoning applies to any user-facing string
 * decided by a `kind` — a view that assembled it would let two surfaces drift.
 */
export interface DoSuggestion {
  readonly source: DoSuggestionSource
  readonly title: string
  readonly subtitle: string
  readonly actionTitle: string
}

/** What the lane needs to know about the world to decide what to offer. */
export interface DoIntegrationState {
  /** The `googleCalendar` feature flag. Canon's `isGoogleCalendarEnabled`. */
  readonly googleCalendarEnabled: boolean
  /** Whether the user has already linked their account. */
  readonly googleCalendarConnected: boolean
}

const GOOGLE_CALENDAR_SUGGESTION: DoSuggestion = {
  source: DoSuggestionSource.googleCalendar,
  title: 'Google Calendar',
  subtitle: 'See all your events in one place.',
  actionTitle: 'Connect',
}

/**
 * `applyGenerateSuggestions` — the cards to show, in canon's declaration order.
 *
 * Canon's Google clause is `isGoogleCalendarEnabled && !isGoogleCalendarConnected`:
 * the flag has to be on for the nudge to be *offerable*, and the account has to
 * be unlinked for it to still be *worth offering*.
 */
export const generateDoSuggestions = (input: {
  readonly integrations: DoIntegrationState
  readonly dismissedSources: readonly DoSuggestionSource[]
}): readonly DoSuggestion[] => {
  const dismissed = new Set(input.dismissedSources)
  const suggestions: DoSuggestion[] = []

  if (
    input.integrations.googleCalendarEnabled &&
    !input.integrations.googleCalendarConnected &&
    !dismissed.has(DoSuggestionSource.googleCalendar)
  ) {
    suggestions.push(GOOGLE_CALENDAR_SUGGESTION)
  }

  return suggestions
}

/**
 * `showSuggestions = userWantsSuggestions && !suggestions.isEmpty` — the
 * preference gate AND'd with "there is something to show".
 */
export const areDoSuggestionsVisible = (input: {
  readonly showSuggestionsPreference: boolean
  readonly suggestions: readonly DoSuggestion[]
}): boolean =>
  input.showSuggestionsPreference && input.suggestions.length > 0
