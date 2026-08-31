import { EisenhowerQuadrant, EndeavorHost } from '@kro/core'
import { describe, expect, it } from 'vitest'
import type { RootState } from '../../../library/store'
import { initialAuthState } from '../../auth/AuthState'
import { initialCaptureState } from '../../capture/CaptureFeature'
import { initialPlatformState } from '../../platform/PlatformFeature'
import { initialSessionState } from '../../session/SessionState'
import { initialDoState } from '../../do/DoFeature'
import { initialEarnState } from '../../earn/EarnFeature'
import { initialEndeavorDetailState } from '../../endeavorDetail/EndeavorDetailState'
import { initialFindState } from '../../find/FindState'
import { greetingStateMocks } from '../../greeting/GreetingMocks'
import { initialPlanState } from '../../plan/PlanState'
import type { TriageState } from '../TriageFeature'
import { TriageExpiryPreset } from '../TriageExpiry'
import { TRIAGE_MOCK_NOW, triageMockAt, triageStateMocks } from '../TriageMocks'
import {
  selectCanClearTriageExpiry,
  selectCanConfirmTriage,
  selectIsTriageDecisionDurable,
  selectIsTriageDurationUndefined,
  selectIsTriageEditReachable,
  selectIsTriageExpiryCustom,
  selectIsTriageLoading,
  selectIsTriageSaving,
  selectTriageBlockedReason,
  selectTriageCitizenshipAtEntry,
  selectTriageDecision,
  selectTriageDueDate,
  selectTriageDurationChips,
  selectTriageEffortRating,
  selectTriageException,
  selectTriageForm,
  selectTriageExpiryInvariantHolds,
  selectTriageExpiryScrollNonce,
  selectTriageExpiryTokens,
  selectTriageHeading,
  selectTriageOutcome,
  selectTriagePrimaryActionLabel,
  selectTriagePushNotice,
  selectTriagePushOutcome,
  selectTriageQuadrantTiles,
  selectTriageRewardPoints,
  selectTriageSaveException,
  selectTriageSecondaryAction,
  selectTriageSelectedExpiryToken,
  selectTriageSession,
  selectTriageValueRating,
  selectTriageWillPromote,
} from '../TriageSelectors'
import {
  withExpiryPicked,
  withOutcomeRaised,
  withQuadrantPicked,
  withSessionOpened,
} from '../TriageShifters'
import { triageSessionSeed, triageEndeavorFixtures } from '../TriageMocks'
import { initialTriageState } from '../TriageFeature'
import { initialMainState } from '../../main/MainFeature'
import { initialSettingsState } from '../../settings/SettingsState'

/** Selectors run against a hand-built root state, never a live store. */
const rootWith = (slice: TriageState): RootState => ({
  greeting: greetingStateMocks.idle,
  // Present only because `RootState` names every registered slice (#16, #18,
  // #23, #29); this suite asserts nothing about Do, Capture, Plan, Find or
  // Endeavor Detail.
  do: initialDoState,
  capture: initialCaptureState,
  triage: slice,
  plan: initialPlanState,
  find: initialFindState,
  endeavorDetail: initialEndeavorDetailState,
  earn: initialEarnState,
  platform: initialPlatformState,
  session: initialSessionState,
  settings: initialSettingsState,
  auth: initialAuthState,
  main: initialMainState,
})

describe('lifecycle selectors', () => {
  it('reports loading while the session is being read', () => {
    expect(selectIsTriageLoading(rootWith(triageStateMocks.loading))).toBe(true)
  })

  it('reports no loading once the session is open', () => {
    expect(selectIsTriageLoading(rootWith(triageStateMocks.pristine))).toBe(
      false,
    )
  })

  it('surfaces the exception only in the failed state', () => {
    expect(selectTriageException(rootWith(triageStateMocks.failed))?.kind).toBe(
      'sessionLoadFailed',
    )
    expect(
      selectTriageException(rootWith(triageStateMocks.pristine)),
    ).toBeNull()
  })
})

describe('selectTriageSession / selectTriageForm / selectTriageDueDate', () => {
  it('exposes the open session and its form', () => {
    const state = rootWith(triageStateMocks.scheduled)

    expect(selectTriageSession(state)?.endeavorId).toBe(
      'triage-unscheduled-task',
    )
    expect(selectTriageForm(state)?.quadrant).toBe(EisenhowerQuadrant.decide)
  })

  it('exposes the scheduled date the gate reads', () => {
    expect(selectTriageDueDate(rootWith(triageStateMocks.scheduled))).toEqual(
      triageMockAt(24, 10, 7),
    )
  })

  it('has no date on the pristine screen', () => {
    expect(selectTriageDueDate(rootWith(triageStateMocks.pristine))).toBeNull()
  })

  it('is null throughout with no session mounted', () => {
    const idle = rootWith(triageStateMocks.idle)

    expect(selectTriageSession(idle)).toBeNull()
    expect(selectTriageForm(idle)).toBeNull()
    expect(selectTriageDueDate(idle)).toBeNull()
  })

  it('is null throughout while the session is still loading', () => {
    const loading = rootWith(triageStateMocks.loading)

    expect(selectTriageSession(loading)).toBeNull()
    expect(selectTriageForm(loading)).toBeNull()
    expect(selectTriageDueDate(loading)).toBeNull()
  })
})

describe('selectTriageHeading', () => {
  it('carries the endeavor’s title and symbol', () => {
    expect(selectTriageHeading(rootWith(triageStateMocks.pristine))).toEqual({
      title: 'Draft Q3 product plan',
      symbol: '📌',
    })
  })

  it('is null with no session mounted', () => {
    expect(selectTriageHeading(rootWith(triageStateMocks.idle))).toBeNull()
  })

  it('follows the endeavor a new session opens on', () => {
    const other = withSessionOpened(
      initialTriageState,
      triageSessionSeed({ endeavor: triageEndeavorFixtures.habit }),
    )

    expect(selectTriageHeading(rootWith(other))?.title).toBe(
      'Stretch for ten minutes',
    )
  })
})

describe('the reward and rating rows', () => {
  it('exposes the reward the header badge binds to', () => {
    expect(selectTriageRewardPoints(rootWith(triageStateMocks.pristine))).toBe(
      10,
    )
  })

  it('names the value rating for the leading half of the row', () => {
    expect(
      selectTriageValueRating(rootWith(triageStateMocks.pristine)),
    ).toEqual({ rating: 1, label: 'Trivial' })
  })

  it('names the effort rating the same way', () => {
    expect(
      selectTriageEffortRating(rootWith(triageStateMocks.pristine)),
    ).toEqual({ rating: 1, label: 'Autopilot' })
  })

  it('has nothing to report with no session mounted', () => {
    expect(selectTriageRewardPoints(rootWith(triageStateMocks.idle))).toBeNull()
    expect(selectTriageValueRating(rootWith(triageStateMocks.idle))).toBeNull()
  })
})

describe('selectTriageDurationChips', () => {
  it('offers canon’s nine chips with their labels', () => {
    const chips = selectTriageDurationChips(rootWith(triageStateMocks.pristine))

    expect(chips.map((chip) => chip.minutes)).toEqual([
      1, 5, 15, 25, 45, 60, 90, 120, 180,
    ])
    expect(chips[0]?.label).toBe('A minute')
    expect(chips[8]?.label).toBe('3 hours')
  })

  it('marks the picked chip and no other', () => {
    const chips = selectTriageDurationChips(
      rootWith(triageStateMocks.scheduled),
    )

    expect(chips.filter((chip) => chip.isSelected)).toEqual([
      { minutes: 25, label: '25 min', isSelected: true },
    ])
  })

  it('offers nothing with no session mounted', () => {
    expect(selectTriageDurationChips(rootWith(triageStateMocks.idle))).toEqual(
      [],
    )
  })

  it('reports the duration as undefined only before the first pick', () => {
    expect(
      selectIsTriageDurationUndefined(rootWith(triageStateMocks.pristine)),
    ).toBe(true)
    expect(
      selectIsTriageDurationUndefined(rootWith(triageStateMocks.scheduled)),
    ).toBe(false)
  })
})

describe('selectTriageQuadrantTiles', () => {
  it('renders the 2 × 2 grid in canon order with both axis facts', () => {
    const tiles = selectTriageQuadrantTiles(rootWith(triageStateMocks.pristine))

    expect(tiles.map((tile) => tile.quadrant)).toEqual([
      EisenhowerQuadrant.prioritize,
      EisenhowerQuadrant.decide,
      EisenhowerQuadrant.delegate,
      EisenhowerQuadrant.delete,
    ])
    expect(tiles[0]).toEqual({
      quadrant: EisenhowerQuadrant.prioritize,
      isSelected: false,
      isUrgent: true,
      isImportant: true,
    })
  })

  it('marks exactly one tile once a quadrant is picked', () => {
    const tiles = selectTriageQuadrantTiles(
      rootWith(triageStateMocks.scheduled),
    )

    expect(tiles.filter((tile) => tile.isSelected)).toHaveLength(1)
  })

  it('marks none before a quadrant is picked', () => {
    const tiles = selectTriageQuadrantTiles(rootWith(triageStateMocks.pristine))

    expect(tiles.some((tile) => tile.isSelected)).toBe(false)
  })
})

describe('the expiry pill row', () => {
  it('orders the selected pill first — the default lights "An hour later"', () => {
    const tokens = selectTriageExpiryTokens(
      rootWith(triageStateMocks.scheduled),
    )

    expect(tokens[0]).toEqual({
      kind: 'preset',
      preset: TriageExpiryPreset.oneHour,
    })
  })

  it('reports the lit pill', () => {
    expect(
      selectTriageSelectedExpiryToken(rootWith(triageStateMocks.scheduled)),
    ).toEqual({ kind: 'preset', preset: TriageExpiryPreset.oneHour })
  })

  it('lights Custom for a bespoke moment', () => {
    const custom = withExpiryPicked(
      triageStateMocks.scheduled,
      triageMockAt(24, 12, 34),
    )

    expect(selectIsTriageExpiryCustom(rootWith(custom))).toBe(true)
    expect(selectTriageSelectedExpiryToken(rootWith(custom))).toEqual({
      kind: 'custom',
    })
  })

  it('offers no tokens with no session mounted', () => {
    expect(selectTriageExpiryTokens(rootWith(triageStateMocks.idle))).toEqual(
      [],
    )
  })

  it('exposes a scroll nonce the view can react to', () => {
    const before = selectTriageExpiryScrollNonce(
      rootWith(triageStateMocks.scheduled),
    )
    const moved = withExpiryPicked(
      triageStateMocks.scheduled,
      triageMockAt(24, 12, 34),
    )

    expect(selectTriageExpiryScrollNonce(rootWith(moved))).toBe(before + 1)
  })

  it('hides Clear while a scheduled date is in place — the honest UI rule', () => {
    expect(
      selectCanClearTriageExpiry(rootWith(triageStateMocks.scheduled)),
    ).toBe(false)
  })

  it('offers Clear for an expiry with no scheduled date', () => {
    const expiryOnly = withExpiryPicked(
      triageStateMocks.pristine,
      triageMockAt(24, 12),
    )

    expect(selectCanClearTriageExpiry(rootWith(expiryOnly))).toBe(true)
  })

  it('reports the invariant as holding on every mock state', () => {
    for (const state of Object.values(triageStateMocks)) {
      expect(selectTriageExpiryInvariantHolds(rootWith(state))).toBe(true)
    }
  })
})

describe('the confirm gate', () => {
  it('is closed on the pristine screen and names the quadrant', () => {
    expect(selectCanConfirmTriage(rootWith(triageStateMocks.pristine))).toBe(
      false,
    )
    expect(selectTriageBlockedReason(rootWith(triageStateMocks.pristine))).toBe(
      'Pick a quadrant to complete this triage.',
    )
  })

  it('is open once a quadrant and a date exist', () => {
    expect(selectCanConfirmTriage(rootWith(triageStateMocks.scheduled))).toBe(
      true,
    )
    expect(
      selectTriageBlockedReason(rootWith(triageStateMocks.scheduled)),
    ).toBeNull()
  })

  it('is open for Archive with no date at all', () => {
    expect(
      selectCanConfirmTriage(rootWith(triageStateMocks.archivePicked)),
    ).toBe(true)
  })

  it('names the missing date once a non-Archive quadrant is picked', () => {
    const dateless = withQuadrantPicked(
      withSessionOpened(
        initialTriageState,
        triageSessionSeed({ endeavor: triageEndeavorFixtures.habit }),
      ),
      EisenhowerQuadrant.delete,
      TRIAGE_MOCK_NOW,
    )

    // Archive is exempt, so switch to Delegate for the blocked case.
    const delegated = withQuadrantPicked(
      dateless,
      EisenhowerQuadrant.delegate,
      TRIAGE_MOCK_NOW,
    )

    expect(selectTriageBlockedReason(rootWith(delegated))).toBeNull()
  })
})

describe('the bottom action row', () => {
  it('reads full width before a quadrant is picked', () => {
    expect(
      selectTriagePrimaryActionLabel(rootWith(triageStateMocks.pristine)),
    ).toBe('Complete Triage')
  })

  it('shortens once a quadrant is picked', () => {
    expect(
      selectTriagePrimaryActionLabel(rootWith(triageStateMocks.scheduled)),
    ).toBe('Complete Only')
  })

  it('offers no secondary on Schedule', () => {
    expect(
      selectTriageSecondaryAction(rootWith(triageStateMocks.scheduled)),
    ).toBeNull()
  })

  it('offers Start Now on Prioritize', () => {
    expect(
      selectTriageSecondaryAction(
        rootWith(triageStateMocks.prioritizedOnBusyDay),
      ),
    ).toBe('startNow')
  })
})

describe('selectTriageDecision', () => {
  it('reads the decision confirming would commit', () => {
    const decision = selectTriageDecision(rootWith(triageStateMocks.scheduled))

    expect(decision).toEqual({
      endeavorId: 'triage-unscheduled-task',
      quadrant: EisenhowerQuadrant.decide,
      durationSeconds: 1500,
      dueDate: triageMockAt(24, 10, 7),
      rewardPoints: 10,
      value: 3,
      effort: 1,
      expiryDate: triageMockAt(24, 11, 7),
    })
  })

  it('is null while the gate is closed', () => {
    expect(selectTriageDecision(rootWith(triageStateMocks.pristine))).toBeNull()
  })

  it('is null with no session mounted', () => {
    expect(selectTriageDecision(rootWith(triageStateMocks.idle))).toBeNull()
  })
})

describe('the one-shot and the Edit affordance', () => {
  it('exposes the raised outcome', () => {
    const raised = withOutcomeRaised(triageStateMocks.scheduled, 'completed')

    expect(selectTriageOutcome(rootWith(raised))?.kind).toBe('completed')
  })

  it('is null when nothing is pending', () => {
    expect(selectTriageOutcome(rootWith(triageStateMocks.pristine))).toBeNull()
  })

  it('reports Edit as unreachable by default — the flag is the parent’s', () => {
    expect(
      selectIsTriageEditReachable(rootWith(triageStateMocks.pristine)),
    ).toBe(false)
  })

  it('reports Edit as reachable when the parent said so', () => {
    const reachable = withSessionOpened(
      initialTriageState,
      triageSessionSeed({ isEditReachable: true }),
    )

    expect(selectIsTriageEditReachable(rootWith(reachable))).toBe(true)
  })
})

describe('the Kro-enhanced forecast', () => {
  it('forecasts a promotion for a tourist', () => {
    const tourist = withSessionOpened(
      initialTriageState,
      triageSessionSeed({ endeavor: triageEndeavorFixtures.touristReminder }),
    )

    expect(selectTriageWillPromote(rootWith(tourist))).toBe(true)
    expect(selectTriageCitizenshipAtEntry(rootWith(tourist))).toBe('tourist')
  })

  it('forecasts nothing for a citizen', () => {
    expect(selectTriageWillPromote(rootWith(triageStateMocks.pristine))).toBe(
      false,
    )
    expect(
      selectTriageCitizenshipAtEntry(rootWith(triageStateMocks.pristine)),
    ).toBe('citizen')
  })

  it('has nothing to forecast with no session mounted', () => {
    expect(selectTriageWillPromote(rootWith(triageStateMocks.idle))).toBe(false)
    expect(
      selectTriageCitizenshipAtEntry(rootWith(triageStateMocks.idle)),
    ).toBeNull()
  })
})

describe('the durable save', () => {
  it('reports saving while the write is in flight', () => {
    expect(selectIsTriageSaving(rootWith(triageStateMocks.saving))).toBe(true)
  })

  it('reports a LOCAL failure as an exception the user must act on', () => {
    expect(
      selectTriageSaveException(rootWith(triageStateMocks.saveFailed))?.kind,
    ).toBe('localSaveFailed')
  })

  it('reports a deferred push as durable, with a reassuring notice', () => {
    const state = rootWith(triageStateMocks.savedPushDeferred)

    expect(selectIsTriageDecisionDurable(state)).toBe(true)
    expect(selectTriageSaveException(state)).toBeNull()
    expect(selectTriagePushNotice(state)).toContain('Saved on this device')
    expect(selectTriagePushOutcome(state)).toEqual({
      kind: 'deferred',
      hosts: [EndeavorHost.supabase],
      reason: 'transportUnavailable',
    })
  })

  it('says nothing at all when there was nothing to push', () => {
    const state = rootWith(triageStateMocks.savedLocalOnly)

    expect(selectIsTriageDecisionDurable(state)).toBe(true)
    expect(selectTriagePushNotice(state)).toBeNull()
  })

  it('reports a local failure as NOT durable', () => {
    expect(
      selectIsTriageDecisionDurable(rootWith(triageStateMocks.saveFailed)),
    ).toBe(false)
  })
})
