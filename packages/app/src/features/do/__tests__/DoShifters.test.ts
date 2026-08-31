import { EndeavorKind, EndeavorStatus, makeEndeavor } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { DoExceptions } from '../DoException'
import { defaultDoPreferences, initialDoState } from '../DoFeature'
import {
  DO_MOCK_NOW,
  doEndeavorFixtures,
  doFixtureDay,
  doMockAt,
  doStateMocks,
} from '../DoMocks'
import { DoLane, doCardKey, initialDoVisibility } from '../DoRules'
import {
  withAutoAdvanced,
  withBackdatingCancelled,
  withBackdatingRequested,
  withCardSelected,
  withEndeavorsInstalled,
  withException,
  withFetchStarted,
  withLoadedAt,
  withMarkCompleteModeToggled,
  withOptimisticallyCompleted,
  withPreferencesApplied,
  withScrollRequestHandled,
  withSuggestionDismissed,
  withSuggestionsRefreshed,
  withVisibilityApplied,
} from '../DoShifters'
import { DoSuggestionSource } from '../DoSuggestions'

const loaded = doStateMocks.loadedTypicalDay

describe('withEndeavorsInstalled', () => {
  it('splits one snapshot into the four channels, habits landing in tasks too', () => {
    const next = withEndeavorsInstalled(initialDoState, doFixtureDay, DO_MOCK_NOW)
    expect(next.habits.map((endeavor) => endeavor.id)).toContain(
      doEndeavorFixtures.habitDueSoon.id,
    )
    expect(next.tasks.map((endeavor) => endeavor.id)).toContain(
      doEndeavorFixtures.habitDueSoon.id,
    )
    expect(next.events.map((endeavor) => endeavor.id)).toEqual([
      doEndeavorFixtures.eventToday.id,
    ])
    expect(next.reminders.map((endeavor) => endeavor.id)).toContain(
      doEndeavorFixtures.reminderDueToday.id,
    )
  })

  it('partitions and stamps the clock in the same pass', () => {
    const next = withEndeavorsInstalled(initialDoState, doFixtureDay, DO_MOCK_NOW)
    expect(next.clockAnchor).toEqual(DO_MOCK_NOW)
    expect(next.load).toEqual({ kind: 'loaded' })
    expect(next.lanes.overdue.length).toBeGreaterThan(0)
  })

  it('replaces the previous day wholesale rather than merging into it', () => {
    const next = withEndeavorsInstalled(loaded, [], DO_MOCK_NOW)
    expect(next.tasks).toEqual([])
    expect(next.lanes.overdue).toEqual([])
    expect(next.lanes.completedToday).toEqual([])
  })

  it('collapses a duplicate row so one endeavor is presented once', () => {
    const twice = [
      doEndeavorFixtures.overdueThisMorning,
      { ...doEndeavorFixtures.overdueThisMorning, title: 'Send the invoice v2' },
    ]
    const next = withEndeavorsInstalled(initialDoState, twice, DO_MOCK_NOW)
    expect(next.lanes.overdue).toHaveLength(1)
  })
})

describe('withLoadedAt', () => {
  it('classifies the retained day against the instant it is given', () => {
    const seeded = { ...loaded, lanes: initialDoState.lanes, clockAnchor: null }
    const next = withLoadedAt(seeded, DO_MOCK_NOW)
    expect(next.clockAnchor).toEqual(DO_MOCK_NOW)
    expect(next.lanes.overdue.length).toBeGreaterThan(0)
  })

  it('re-partitions the same day differently later in the day', () => {
    // At 19:00 the 18:00 task is overdue rather than Next.
    const evening = withLoadedAt(loaded, doMockAt(17, 19, 0))
    expect(evening.lanes.overdue.map((endeavor) => endeavor.id)).toContain(
      doEndeavorFixtures.dueLateToday.id,
    )
    expect(evening.lanes.next).toEqual([])
  })

  it('leaves an empty day empty', () => {
    const next = withLoadedAt(doStateMocks.loadedEmptyDay, DO_MOCK_NOW)
    expect(next.lanes.now).toEqual([])
  })
})

describe('withFetchStarted / withException', () => {
  it('clears a prior exception when a new read starts', () => {
    const failed = withException(loaded, DoExceptions.fetchFailed('boom'))
    expect(withFetchStarted(failed).load).toEqual({ kind: 'loading' })
  })

  it('keeps the retained day intact through a failure', () => {
    const failed = withException(loaded, DoExceptions.fetchFailed('boom'))
    expect(failed.lanes).toEqual(loaded.lanes)
    expect(failed.tasks).toEqual(loaded.tasks)
  })

  it('carries the typed exception, not a bare message', () => {
    const failed = withException(
      initialDoState,
      DoExceptions.clearExpiredRefreshFailed(),
    )
    expect(failed.load).toEqual({
      kind: 'failed',
      exception: DoExceptions.clearExpiredRefreshFailed(),
    })
  })
})

describe('withPreferencesApplied', () => {
  it('re-partitions when the Due Soon window widens', () => {
    const wider = withPreferencesApplied(loaded, {
      ...defaultDoPreferences,
      nowThresholdHours: 12,
    })
    // The 18:00 task was Next at a two-hour window; twelve hours takes it.
    expect(wider.lanes.now.map((endeavor) => endeavor.id)).toContain(
      doEndeavorFixtures.dueLateToday.id,
    )
    expect(wider.lanes.next).toEqual([])
  })

  it('regenerates the suggestions the new flags allow', () => {
    const next = withPreferencesApplied(loaded, {
      ...defaultDoPreferences,
      googleCalendarEnabled: true,
    })
    expect(next.suggestions).toHaveLength(1)
  })

  it('skips the regroup before the first clock stamp — there is no instant yet', () => {
    const next = withPreferencesApplied(initialDoState, defaultDoPreferences)
    expect(next.clockAnchor).toBeNull()
    expect(next.lanes).toEqual(initialDoState.lanes)
  })
})

describe('withVisibilityApplied', () => {
  it('empties the lane whose computed state the user hid', () => {
    const next = withVisibilityApplied(
      loaded,
      { ...initialDoVisibility, hiddenComputedStates: ['expired'] },
      DO_MOCK_NOW,
    )
    expect(next.lanes.expired).toEqual([])
  })

  it('leaves the raw channels untouched, so the rings cannot move', () => {
    const next = withVisibilityApplied(
      loaded,
      { ...initialDoVisibility, hiddenKinds: [EndeavorKind.habit] },
      DO_MOCK_NOW,
    )
    expect(next.habits).toEqual(loaded.habits)
    expect(next.tasks).toEqual(loaded.tasks)
  })

  it('restores the hidden lane when the selection is cleared again', () => {
    const hidden = withVisibilityApplied(
      loaded,
      { ...initialDoVisibility, hiddenComputedStates: ['expired'] },
      DO_MOCK_NOW,
    )
    const shown = withVisibilityApplied(hidden, initialDoVisibility, DO_MOCK_NOW)
    expect(shown.lanes.expired).toEqual(loaded.lanes.expired)
  })
})

describe('withSuggestionsRefreshed / withSuggestionDismissed', () => {
  const offering = {
    ...loaded,
    preferences: { ...loaded.preferences, googleCalendarEnabled: true },
  }

  it('offers the connect nudge once the flag turns on', () => {
    expect(withSuggestionsRefreshed(offering).suggestions).toHaveLength(1)
  })

  it('drops the nudge for good once dismissed', () => {
    const dismissed = withSuggestionDismissed(
      withSuggestionsRefreshed(offering),
      DoSuggestionSource.googleCalendar,
    )
    expect(dismissed.suggestions).toEqual([])
    expect(dismissed.dismissedSuggestionSources).toEqual([
      DoSuggestionSource.googleCalendar,
    ])
  })

  it('is a no-op when the same source is dismissed twice', () => {
    const once = withSuggestionDismissed(
      offering,
      DoSuggestionSource.googleCalendar,
    )
    const twice = withSuggestionDismissed(
      once,
      DoSuggestionSource.googleCalendar,
    )
    expect(twice).toBe(once)
  })
})

describe('withCardSelected', () => {
  it('prepares the tapped card', () => {
    const next = withCardSelected(loaded, DoLane.overdue, 'abc')
    expect(next.selectedCardKey).toBe(doCardKey(DoLane.overdue, 'abc'))
  })

  it('un-prepares it on a second tap', () => {
    const once = withCardSelected(loaded, DoLane.overdue, 'abc')
    expect(withCardSelected(once, DoLane.overdue, 'abc').selectedCardKey).toBeNull()
  })

  it('never arms the auto-advance scroll — a manual tap must not move the surface', () => {
    const advanced = { ...loaded, shouldScrollToCurrentCard: true }
    expect(
      withCardSelected(advanced, DoLane.now, 'abc').shouldScrollToCurrentCard,
    ).toBe(false)
  })
})

describe('withMarkCompleteModeToggled', () => {
  it('clears the preparation cursor on the way in', () => {
    const prepared = withCardSelected(loaded, DoLane.now, 'abc')
    const next = withMarkCompleteModeToggled(prepared)
    expect(next.isInMarkCompleteMode).toBe(true)
    expect(next.selectedCardKey).toBeNull()
  })

  it('closes a half-open completion popover on the way in', () => {
    const opened = withBackdatingRequested(loaded, 'abc', DO_MOCK_NOW)
    expect(withMarkCompleteModeToggled(opened).backdating).toBeNull()
  })

  it('leaves the cursor alone on the way out', () => {
    const inMode = withMarkCompleteModeToggled(loaded)
    const back = withMarkCompleteModeToggled({
      ...inMode,
      selectedCardKey: 'now:abc',
    })
    expect(back.isInMarkCompleteMode).toBe(false)
    expect(back.selectedCardKey).toBe('now:abc')
  })
})

describe('withScrollRequestHandled', () => {
  it('spends the auto-advance one-shot', () => {
    const armed = { ...loaded, shouldScrollToCurrentCard: true }
    expect(withScrollRequestHandled(armed).shouldScrollToCurrentCard).toBe(false)
  })

  it('spends the overdue-jump one-shot', () => {
    const armed = { ...loaded, shouldScrollToOverdue: true }
    expect(withScrollRequestHandled(armed).shouldScrollToOverdue).toBe(false)
  })

  it('is harmless when neither is armed', () => {
    const next = withScrollRequestHandled(loaded)
    expect(next.shouldScrollToCurrentCard).toBe(false)
    expect(next.shouldScrollToOverdue).toBe(false)
  })
})

describe('withBackdatingRequested / withBackdatingCancelled', () => {
  const yesterday = doMockAt(16, 18, 0)

  it('opens the popover on a card at an instant', () => {
    const next = withBackdatingRequested(loaded, 'abc', yesterday)
    expect(next.backdating).toEqual({
      endeavorId: 'abc',
      completionDate: yesterday,
    })
  })

  it('re-aims an already-open popover rather than opening a second', () => {
    const once = withBackdatingRequested(loaded, 'abc', yesterday)
    const again = withBackdatingRequested(once, 'abc', DO_MOCK_NOW)
    expect(again.backdating).toEqual({
      endeavorId: 'abc',
      completionDate: DO_MOCK_NOW,
    })
  })

  it('cancels to a no-op when nothing was open', () => {
    expect(withBackdatingCancelled(loaded)).toBe(loaded)
  })
})

describe('withOptimisticallyCompleted', () => {
  const targetId = doEndeavorFixtures.overdueThisMorning.id

  it('moves the card out of Overdue and into Completed Today at once', () => {
    const next = withOptimisticallyCompleted(
      loaded,
      targetId,
      DO_MOCK_NOW,
      DO_MOCK_NOW,
    )
    expect(next.lanes.overdue.map((endeavor) => endeavor.id)).not.toContain(targetId)
    expect(next.lanes.completedToday.map((endeavor) => endeavor.id)).toContain(
      targetId,
    )
  })

  it('advances the emerald ring on the same tap', () => {
    const before = loaded.tasks.filter(
      (endeavor) => endeavor.id === targetId,
    )[0]
    expect(before?.completed).toBeNull()
    const next = withOptimisticallyCompleted(
      loaded,
      targetId,
      DO_MOCK_NOW,
      DO_MOCK_NOW,
    )
    const after = next.tasks.find((endeavor) => endeavor.id === targetId)
    expect(after?.status).toBe(EndeavorStatus.closed)
    expect(after?.completed).toEqual(DO_MOCK_NOW)
  })

  it('keeps a completion backdated to yesterday out of today’s record', () => {
    const next = withOptimisticallyCompleted(
      loaded,
      targetId,
      doMockAt(16, 18, 0),
      DO_MOCK_NOW,
    )
    expect(next.lanes.completedToday.map((endeavor) => endeavor.id)).not.toContain(
      targetId,
    )
    expect(next.lanes.overdue.map((endeavor) => endeavor.id)).not.toContain(targetId)
  })

  it('re-mirrors the habit channel when the completed card was a habit', () => {
    const next = withOptimisticallyCompleted(
      loaded,
      doEndeavorFixtures.habitDueSoon.id,
      DO_MOCK_NOW,
      DO_MOCK_NOW,
    )
    const habit = next.habits.find(
      (endeavor) => endeavor.id === doEndeavorFixtures.habitDueSoon.id,
    )
    expect(habit?.status).toBe(EndeavorStatus.closed)
  })

  it('is a no-op for an id the day does not hold', () => {
    expect(
      withOptimisticallyCompleted(loaded, 'no-such-card', DO_MOCK_NOW, DO_MOCK_NOW),
    ).toBe(loaded)
  })

  it('closes the completion popover it was confirmed from', () => {
    const opened = withBackdatingRequested(loaded, targetId, DO_MOCK_NOW)
    const next = withOptimisticallyCompleted(
      opened,
      targetId,
      DO_MOCK_NOW,
      DO_MOCK_NOW,
    )
    expect(next.backdating).toBeNull()
  })
})

describe('withAutoAdvanced', () => {
  const enabled = doStateMocks.autoAdvanceEnabled

  it('clears focus without jumping when the preference is off', () => {
    const prepared = withCardSelected(loaded, DoLane.now, 'abc')
    const next = withAutoAdvanced(prepared)
    expect(next.selectedCardKey).toBeNull()
    expect(next.shouldScrollToCurrentCard).toBe(false)
  })

  it('focuses the featured hero and arms the scroll when it is on', () => {
    const next = withAutoAdvanced(enabled)
    const hero = enabled.lanes.featuredNow[
      Math.floor(enabled.lanes.featuredNow.length / 2)
    ]
    expect(next.selectedCardKey).toBe(doCardKey(DoLane.featured, hero?.id ?? ''))
    expect(next.shouldScrollToCurrentCard).toBe(true)
  })

  it('clears focus in bulk mark-complete mode, which has no cursor to advance', () => {
    const bulk = { ...enabled, isInMarkCompleteMode: true }
    const next = withAutoAdvanced(bulk)
    expect(next.selectedCardKey).toBeNull()
    expect(next.shouldScrollToCurrentCard).toBe(false)
  })

  it('clears focus without jumping when nothing actionable is left', () => {
    const emptied = {
      ...doStateMocks.loadedEmptyDay,
      preferences: {
        ...doStateMocks.loadedEmptyDay.preferences,
        autoAdvanceAfterComplete: true,
      },
    }
    const next = withAutoAdvanced(emptied)
    expect(next.selectedCardKey).toBeNull()
    expect(next.shouldScrollToCurrentCard).toBe(false)
  })

  it('walks the documented order after each completion until the day is empty', () => {
    // A three-card day: one overdue, one due soon, one anytime. Completing the
    // focused card each time must land on the next card the order names.
    const cards = [
      makeEndeavor({
        id: 'a-overdue',
        title: 'a',
        kind: EndeavorKind.task,
        due: doMockAt(17, 8, 0),
      }),
      makeEndeavor({
        id: 'b-due-soon',
        title: 'b',
        kind: EndeavorKind.task,
        due: doMockAt(17, 11, 0),
      }),
      makeEndeavor({
        id: 'c-anytime',
        title: 'c',
        kind: EndeavorKind.task,
        status: EndeavorStatus.ongoing,
      }),
    ]
    let state = withEndeavorsInstalled(
      {
        ...initialDoState,
        preferences: {
          ...defaultDoPreferences,
          autoAdvanceAfterComplete: true,
        },
      },
      cards,
      DO_MOCK_NOW,
    )

    const walk: (string | null)[] = []
    for (let step = 0; step < 4; step += 1) {
      state = withAutoAdvanced(state)
      walk.push(state.selectedCardKey)
      const focusedId = state.selectedCardKey?.split(':')[1]
      if (focusedId === undefined) break
      state = withOptimisticallyCompleted(
        state,
        focusedId,
        DO_MOCK_NOW,
        DO_MOCK_NOW,
      )
    }

    expect(walk).toEqual([
      // The overdue card scores 110 and is the hero.
      doCardKey(DoLane.featured, 'a-overdue'),
      // Then the due-soon card, still via the featured lane.
      doCardKey(DoLane.featured, 'b-due-soon'),
      // Then the ongoing card, which the featured lane also ranks.
      doCardKey(DoLane.featured, 'c-anytime'),
      // Nothing left: focus clears rather than jumping.
      null,
    ])
  })
})
