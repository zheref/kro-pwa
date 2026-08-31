/**
 * Test/story-only fixtures for the Earn render tier (`#28`).
 *
 * Two different needs, two different helpers — never conflated:
 *
 *  - `rootWith` builds a hand-assembled `RootState` around one `EarnState`
 *    (`RC-55`'s pattern, mirrored from `EarnSelectors.test.ts`'s own local
 *    helper). It is what a **Fragment** story/test uses: Fragment props are
 *    pure, so calling the real Selectors against a hand-built root state is
 *    enough — no store, no dispatch, no Provider (`05-page-and-screen.md`'s
 *    "a Fragment's story needs no Provider at all — that gap is itself the
 *    proof the split holds").
 *  - `makeSeededEarnStore` builds a REAL store whose reward catalog was
 *    installed through the same persistence path production code uses —
 *    `writeRewardsCatalog`/`writeClaimedRewardIds` against a seeded
 *    `localStore.preferences`, and the fixture performances converted to
 *    `PerformanceRecord` rows via `performanceRecordFromPerform` — so a
 *    **Page** story/test reaches a loaded catalog by dispatching the real
 *    `loadEarnPreferencesThunk`/`loadEarnCatalogThunk`, never by assigning
 *    state directly. This is the "seed via real store paths, never doctored
 *    DOM" rule the issue states for the screenshot pass, applied identically
 *    to the automated suite.
 */
import {
  type PerformanceRecord,
  performanceRecordFromPerform,
} from '@kro/core'
import {
  type AppStore,
  type ThunkExtra,
  makeStore,
  stubbedThunkExtra,
} from '../../../../library/store'
import { makeInMemoryLocalStore } from '../../../../services/localStore/InMemoryLocalStore'
import { initialAuthState } from '../../../auth/AuthState'
import { initialCaptureState } from '../../../capture/CaptureFeature'
import { initialDoState } from '../../../do/DoFeature'
import { initialEndeavorDetailState } from '../../../endeavorDetail/EndeavorDetailState'
import { initialFindState } from '../../../find/FindState'
import { initialGreetingState } from '../../../greeting/GreetingFeature'
import { initialMainState } from '../../../main/MainFeature'
import { initialPlanState } from '../../../plan/PlanState'
import { initialPlatformState } from '../../../platform/PlatformFeature'
import { initialSessionState } from '../../../session/SessionState'
import { initialTriageState } from '../../../triage/TriageFeature'
import type { RootState } from '../../../../library/store'
import {
  earnCatalogFixture,
  earnFixturePerformances,
} from '../../EarnMocks'
import { writeClaimedRewardIds, writeRewardsCatalog } from '../../EarnRewardsStorage'
import type { EarnState } from '../../EarnFeature'
import {
  selectAddRewardDraft,
  selectAvailableSuggestions,
  selectClaimableRewards,
  selectClaimingReward,
  selectClaimingRewardId,
  selectCurrentPoints,
  selectIsAddingReward,
  selectIsEarnCatalogEmpty,
  selectLockedRewards,
} from '../../EarnSelectors'
import type { EarnFragmentProps } from '../EarnFragment'

/** A hand-built `RootState` carrying one `EarnState` — Fragment-level only. */
export const rootWith = (earn: EarnState): RootState => ({
  greeting: initialGreetingState,
  do: initialDoState,
  capture: initialCaptureState,
  triage: initialTriageState,
  plan: initialPlanState,
  find: initialFindState,
  endeavorDetail: initialEndeavorDetailState,
  earn,
  platform: initialPlatformState,
  session: initialSessionState,
  auth: initialAuthState,
  main: initialMainState,
})

/** `EARN_MOCK_NOW` in epoch millis — the fixture performances' recorded time. */
const FIXTURE_NOW_MILLIS = new Date(2026, 2, 17, 10, 0, 0).getTime()

const fixtureRecords: readonly PerformanceRecord[] = earnFixturePerformances.map(
  (perform, index) =>
    performanceRecordFromPerform(perform, {
      endeavorId: `earn-fixture-endeavor-${index}`,
      nowMillis: FIXTURE_NOW_MILLIS,
    }),
)

export interface SeededEarnStoreOptions {
  /** Reward ids to seed as already-claimed. Empty catalog otherwise. */
  readonly claimedRewardIds?: readonly string[]
  /** `false` seeds an empty catalog + no performances — the true empty state. */
  readonly withCatalog?: boolean
}

/**
 * A real store whose Earn slice reaches "loaded" by dispatching the actual
 * Producer thunks against a seeded `localStore`, exactly as `EarnPage`'s own
 * mount effect does. Callers still dispatch `loadEarnPreferencesThunk` /
 * `loadEarnCatalogThunk` themselves (or mount `EarnPage`, whose effect does
 * it) — this only prepares what those thunks will read.
 */
export const makeSeededEarnStore = (
  options: SeededEarnStoreOptions = {},
): AppStore => {
  const { claimedRewardIds = [], withCatalog = true } = options

  const localStore = makeInMemoryLocalStore({
    performances: withCatalog ? fixtureRecords : [],
  })

  if (withCatalog) {
    writeRewardsCatalog(localStore.preferences, earnCatalogFixture)
    writeClaimedRewardIds(localStore.preferences, claimedRewardIds)
  }

  const extra: ThunkExtra = { ...stubbedThunkExtra, localStore }
  return makeStore(extra)
}

/**
 * `EarnFragmentProps`, derived from one `EarnState` through the REAL
 * Selectors (never hand-assembled) — the Fragment-story counterpart of
 * `03-state-shifters-selectors.md`'s Selector-test pattern. Every callback
 * defaults to a no-op; a caller overrides only the ones its scenario needs.
 */
export const earnFragmentPropsFrom = (
  earn: EarnState,
  overrides: Partial<EarnFragmentProps> = {},
): EarnFragmentProps => {
  const root = rootWith(earn)
  const noop = () => {}

  return {
    claimableRewards: selectClaimableRewards(root),
    lockedRewards: selectLockedRewards(root),
    availableSuggestions: selectAvailableSuggestions(root),
    currentPoints: selectCurrentPoints(root),
    isCatalogEmpty: selectIsEarnCatalogEmpty(root),
    isAddingReward: selectIsAddingReward(root),
    addRewardDraft: selectAddRewardDraft(root),
    claimingRewardId: selectClaimingRewardId(root),
    claimingReward: selectClaimingReward(root),
    presentation: 'sheet',
    showsMobileEarnPreferencesGear: false,
    onTapClaim: noop,
    onConfirmClaim: noop,
    onCancelClaim: noop,
    onDelete: noop,
    onTapAddReward: noop,
    onChangeDraftTitle: noop,
    onChangeDraftGlyph: noop,
    onChangeDraftPoints: noop,
    onChangeDraftNotes: noop,
    onConfirmAddReward: noop,
    onCancelAddReward: noop,
    onTapAddSuggestion: noop,
    onTapEarnPreferences: noop,
    ...overrides,
  }
}
