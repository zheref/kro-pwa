import { EndeavorKind, EndeavorStatus } from '@kro/core'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DoExceptions } from '../DoException'
import {
  type DoState,
  childVisibilityDelegatedSelectionChanged,
  doSlice,
  initialDoState,
  onFeaturedCapacityChanged,
  onGoogleCalendarConnectionChanged,
  onScrollRequestHandled,
  onViewLoaded,
  userDidCancelBackdatedCompletion,
  userDidDeselectCard,
  userDidDismissSuggestion,
  userDidMarkCardComplete,
  userDidRequestBackdatedCompletion,
  userDidTapCard,
  userDidTapNotifications,
  userDidToggleMarkCompleteMode,
} from '../DoFeature'
import {
  DO_MOCK_NOW,
  doEndeavorFixtures,
  doMockAt,
  doStateMocks,
} from '../DoMocks'
import {
  clearExpiredThunk,
  fetchDoEndeavorsThunk,
  loadDoPreferencesThunk,
  markEndeavorCompleteThunk,
} from '../DoProducer'
import { DoLane, doCardKey, initialDoVisibility } from '../DoRules'
import { DoSuggestionSource } from '../DoSuggestions'

const reduce = (
  state: DoState,
  action: Parameters<typeof doSlice.reducer>[1],
) => doSlice.reducer(state, action)

const loaded = doStateMocks.loadedTypicalDay

const abortError = () => {
  const error = new Error('Aborted')
  error.name = 'AbortError'
  return error
}

// ---------------------------------------------------------------------------
// Lifecycle events
// ---------------------------------------------------------------------------

describe('onViewLoaded', () => {
  it('classifies the retained day against the instant it carries', () => {
    const stale = { ...loaded, lanes: initialDoState.lanes, clockAnchor: null }
    const next = reduce(stale, onViewLoaded({ now: DO_MOCK_NOW }))
    expect(next.clockAnchor).toEqual(DO_MOCK_NOW)
    expect(next.lanes.overdue.length).toBeGreaterThan(0)
  })

  it('re-classifies the same day later in the day', () => {
    const evening = reduce(loaded, onViewLoaded({ now: doMockAt(17, 19, 0) }))
    expect(evening.lanes.next).toEqual([])
  })

  it('leaves an untouched initial state empty rather than inventing lanes', () => {
    const next = reduce(initialDoState, onViewLoaded({ now: DO_MOCK_NOW }))
    expect(next.lanes.now).toEqual([])
    expect(next.clockAnchor).toEqual(DO_MOCK_NOW)
  })
})

describe('onFeaturedCapacityChanged', () => {
  it('records a wider window', () => {
    expect(
      reduce(loaded, onFeaturedCapacityChanged({ capacity: 9 }))
        .featuredCapacity,
    ).toBe(9)
  })

  it('leaves the arrangement untouched, so the hero does not move on resize', () => {
    const wider = reduce(loaded, onFeaturedCapacityChanged({ capacity: 7 }))
    expect(wider.lanes.featuredNow).toEqual(loaded.lanes.featuredNow)
  })

  it('is a no-op when the capacity has not actually changed', () => {
    const same = reduce(loaded, onFeaturedCapacityChanged({ capacity: 3 }))
    expect(same.featuredCapacity).toBe(loaded.featuredCapacity)
  })
})

describe('onGoogleCalendarConnectionChanged', () => {
  const offering: DoState = {
    ...loaded,
    preferences: { ...loaded.preferences, googleCalendarEnabled: true },
  }

  it('withdraws the connect nudge once the account is linked', () => {
    const offered = reduce(
      offering,
      onGoogleCalendarConnectionChanged({ isConnected: false }),
    )
    expect(offered.suggestions).toHaveLength(1)

    const linked = reduce(
      offered,
      onGoogleCalendarConnectionChanged({ isConnected: true }),
    )
    expect(linked.suggestions).toEqual([])
  })

  it('offers it again if the account is unlinked', () => {
    const linked = reduce(
      offering,
      onGoogleCalendarConnectionChanged({ isConnected: true }),
    )
    const unlinked = reduce(
      linked,
      onGoogleCalendarConnectionChanged({ isConnected: false }),
    )
    expect(unlinked.suggestions).toHaveLength(1)
  })

  it('offers nothing while the flag is off, whatever the account does', () => {
    const next = reduce(
      loaded,
      onGoogleCalendarConnectionChanged({ isConnected: false }),
    )
    expect(next.suggestions).toEqual([])
  })
})

describe('childVisibilityDelegatedSelectionChanged', () => {
  it('installs the selection and regroups in one step', () => {
    const next = reduce(
      loaded,
      childVisibilityDelegatedSelectionChanged({
        visibility: {
          ...initialDoVisibility,
          hiddenComputedStates: ['expired'],
        },
        now: DO_MOCK_NOW,
      }),
    )
    expect(next.lanes.expired).toEqual([])
    expect(next.visibility.hiddenComputedStates).toEqual(['expired'])
  })

  it('never touches the raw channels the rings read', () => {
    const next = reduce(
      loaded,
      childVisibilityDelegatedSelectionChanged({
        visibility: {
          ...initialDoVisibility,
          hiddenKinds: [EndeavorKind.habit],
        },
        now: DO_MOCK_NOW,
      }),
    )
    expect(next.habits).toEqual(loaded.habits)
  })

  it('restores everything when the selection is cleared', () => {
    const hidden = reduce(
      loaded,
      childVisibilityDelegatedSelectionChanged({
        visibility: {
          ...initialDoVisibility,
          hiddenComputedStates: ['overdue'],
        },
        now: DO_MOCK_NOW,
      }),
    )
    const shown = reduce(
      hidden,
      childVisibilityDelegatedSelectionChanged({
        visibility: initialDoVisibility,
        now: DO_MOCK_NOW,
      }),
    )
    expect(shown.lanes.overdue).toEqual(loaded.lanes.overdue)
  })
})

// ---------------------------------------------------------------------------
// Card preparation
// ---------------------------------------------------------------------------

describe('userDidTapCard', () => {
  it('prepares the tapped card', () => {
    const next = reduce(
      loaded,
      userDidTapCard({ section: DoLane.overdue, endeavorId: 'abc' }),
    )
    expect(next.selectedCardKey).toBe(doCardKey(DoLane.overdue, 'abc'))
  })

  it('un-prepares it when the same card is tapped again', () => {
    const once = reduce(
      loaded,
      userDidTapCard({ section: DoLane.overdue, endeavorId: 'abc' }),
    )
    const twice = reduce(
      once,
      userDidTapCard({ section: DoLane.overdue, endeavorId: 'abc' }),
    )
    expect(twice.selectedCardKey).toBeNull()
  })

  it('keeps the same endeavor in two lanes independently selectable', () => {
    const inNow = reduce(
      loaded,
      userDidTapCard({ section: DoLane.now, endeavorId: 'abc' }),
    )
    const inFeatured = reduce(
      inNow,
      userDidTapCard({ section: DoLane.featured, endeavorId: 'abc' }),
    )
    expect(inFeatured.selectedCardKey).toBe(doCardKey(DoLane.featured, 'abc'))
  })
})

describe('userDidDeselectCard', () => {
  it('clears the preparation cursor', () => {
    const prepared = reduce(
      loaded,
      userDidTapCard({ section: DoLane.now, endeavorId: 'abc' }),
    )
    expect(reduce(prepared, userDidDeselectCard()).selectedCardKey).toBeNull()
  })

  it('is harmless when nothing was prepared', () => {
    expect(reduce(loaded, userDidDeselectCard()).selectedCardKey).toBeNull()
  })

  it('leaves the lanes alone', () => {
    const next = reduce(loaded, userDidDeselectCard())
    expect(next.lanes).toEqual(loaded.lanes)
  })
})

describe('userDidToggleMarkCompleteMode', () => {
  it('enters bulk mode', () => {
    expect(
      reduce(loaded, userDidToggleMarkCompleteMode()).isInMarkCompleteMode,
    ).toBe(true)
  })

  it('drops the preparation cursor on the way in', () => {
    const prepared = reduce(
      loaded,
      userDidTapCard({ section: DoLane.now, endeavorId: 'abc' }),
    )
    expect(
      reduce(prepared, userDidToggleMarkCompleteMode()).selectedCardKey,
    ).toBeNull()
  })

  it('leaves bulk mode on a second toggle', () => {
    const inMode = reduce(loaded, userDidToggleMarkCompleteMode())
    expect(
      reduce(inMode, userDidToggleMarkCompleteMode()).isInMarkCompleteMode,
    ).toBe(false)
  })
})

describe('userDidTapNotifications', () => {
  it('arms the jump to Overdue when there is something to jump to', () => {
    expect(
      reduce(loaded, userDidTapNotifications()).shouldScrollToOverdue,
    ).toBe(true)
  })

  it('refuses to arm the jump on a day with nothing overdue', () => {
    expect(
      reduce(doStateMocks.loadedEmptyDay, userDidTapNotifications())
        .shouldScrollToOverdue,
    ).toBe(false)
  })

  it('does not disturb the preparation cursor', () => {
    const prepared = reduce(
      loaded,
      userDidTapCard({ section: DoLane.now, endeavorId: 'abc' }),
    )
    expect(reduce(prepared, userDidTapNotifications()).selectedCardKey).toBe(
      doCardKey(DoLane.now, 'abc'),
    )
  })
})

describe('onScrollRequestHandled', () => {
  it('spends the overdue jump', () => {
    const armed = reduce(loaded, userDidTapNotifications())
    expect(reduce(armed, onScrollRequestHandled()).shouldScrollToOverdue).toBe(
      false,
    )
  })

  it('spends the auto-advance scroll', () => {
    const armed: DoState = { ...loaded, shouldScrollToCurrentCard: true }
    expect(
      reduce(armed, onScrollRequestHandled()).shouldScrollToCurrentCard,
    ).toBe(false)
  })

  it('is harmless when nothing was armed', () => {
    const next = reduce(loaded, onScrollRequestHandled())
    expect(next.shouldScrollToOverdue).toBe(false)
    expect(next.shouldScrollToCurrentCard).toBe(false)
  })
})

describe('userDidDismissSuggestion', () => {
  const offering: DoState = {
    ...loaded,
    preferences: { ...loaded.preferences, googleCalendarEnabled: true },
  }

  it('removes the dismissed nudge', () => {
    const offered = reduce(
      offering,
      onGoogleCalendarConnectionChanged({ isConnected: false }),
    )
    const next = reduce(
      offered,
      userDidDismissSuggestion({ source: DoSuggestionSource.googleCalendar }),
    )
    expect(next.suggestions).toEqual([])
  })

  it('remembers the dismissal, so a later refresh does not resurrect it', () => {
    const dismissed = reduce(
      offering,
      userDidDismissSuggestion({ source: DoSuggestionSource.googleCalendar }),
    )
    const refreshed = reduce(
      dismissed,
      onGoogleCalendarConnectionChanged({ isConnected: false }),
    )
    expect(refreshed.suggestions).toEqual([])
  })

  it('is idempotent', () => {
    const once = reduce(
      offering,
      userDidDismissSuggestion({ source: DoSuggestionSource.googleCalendar }),
    )
    const twice = reduce(
      once,
      userDidDismissSuggestion({ source: DoSuggestionSource.googleCalendar }),
    )
    expect(twice.dismissedSuggestionSources).toEqual([
      DoSuggestionSource.googleCalendar,
    ])
  })
})

// ---------------------------------------------------------------------------
// Backdated completion
// ---------------------------------------------------------------------------

describe('userDidRequestBackdatedCompletion', () => {
  const yesterday = doMockAt(16, 18, 0)

  it('opens the popover aimed at a card and an instant', () => {
    const next = reduce(
      loaded,
      userDidRequestBackdatedCompletion({
        endeavorId: 'abc',
        completionDate: yesterday,
      }),
    )
    expect(next.backdating).toEqual({
      endeavorId: 'abc',
      completionDate: yesterday,
    })
  })

  it('steps the instant without opening a second popover', () => {
    const opened = reduce(
      loaded,
      userDidRequestBackdatedCompletion({
        endeavorId: 'abc',
        completionDate: yesterday,
      }),
    )
    const stepped = reduce(
      opened,
      userDidRequestBackdatedCompletion({
        endeavorId: 'abc',
        completionDate: DO_MOCK_NOW,
      }),
    )
    expect(stepped.backdating?.completionDate).toEqual(DO_MOCK_NOW)
  })

  it('re-aims at a different card', () => {
    const opened = reduce(
      loaded,
      userDidRequestBackdatedCompletion({
        endeavorId: 'abc',
        completionDate: yesterday,
      }),
    )
    const moved = reduce(
      opened,
      userDidRequestBackdatedCompletion({
        endeavorId: 'def',
        completionDate: yesterday,
      }),
    )
    expect(moved.backdating?.endeavorId).toBe('def')
  })
})

describe('userDidCancelBackdatedCompletion', () => {
  it('closes the popover', () => {
    const opened = reduce(
      loaded,
      userDidRequestBackdatedCompletion({
        endeavorId: 'abc',
        completionDate: DO_MOCK_NOW,
      }),
    )
    expect(
      reduce(opened, userDidCancelBackdatedCompletion()).backdating,
    ).toBeNull()
  })

  it('completes nothing on the way out', () => {
    const opened = reduce(
      loaded,
      userDidRequestBackdatedCompletion({
        endeavorId: doEndeavorFixtures.overdueThisMorning.id,
        completionDate: DO_MOCK_NOW,
      }),
    )
    const cancelled = reduce(opened, userDidCancelBackdatedCompletion())
    expect(cancelled.lanes.overdue).toEqual(loaded.lanes.overdue)
  })

  it('is harmless when no popover was open', () => {
    expect(reduce(loaded, userDidCancelBackdatedCompletion())).toBe(loaded)
  })
})

// ---------------------------------------------------------------------------
// Completion + auto-advance
// ---------------------------------------------------------------------------

describe('userDidMarkCardComplete', () => {
  const targetId = doEndeavorFixtures.overdueThisMorning.id

  it('moves the card into Completed Today at the tap', () => {
    const next = reduce(
      loaded,
      userDidMarkCardComplete({
        endeavorId: targetId,
        completionDate: DO_MOCK_NOW,
        now: DO_MOCK_NOW,
      }),
    )
    expect(next.lanes.completedToday.map((endeavor) => endeavor.id)).toContain(
      targetId,
    )
    expect(
      next.tasks.find((endeavor) => endeavor.id === targetId)?.status,
    ).toBe(EndeavorStatus.closed)
  })

  it('clears focus without jumping while auto-advance is off', () => {
    const next = reduce(
      loaded,
      userDidMarkCardComplete({
        endeavorId: targetId,
        completionDate: DO_MOCK_NOW,
        now: DO_MOCK_NOW,
      }),
    )
    expect(next.selectedCardKey).toBeNull()
    expect(next.shouldScrollToCurrentCard).toBe(false)
  })

  it('focuses the new front of the queue when auto-advance is on', () => {
    const next = reduce(
      doStateMocks.autoAdvanceEnabled,
      userDidMarkCardComplete({
        endeavorId: targetId,
        completionDate: DO_MOCK_NOW,
        now: DO_MOCK_NOW,
      }),
    )
    expect(next.selectedCardKey).not.toBeNull()
    expect(next.shouldScrollToCurrentCard).toBe(true)
    // The completed card is never the new focus.
    expect(next.selectedCardKey).not.toContain(targetId)
  })

  it('is a no-op for a card key the day no longer holds', () => {
    const next = reduce(
      loaded,
      userDidMarkCardComplete({
        endeavorId: 'gone',
        completionDate: DO_MOCK_NOW,
        now: DO_MOCK_NOW,
      }),
    )
    expect(next.lanes).toEqual(loaded.lanes)
  })
})

// ---------------------------------------------------------------------------
// Thunk lifecycle arms
// ---------------------------------------------------------------------------

describe('the fetch lifecycle arms', () => {
  it('shows the spinner on pending and clears any prior exception', () => {
    const failed = {
      ...loaded,
      load: {
        kind: 'failed' as const,
        exception: DoExceptions.fetchFailed('x'),
      },
    }
    const next = reduce(
      failed,
      fetchDoEndeavorsThunk.pending('req', { now: DO_MOCK_NOW }),
    )
    expect(next.load).toEqual({ kind: 'loading' })
  })

  it('degrades an unexpected rejection to the generic exception', () => {
    const next = reduce(
      loaded,
      fetchDoEndeavorsThunk.rejected(new Error('kaboom'), 'req', {
        now: DO_MOCK_NOW,
      }),
    )
    expect(next.load.kind).toBe('failed')
    if (next.load.kind === 'failed') {
      expect(next.load.exception.kind).toBe('unknown')
    }
  })

  it('stays silent when a newer refresh aborted this one', () => {
    const next = reduce(
      loaded,
      fetchDoEndeavorsThunk.rejected(abortError(), 'req', { now: DO_MOCK_NOW }),
    )
    expect(next.load).toEqual(loaded.load)
  })
})

describe('the Clear Expired lifecycle arms', () => {
  it('shows the spinner while the mutations run', () => {
    const next = reduce(
      loaded,
      clearExpiredThunk.pending('req', { now: DO_MOCK_NOW }),
    )
    expect(next.load).toEqual({ kind: 'loading' })
  })

  it('degrades an unexpected rejection to the generic exception', () => {
    const next = reduce(
      loaded,
      clearExpiredThunk.rejected(new Error('kaboom'), 'req', {
        now: DO_MOCK_NOW,
      }),
    )
    expect(next.load.kind).toBe('failed')
  })

  it('stays silent on an aborted clear', () => {
    const next = reduce(
      loaded,
      clearExpiredThunk.rejected(abortError(), 'req', { now: DO_MOCK_NOW }),
    )
    expect(next.load).toEqual(loaded.load)
  })
})

describe('the preferences and completion lifecycle arms', () => {
  it('degrades an unexpected preferences rejection to the generic exception', () => {
    const next = reduce(
      loaded,
      loadDoPreferencesThunk.rejected(new Error('kaboom'), 'req'),
    )
    expect(next.load.kind).toBe('failed')
  })

  it('says nothing on a successful persist — the optimistic shift already spoke', () => {
    const next = reduce(
      loaded,
      markEndeavorCompleteThunk.fulfilled(
        { ok: true, value: doEndeavorFixtures.overdueThisMorning },
        'req',
        {
          endeavorId: doEndeavorFixtures.overdueThisMorning.id,
          completionDate: DO_MOCK_NOW,
          now: DO_MOCK_NOW,
        },
      ),
    )
    expect(next).toEqual(loaded)
  })

  it('stays silent on an aborted completion', () => {
    const next = reduce(
      loaded,
      markEndeavorCompleteThunk.rejected(abortError(), 'req', {
        endeavorId: 'abc',
        completionDate: DO_MOCK_NOW,
        now: DO_MOCK_NOW,
      }),
    )
    expect(next.load).toEqual(loaded.load)
  })
})

// ---------------------------------------------------------------------------
// The invariant every test above depends on
// ---------------------------------------------------------------------------

describe('the injected clock', () => {
  it('is the feature’s only source of time — nothing here reads the wall clock', () => {
    // Every lane boundary, every score and every ring is answered against a
    // `now` that arrived in a payload or a thunk argument. A single ambient
    // clock read anywhere in the feature would make a midnight case
    // untestable and would let a reducer and its Selectors disagree.
    // Vitest runs with the package root as its cwd (jsdom leaves
    // `import.meta.url` without a file scheme, so it cannot be used here).
    const featureDir = join(process.cwd(), 'src', 'features', 'do')
    const offenders = readdirSync(featureDir)
      .filter((name) => name.endsWith('.ts') && name !== 'DoMocks.ts')
      .filter((name) => {
        const source = readFileSync(join(featureDir, name), 'utf8').replace(
          /\/\*[\s\S]*?\*\//g,
          '',
        )
        return /\bDate\.now\s*\(|\bnew Date\s*\(/.test(source)
      })

    expect(offenders).toEqual([])
  })
})
