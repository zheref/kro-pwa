import { EndeavorKind } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { initialAuthState } from '../../auth/AuthState'
import { initialCaptureState } from '../../capture/CaptureFeature'
import { initialPlatformState } from '../../platform/PlatformFeature'
import { initialSessionState } from '../../session/SessionState'
import { greetingStateMocks } from '../../greeting/GreetingMocks'
import type { RootState } from '../../../library/store'
import type { DoState } from '../DoFeature'
import { DO_MOCK_NOW, doEndeavorFixtures, doStateMocks } from '../DoMocks'
import { DoLane, doCardKey, initialDoVisibility } from '../DoRules'
import {
  selectAreDoRingsVisible,
  selectAreDoSuggestionsVisible,
  selectDoClearExpiredTargets,
  selectDoException,
  selectDoFeaturedNowLane,
  selectDoHabitsRing,
  selectDoLanes,
  selectDoNextActionableCardKey,
  selectDoNotificationBadgeCount,
  selectDoRemainingTodayCount,
  selectDoSuggestions,
  selectDoTasksRing,
  selectHasNoDoEndeavors,
  selectIsDoLoading,
} from '../DoSelectors'
import { withVisibilityApplied } from '../DoShifters'
import { initialEarnState } from '../../earn/EarnFeature'
import { initialEndeavorDetailState } from '../../endeavorDetail/EndeavorDetailState'
import { initialFindState } from '../../find/FindState'
import { initialPlanState } from '../../plan/PlanState'
import { initialTriageState } from '../../triage/TriageFeature'

/** Selectors run against a hand-built root state, never a live store. */
const rootWith = (slice: DoState): RootState => ({
  greeting: greetingStateMocks.idle,
  do: slice,
  // Present only because `RootState` names every registered slice (#18, #23,
  // #25, #29); this suite asserts nothing about Plan, Capture, Triage, Find or
  // Detail.
  plan: initialPlanState,
  capture: initialCaptureState,
  triage: initialTriageState,
  find: initialFindState,
  endeavorDetail: initialEndeavorDetailState,
  earn: initialEarnState,
  platform: initialPlatformState,
  session: initialSessionState,
  auth: initialAuthState,
})

const loaded = rootWith(doStateMocks.loadedTypicalDay)

describe('selectIsDoLoading', () => {
  it('is true while a read is in flight', () => {
    expect(selectIsDoLoading(rootWith(doStateMocks.loading))).toBe(true)
  })

  it('is false before anything was asked for', () => {
    expect(selectIsDoLoading(rootWith(doStateMocks.idle))).toBe(false)
  })

  it('is false once a refresh failed, so a spinner never sits on top of an error', () => {
    expect(
      selectIsDoLoading(rootWith(doStateMocks.failedRefreshKeepingTheDay)),
    ).toBe(false)
  })
})

describe('selectDoException', () => {
  it('surfaces the typed exception after a failed refresh', () => {
    expect(
      selectDoException(rootWith(doStateMocks.failedRefreshKeepingTheDay))?.kind,
    ).toBe('fetchFailed')
  })

  it('is null on the happy path', () => {
    expect(selectDoException(loaded)).toBeNull()
  })

  it('is null while loading', () => {
    expect(selectDoException(rootWith(doStateMocks.loading))).toBeNull()
  })
})

describe('selectHasNoDoEndeavors', () => {
  it('is true for a genuinely empty day', () => {
    expect(selectHasNoDoEndeavors(rootWith(doStateMocks.loadedEmptyDay))).toBe(true)
  })

  it('is false for a populated day', () => {
    expect(selectHasNoDoEndeavors(loaded)).toBe(false)
  })

  it('is false when only events remain — the day still holds something', () => {
    const eventsOnly: DoState = {
      ...doStateMocks.loadedEmptyDay,
      events: [doEndeavorFixtures.eventToday],
    }
    expect(selectHasNoDoEndeavors(rootWith(eventsOnly))).toBe(false)
  })
})

describe('selectDoNotificationBadgeCount', () => {
  it('counts overdue plus expired — everything that missed its deadline', () => {
    const lanes = selectDoLanes(loaded)
    expect(selectDoNotificationBadgeCount(loaded)).toBe(
      lanes.overdue.length + lanes.expired.length,
    )
    expect(selectDoNotificationBadgeCount(loaded)).toBe(6)
  })

  it('is zero on a day with nothing missed', () => {
    expect(
      selectDoNotificationBadgeCount(rootWith(doStateMocks.loadedEmptyDay)),
    ).toBe(0)
  })

  it('drops to the overdue count alone when the user hides Expired', () => {
    const hidden = withVisibilityApplied(
      doStateMocks.loadedTypicalDay,
      { ...initialDoVisibility, hiddenComputedStates: ['expired'] },
      DO_MOCK_NOW,
    )
    expect(selectDoNotificationBadgeCount(rootWith(hidden))).toBe(4)
  })
})

describe('selectDoRemainingTodayCount', () => {
  it('counts every actionable lane and neither featured nor completed', () => {
    const lanes = selectDoLanes(loaded)
    expect(selectDoRemainingTodayCount(loaded)).toBe(
      lanes.overdue.length +
        lanes.expired.length +
        lanes.now.length +
        lanes.next.length +
        lanes.anytime.length,
    )
  })

  it('does not double-count the featured hero, which is already in another lane', () => {
    const lanes = selectDoLanes(loaded)
    expect(lanes.featuredNow.length).toBeGreaterThan(0)
    expect(selectDoRemainingTodayCount(loaded)).toBeLessThan(
      lanes.overdue.length +
        lanes.expired.length +
        lanes.now.length +
        lanes.next.length +
        lanes.anytime.length +
        lanes.featuredNow.length,
    )
  })

  it('is zero on an empty day', () => {
    expect(
      selectDoRemainingTodayCount(rootWith(doStateMocks.loadedEmptyDay)),
    ).toBe(0)
  })
})

describe('selectDoFeaturedNowLane', () => {
  it('shows three cards at the compact capacity', () => {
    expect(selectDoFeaturedNowLane(loaded)).toHaveLength(3)
  })

  it('widens to nine without displacing the hero', () => {
    const narrow = selectDoFeaturedNowLane(loaded)
    const wide = selectDoFeaturedNowLane(
      rootWith({ ...doStateMocks.loadedTypicalDay, featuredCapacity: 9 }),
    )
    expect(wide.length).toBeGreaterThan(narrow.length)
    expect(wide[Math.floor(wide.length / 2)]?.id).toBe(
      narrow[Math.floor(narrow.length / 2)]?.id,
    )
  })

  it('is empty when nothing scores', () => {
    expect(selectDoFeaturedNowLane(rootWith(doStateMocks.loadedEmptyDay))).toEqual(
      [],
    )
  })
})

describe('the ring selectors', () => {
  it('report today’s standing from the parked clock reading', () => {
    expect(selectDoTasksRing(loaded)).not.toBeNull()
    expect(selectDoHabitsRing(loaded)).not.toBeNull()
  })

  it('are absent before the first regroup has stamped an instant', () => {
    expect(selectDoTasksRing(rootWith(doStateMocks.idle))).toBeNull()
    expect(selectDoHabitsRing(rootWith(doStateMocks.idle))).toBeNull()
  })

  it('do not move when the user hides a kind — the ring reports the day', () => {
    const before = selectDoHabitsRing(loaded)
    const hidingHabits = withVisibilityApplied(
      doStateMocks.loadedTypicalDay,
      { ...initialDoVisibility, hiddenKinds: [EndeavorKind.habit] },
      DO_MOCK_NOW,
    )
    const after = rootWith(hidingHabits)
    // The lanes lost every habit…
    expect(
      selectDoLanes(after).now.map((endeavor) => endeavor.id),
    ).not.toContain(doEndeavorFixtures.habitDueSoon.id)
    // …and the gold ring is byte-identical.
    expect(selectDoHabitsRing(after)).toEqual(before)
  })

  it('do not move when the user hides the Completed Today state', () => {
    const before = selectDoTasksRing(loaded)
    const hidingCompleted = rootWith(
      withVisibilityApplied(
        doStateMocks.loadedTypicalDay,
        { ...initialDoVisibility, hiddenComputedStates: ['completedToday'] },
        DO_MOCK_NOW,
      ),
    )
    expect(selectDoLanes(hidingCompleted).completedToday).toEqual([])
    expect(selectDoTasksRing(hidingCompleted)).toEqual(before)
  })
})

describe('selectAreDoRingsVisible', () => {
  it('is true on the ordinary shipping configuration', () => {
    expect(selectAreDoRingsVisible(rootWith(doStateMocks.ringsEnabled))).toBe(true)
  })

  it('is false while bulk mark-complete mode is on', () => {
    expect(
      selectAreDoRingsVisible(
        rootWith({
          ...doStateMocks.ringsEnabled,
          isInMarkCompleteMode: true,
        }),
      ),
    ).toBe(false)
  })

  it('is false while the kill switch is off', () => {
    expect(selectAreDoRingsVisible(loaded)).toBe(false)
  })
})

describe('the suggestion selectors', () => {
  it('surface the offered nudge', () => {
    expect(
      selectDoSuggestions(rootWith(doStateMocks.suggestionOffered)),
    ).toHaveLength(1)
    expect(
      selectAreDoSuggestionsVisible(rootWith(doStateMocks.suggestionOffered)),
    ).toBe(true)
  })

  it('hide the lane once every nudge is dismissed', () => {
    expect(
      selectAreDoSuggestionsVisible(rootWith(doStateMocks.suggestionDismissed)),
    ).toBe(false)
  })

  it('hide the lane when the preference is off, even with a card to show', () => {
    const preferenceOff = rootWith({
      ...doStateMocks.suggestionOffered,
      preferences: {
        ...doStateMocks.suggestionOffered.preferences,
        showSuggestions: false,
      },
    })
    expect(selectAreDoSuggestionsVisible(preferenceOff)).toBe(false)
  })
})

describe('selectDoNextActionableCardKey', () => {
  it('names the featured hero on a populated day', () => {
    const lanes = selectDoLanes(loaded)
    const hero = lanes.featuredNow[Math.floor(lanes.featuredNow.length / 2)]
    expect(selectDoNextActionableCardKey(loaded)).toBe(
      doCardKey(DoLane.featured, hero?.id ?? ''),
    )
  })

  it('is null on an empty day', () => {
    expect(
      selectDoNextActionableCardKey(rootWith(doStateMocks.loadedEmptyDay)),
    ).toBeNull()
  })

  it('ignores Completed Today, which is not actionable', () => {
    const onlyCompleted: DoState = {
      ...doStateMocks.loadedEmptyDay,
      lanes: {
        ...doStateMocks.loadedEmptyDay.lanes,
        completedToday: [doEndeavorFixtures.completedTodayTask],
      },
    }
    expect(selectDoNextActionableCardKey(rootWith(onlyCompleted))).toBeNull()
  })
})

describe('selectDoClearExpiredTargets', () => {
  it('names every expired endeavor on the day', () => {
    expect(
      selectDoClearExpiredTargets(loaded).map((endeavor) => endeavor.id).sort(),
    ).toEqual(
      [
        doEndeavorFixtures.expiredLastNight.id,
        doEndeavorFixtures.expiredLastWeek.id,
      ].sort(),
    )
  })

  it('still names them when the user has hidden the Expired lane', () => {
    const hidden = rootWith(
      withVisibilityApplied(
        doStateMocks.loadedTypicalDay,
        { ...initialDoVisibility, hiddenComputedStates: ['expired'] },
        DO_MOCK_NOW,
      ),
    )
    expect(selectDoLanes(hidden).expired).toEqual([])
    expect(selectDoClearExpiredTargets(hidden)).toHaveLength(2)
  })

  it('is empty before the first regroup', () => {
    expect(selectDoClearExpiredTargets(rootWith(doStateMocks.idle))).toEqual([])
  })
})
