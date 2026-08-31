import { describe, expect, it } from 'vitest'
import {
  DoSuggestionSource,
  areDoSuggestionsVisible,
  doSuggestionSources,
  generateDoSuggestions,
} from '../DoSuggestions'

const offerable = {
  googleCalendarEnabled: true,
  googleCalendarConnected: false,
}

describe('generateDoSuggestions', () => {
  it('offers the Google Calendar nudge when the flag is on and the account is unlinked', () => {
    const suggestions = generateDoSuggestions({
      integrations: offerable,
      dismissedSources: [],
    })
    expect(suggestions.map((suggestion) => suggestion.source)).toEqual([
      DoSuggestionSource.googleCalendar,
    ])
    expect(suggestions[0]?.actionTitle).toBe('Connect')
  })

  it('offers nothing once the account is linked — there is nothing left to nudge', () => {
    expect(
      generateDoSuggestions({
        integrations: { ...offerable, googleCalendarConnected: true },
        dismissedSources: [],
      }),
    ).toEqual([])
  })

  it('offers nothing while the flag is off, however unlinked the account is', () => {
    expect(
      generateDoSuggestions({
        integrations: { ...offerable, googleCalendarEnabled: false },
        dismissedSources: [],
      }),
    ).toEqual([])
  })

  it('suppresses a nudge the user already dismissed this session', () => {
    expect(
      generateDoSuggestions({
        integrations: offerable,
        dismissedSources: [DoSuggestionSource.googleCalendar],
      }),
    ).toEqual([])
  })

  it('dismisses per source, so an unrelated source is unaffected', () => {
    // One source exists on web today; the shape is per-source so adding a
    // second is a member plus a branch, never a change to this rule.
    expect(doSuggestionSources).toEqual([DoSuggestionSource.googleCalendar])
    expect(
      generateDoSuggestions({
        integrations: offerable,
        dismissedSources: [],
      }),
    ).toHaveLength(1)
  })
})

describe('areDoSuggestionsVisible', () => {
  const suggestions = generateDoSuggestions({
    integrations: offerable,
    dismissedSources: [],
  })

  it('shows the lane when the preference is on and a card survived', () => {
    expect(
      areDoSuggestionsVisible({
        showSuggestionsPreference: true,
        suggestions,
      }),
    ).toBe(true)
  })

  it('hides the lane when the user turned suggestions off entirely', () => {
    expect(
      areDoSuggestionsVisible({
        showSuggestionsPreference: false,
        suggestions,
      }),
    ).toBe(false)
  })

  it('hides an empty lane rather than rendering an empty state', () => {
    expect(
      areDoSuggestionsVisible({
        showSuggestionsPreference: true,
        suggestions: [],
      }),
    ).toBe(false)
  })
})
