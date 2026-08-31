/**
 * Selectors run against a hand-built root state, never a live store (`RC-55`).
 * The other registered slices are filled from their own initial states only
 * because `RootState` names every one of them.
 *
 * The `selectCurrentPoints` property suite proves the acceptance criterion
 * directly: "current-points balance derived purely from performances' reward
 * points minus claimed (no shadow counters)". It never trusts a running total
 * — it replays the exact same operation sequence against a plain reference
 * implementation and checks the two never disagree, after *every* step.
 */
import { PerformResolution, makePerform } from '@kro/core'
import { rewardMocks } from '@kro/core/mocks'
import { describe, expect, it } from 'vitest'
import { initialAuthState } from '../../auth/AuthState'
import { initialCaptureState } from '../../capture/CaptureFeature'
import { initialPlatformState } from '../../platform/PlatformFeature'
import { initialSessionState } from '../../session/SessionState'
import { initialDoState } from '../../do/DoFeature'
import { initialEndeavorDetailState } from '../../endeavorDetail/EndeavorDetailState'
import { initialFindState } from '../../find/FindState'
import { initialGreetingState } from '../../greeting/GreetingFeature'
import type { RootState } from '../../../library/store'
import { initialPlanState } from '../../plan/PlanState'
import { initialTriageState } from '../../triage/TriageFeature'
import { type EarnState, initialEarnState } from '../EarnFeature'
import { earnStateMocks } from '../EarnMocks'
import {
  selectAddRewardDraft,
  selectAvailableSuggestions,
  selectClaimableRewards,
  selectClaimingReward,
  selectClaimingRewardId,
  selectCurrentPoints,
  selectDefaultRewardThreshold,
  selectEarnException,
  selectIsAddingReward,
  selectIsEarnCatalogEmpty,
  selectIsEarnLoading,
  selectLockedRewards,
  selectPointsFormula,
  selectSpentPoints,
  selectTotalEarnedPoints,
} from '../EarnSelectors'
import { initialMainState } from '../../main/MainFeature'
import { initialSettingsState } from '../../settings/SettingsState'
import { initialThirstState } from '../../thirst/ThirstFeature'

const rootWith = (earn: EarnState): RootState => ({
  greeting: initialGreetingState,
  // Present only because `RootState` names every registered slice; this suite
  // asserts nothing about Do, Capture, Triage, Plan, Find or Detail.
  do: initialDoState,
  capture: initialCaptureState,
  triage: initialTriageState,
  plan: initialPlanState,
  find: initialFindState,
  endeavorDetail: initialEndeavorDetailState,
  earn,
  platform: initialPlatformState,
  session: initialSessionState,
  settings: initialSettingsState,
  auth: initialAuthState,
  main: initialMainState,
  thirst: initialThirstState,
})

const loaded = earnStateMocks.loadedTypical

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

describe('selectIsEarnLoading', () => {
  it('is true while a read is in flight', () => {
    expect(selectIsEarnLoading(rootWith(earnStateMocks.loading))).toBe(true)
  })

  it('is false once loaded', () => {
    expect(selectIsEarnLoading(rootWith(loaded))).toBe(false)
  })

  it('is false before the first load', () => {
    expect(selectIsEarnLoading(rootWith(earnStateMocks.idle))).toBe(false)
  })
})

describe('selectEarnException', () => {
  it('is null on a loaded state', () => {
    expect(selectEarnException(rootWith(loaded))).toBeNull()
  })

  it('surfaces the exception on a failed state', () => {
    expect(
      selectEarnException(rootWith(earnStateMocks.failedRefreshKeepingCatalog))?.kind,
    ).toBe('catalogLoadFailed')
  })

  it('is null while loading', () => {
    expect(selectEarnException(rootWith(earnStateMocks.loading))).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------

describe('selectTotalEarnedPoints / selectSpentPoints / selectCurrentPoints', () => {
  it('sums the fixture performances (130) with nothing claimed', () => {
    expect(selectTotalEarnedPoints(rootWith(loaded))).toBe(130)
    expect(selectSpentPoints(rootWith(loaded))).toBe(0)
    expect(selectCurrentPoints(rootWith(loaded))).toBe(130)
  })

  it('deducts the claimed reward from the balance', () => {
    const claiming = rootWith(earnStateMocks.loadedWithClaim)
    expect(selectSpentPoints(claiming)).toBe(rewardMocks.bobaTea.pointsRequired)
    expect(selectCurrentPoints(claiming)).toBe(130 - rewardMocks.bobaTea.pointsRequired)
  })

  it('is zero on an empty catalog and no performances', () => {
    expect(selectCurrentPoints(rootWith(earnStateMocks.loadedEmpty))).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Partition
// ---------------------------------------------------------------------------

describe('selectClaimableRewards / selectLockedRewards', () => {
  it('places the affordable reward in claimable', () => {
    expect(selectClaimableRewards(rootWith(loaded)).map((r) => r.id)).toContain(
      rewardMocks.bobaTea.id,
    )
  })

  it('places the unaffordable rewards in locked', () => {
    const locked = selectLockedRewards(rootWith(loaded)).map((r) => r.id)
    expect(locked).toContain(rewardMocks.plain.id)
    expect(locked).toContain(rewardMocks.weekendTrip.id)
  })

  it('excludes a claimed reward from both lanes', () => {
    const claiming = rootWith(earnStateMocks.loadedWithClaim)
    const ids = [
      ...selectClaimableRewards(claiming).map((r) => r.id),
      ...selectLockedRewards(claiming).map((r) => r.id),
    ]
    expect(ids).not.toContain(rewardMocks.bobaTea.id)
  })
})

describe('selectAvailableSuggestions / selectIsEarnCatalogEmpty', () => {
  it('excludes suggestions already in the catalog', () => {
    const suggestions = selectAvailableSuggestions(rootWith(loaded))
    expect(suggestions.some((s) => s.title === rewardMocks.bobaTea.title)).toBe(false)
  })

  it('reports the catalog non-empty when loaded with rewards', () => {
    expect(selectIsEarnCatalogEmpty(rootWith(loaded))).toBe(false)
  })

  it('reports the catalog empty once loaded with nothing in it', () => {
    expect(selectIsEarnCatalogEmpty(rootWith(earnStateMocks.loadedEmpty))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

describe('selectDefaultRewardThreshold / selectPointsFormula', () => {
  it('reads the default threshold (100 before any load)', () => {
    expect(selectDefaultRewardThreshold(rootWith(initialEarnState))).toBe(100)
  })

  it('reads the loaded threshold once preferences apply', () => {
    const withPrefs: EarnState = {
      ...loaded,
      preferences: { defaultRewardThreshold: 250, pointsFormula: 'legacy' },
    }
    expect(selectDefaultRewardThreshold(rootWith(withPrefs))).toBe(250)
    expect(selectPointsFormula(rootWith(withPrefs))).toBe('legacy')
  })

  it('defaults the formula to the sliding scale before any load', () => {
    expect(selectPointsFormula(rootWith(initialEarnState))).toBe('slidingScale')
  })
})

// ---------------------------------------------------------------------------
// Add Reward sheet + claim flow
// ---------------------------------------------------------------------------

describe('selectIsAddingReward / selectAddRewardDraft', () => {
  it('is false before the sheet opens', () => {
    expect(selectIsAddingReward(rootWith(loaded))).toBe(false)
  })

  it('is true once the sheet opens', () => {
    expect(selectIsAddingReward(rootWith(earnStateMocks.addingReward))).toBe(true)
  })

  it('reflects the draft prefilled from the default threshold', () => {
    expect(selectAddRewardDraft(rootWith(earnStateMocks.addingReward)).pointsRequired).toBe(100)
  })
})

describe('selectClaimingRewardId / selectClaimingReward', () => {
  it('is null with no confirm sheet open', () => {
    expect(selectClaimingRewardId(rootWith(loaded))).toBeNull()
    expect(selectClaimingReward(rootWith(loaded))).toBeNull()
  })

  it('resolves the id once the confirm sheet opens', () => {
    expect(selectClaimingRewardId(rootWith(earnStateMocks.claimingReward))).toBe(
      rewardMocks.bobaTea.id,
    )
  })

  it('resolves the full reward from the catalog', () => {
    expect(selectClaimingReward(rootWith(earnStateMocks.claimingReward))?.id).toBe(
      rewardMocks.bobaTea.id,
    )
  })
})

// ---------------------------------------------------------------------------
// The balance property: no shadow counters (acceptance criterion 2)
// ---------------------------------------------------------------------------

/**
 * A tiny deterministic PRNG (mulberry32) — no new dependency, and a fixed
 * seed makes a failing run reproducible without recording the sequence.
 */
const mulberry32 = (seed: number) => {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const catalog = [rewardMocks.bobaTea, rewardMocks.movieNight, rewardMocks.weekendTrip, rewardMocks.plain]

type Operation =
  | { readonly kind: 'earn'; readonly points: number }
  | { readonly kind: 'claim'; readonly rewardIndex: number }

const randomOperation = (rng: () => number): Operation =>
  rng() < 0.5
    ? { kind: 'earn', points: Math.floor(rng() * 200) }
    : { kind: 'claim', rewardIndex: Math.floor(rng() * catalog.length) }

describe('selectCurrentPoints — property: matches earned-minus-claimed for any sequence', () => {
  it('holds after every step of 30 random sequences of 20 operations each', () => {
    const rng = mulberry32(20260317)

    for (let sequence = 0; sequence < 30; sequence += 1) {
      let performances: ReturnType<typeof makePerform>[] = []
      let claimedRewardIds: string[] = []
      let expectedTotal = 0

      for (let step = 0; step < 20; step += 1) {
        const operation = randomOperation(rng)
        if (operation.kind === 'earn') {
          performances = [
            ...performances,
            makePerform({
              date: new Date(2026, 2, 17),
              duration: 900,
              resolution: PerformResolution.finished,
              rewardPoints: operation.points,
            }),
          ]
          expectedTotal += operation.points
        } else {
          const reward = catalog[operation.rewardIndex]
          if (reward !== undefined && !claimedRewardIds.includes(reward.id)) {
            claimedRewardIds = [...claimedRewardIds, reward.id]
          }
        }

        const expectedSpent = catalog
          .filter((reward) => claimedRewardIds.includes(reward.id))
          .reduce((sum, reward) => sum + reward.pointsRequired, 0)
        const expectedBalance = Math.max(0, expectedTotal - expectedSpent)

        const state: EarnState = {
          ...initialEarnState,
          load: { kind: 'loaded' },
          rewards: catalog,
          claimedRewardIds,
          performances,
        }

        expect(selectCurrentPoints(rootWith(state))).toBe(expectedBalance)
      }
    }
  })
})
