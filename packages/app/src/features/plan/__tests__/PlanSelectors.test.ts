/**
 * Selectors are exercised against a hand-built root state, never a live store
 * (`RC-55`). The `greeting` slice is filled from its own initial state — this
 * suite has no opinion about any slice but Plan's.
 */
import type { Endeavor, SettingValue } from '@kro/core'
import {
  DayViewRange,
  EndeavorKind,
  FeatureFlags,
  EndeavorStatus,
  PlanListGrouping,
  PlanListSort,
  makeEndeavor,
  planDayViewRangeOption,
  planListGroupingOption,
  planListSortOption,
  planShowCompletedInTimelineOption,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import { initialAuthState } from '../../auth/AuthState'
import { initialCaptureState } from '../../capture/CaptureFeature'
import { initialPlatformState } from '../../platform/PlatformFeature'
import { initialSessionState } from '../../session/SessionState'
import { initialDoState } from '../../do/DoFeature'
import { initialEarnState } from '../../earn/EarnFeature'
import { initialEndeavorDetailState } from '../../endeavorDetail/EndeavorDetailState'
import { initialFindState } from '../../find/FindState'
import { initialGreetingState } from '../../greeting/GreetingFeature'
import { initialTriageState } from '../../triage/TriageFeature'
import type { RootState } from '../../../library/store'
import { addingPlanDays, planDayKey, startOfPlanDay } from '../PlanCalendar'
import { PlanViewMode } from '../PlanNavigation'
import {
  PLAN_REFERENCE_DAY,
  planAt,
  planDayFixtures,
  planStateMocks,
} from '../PlanMocks'
import {
  selectCanRefreshPlan,
  selectIsPlanActivityIndicated,
  selectIsPlanFabAvailable,
  selectIsPlanFabGlowActive,
  selectIsPlanMatrixEmpty,
  selectIsPlanPreloadCurrent,
  selectIsPlanQuickCreateAvailable,
  selectIsPlanShowingMatrix,
  selectIsPlanShowingToday,
  selectPlanAuthoritativeEvents,
  selectPlanDayException,
  selectPlanDayPickerDates,
  selectPlanEditPreview,
  selectPlanEditingEndeavorId,
  selectPlanDayViewRange,
  selectPlanHourBand,
  selectPlanListGrouping,
  selectPlanListSort,
  selectPlanMatrixItems,
  selectPlanMatrixPickerCandidates,
  selectPlanQuickCreateDraft,
  selectPlanRowCapabilities,
  selectPlanShowsCompleted,
  selectPlanSlotCount,
  selectPlanTimelineEvents,
  selectPlanTimelinePlacements,
  selectPlanViewMode,
  selectPlanVista,
} from '../PlanSelectors'
import type { TimelineEditSession } from '../PlanEditSession'
import type { PlanState } from '../PlanState'
import { initialMainState } from '../../main/MainFeature'
import { initialSettingsState } from '../../settings/SettingsState'
import { initialThirstState } from '../../thirst/ThirstFeature'

const today = startOfPlanDay(PLAN_REFERENCE_DAY)
const tomorrow = addingPlanDays(today, 1)

/**
 * A root state with the Plan slice supplied and, optionally, a settings
 * snapshot.
 *
 * The band and the completed filter are PREFERENCES, read from the settings
 * slice (KC-IS-#71 item 19) rather than mirrored onto `PlanState` — so a test
 * that wants the Business band sets the preference the user would set, and the
 * assertion covers the whole path the app takes.
 */
const rootWith = (
  plan: PlanState,
  settingValues: Readonly<Record<string, SettingValue | null>> = {},
): RootState => ({
  greeting: initialGreetingState,
  // Present only because `RootState` names every registered slice (#16, #23,
  // #29); this suite asserts nothing about Do, Capture, Find or Detail.
  do: initialDoState,
  capture: initialCaptureState,
  triage: initialTriageState,
  plan,
  find: initialFindState,
  endeavorDetail: initialEndeavorDetailState,
  earn: initialEarnState,
  platform: initialPlatformState,
  session: initialSessionState,
  settings: { ...initialSettingsState, values: settingValues },
  auth: initialAuthState,
  main: initialMainState,
  thirst: initialThirstState,
})

describe('selectPlanViewMode and the FAB rules', () => {
  it('reads the current destination', () => {
    expect(selectPlanViewMode(rootWith(planStateMocks.loaded))).toBe(
      PlanViewMode.timeline,
    )
  })

  it('offers the FAB on the timeline', () => {
    expect(selectIsPlanFabAvailable(rootWith(planStateMocks.loaded))).toBe(true)
  })

  it('stands the FAB and its glow down over the matrix', () => {
    const root = rootWith(planStateMocks.matrix)
    expect(selectIsPlanFabAvailable(root)).toBe(false)
    expect(selectIsPlanFabGlowActive(root)).toBe(false)
    expect(selectIsPlanShowingMatrix(root)).toBe(true)
  })
})

describe('selectPlanDayPickerDates', () => {
  it('renders five chips around the batch centre', () => {
    expect(
      selectPlanDayPickerDates(rootWith(planStateMocks.loaded)),
    ).toHaveLength(5)
  })

  it('falls back to today before the picker has ever rendered', () => {
    const fresh = { ...planStateMocks.loaded, dayPickerCenter: null }
    const dates = selectPlanDayPickerDates(rootWith(fresh))
    expect(planDayKey(dates[2] as Date)).toBe(
      planDayKey(planStateMocks.loaded.now),
    )
  })

  it('knows when the selected day is today', () => {
    expect(selectIsPlanShowingToday(rootWith(planStateMocks.loaded))).toBe(true)
    expect(
      selectIsPlanShowingToday(
        rootWith({ ...planStateMocks.loaded, selectedDate: tomorrow }),
      ),
    ).toBe(false)
  })
})

describe('selectPlanHourBand / selectPlanSlotCount', () => {
  it('renders midnight to midnight on the Full range', () => {
    expect(selectPlanHourBand(rootWith(planStateMocks.loaded))).toEqual({
      start: 0,
      endExclusive: 24,
    })
    expect(selectPlanSlotCount(rootWith(planStateMocks.loaded))).toBe(96)
  })

  it('renders 6am to midnight on the Waking range', () => {
    const waking = rootWith(planStateMocks.loaded, {
      [planDayViewRangeOption.key]: DayViewRange.waking,
    })
    expect(selectPlanHourBand(waking)).toEqual({
      start: 6,
      endExclusive: 24,
    })
    expect(selectPlanSlotCount(waking)).toBe(72)
  })

  it('renders 8am to 8pm on the Business range', () => {
    const business = rootWith(planStateMocks.loaded, {
      [planDayViewRangeOption.key]: DayViewRange.business,
    })
    expect(selectPlanHourBand(business)).toEqual({
      start: 8,
      endExclusive: 20,
    })
    expect(selectPlanSlotCount(business)).toBe(48)
  })
})

describe('selectPlanVista', () => {
  it('carries the registry’s own query untouched', () => {
    expect(selectPlanVista(rootWith(planStateMocks.loaded)).id).toBe('plan.day')
  })

  it('materialises the user’s hidden calendars onto the lens', () => {
    const hidden = {
      ...planStateMocks.loaded,
      visibility: {
        ...planStateMocks.loaded.visibility,
        hiddenCalendarIds: ['work'],
      },
    }
    expect(
      selectPlanVista(rootWith(hidden)).lens.hiddenCalendarIds.has('work'),
    ).toBe(true)
  })

  it('never lets a stored snapshot rewrite which toggles the sheet exposes', () => {
    expect(
      selectPlanVista(rootWith(planStateMocks.loaded)).lens.exposes.size,
    ).toBeGreaterThan(0)
  })
})

describe('selectPlanTimelineEvents — the authoritative day vs the buffer', () => {
  it('reads the authoritative array for the day it holds', () => {
    expect(
      selectPlanTimelineEvents(rootWith(planStateMocks.loaded)).map(
        (e) => e.id,
      ),
    ).toEqual(['nested-long', 'nested-short-a', 'nested-short-b'])
  })

  it('reads the buffer once the user steps to a preloaded neighbour', () => {
    const stepped = {
      ...planStateMocks.loadedWithPreload,
      selectedDate: tomorrow,
    }
    expect(
      selectPlanTimelineEvents(rootWith(stepped)).map((e) => e.id),
    ).toEqual(['tomorrow-demo'])
  })

  it('shows nothing for a day neither source covers', () => {
    const distant = {
      ...planStateMocks.loadedWithPreload,
      selectedDate: addingPlanDays(today, 40),
    }
    expect(selectPlanTimelineEvents(rootWith(distant))).toEqual([])
  })

  it('sorts chronologically whatever order the source arrived in', () => {
    const shuffled = {
      ...planStateMocks.loaded,
      dayLoad: {
        kind: 'loaded' as const,
        dayKey: planDayKey(today),
        events: [...planDayFixtures.longBlockWithShortOverlaps].reverse(),
      },
    }
    expect(
      selectPlanTimelineEvents(rootWith(shuffled)).map((e) => e.id),
    ).toEqual(['nested-long', 'nested-short-a', 'nested-short-b'])
  })

  it('hides completed items when the preference says so', () => {
    const completed: Endeavor = makeEndeavor({
      id: 'done',
      title: 'Wrapped',
      kind: EndeavorKind.calendarEvent,
      status: EndeavorStatus.closed,
      start: planAt(8),
      duration: 3600,
    })
    const state = {
      ...planStateMocks.loaded,
      showCompletedInTimeline: false,
      dayLoad: {
        kind: 'loaded' as const,
        dayKey: planDayKey(today),
        events: [completed, ...planDayFixtures.longSoloBlock],
      },
    }
    expect(selectPlanTimelineEvents(rootWith(state)).map((e) => e.id)).toEqual([
      'solo-standup',
    ])
  })

  it('substitutes the edit draft, so the reflow preview matches the commit', () => {
    const session = planStateMocks.editing.editSession as TimelineEditSession
    const editing: PlanState = {
      ...planStateMocks.editing,
      editSession: {
        ...session,
        draftStart: planAt(11),
        draftEnd: planAt(15),
      },
    }
    const edited = selectPlanTimelineEvents(rootWith(editing)).find(
      (event) => event.id === 'nested-long',
    )
    expect(edited?.start).toEqual(planAt(11))
    expect(edited?.duration).toBe(4 * 3600)
  })
})

describe('selectPlanTimelinePlacements', () => {
  it('places the day’s events on the grid', () => {
    const placements = selectPlanTimelinePlacements(
      rootWith(planStateMocks.loaded),
    )
    expect(placements.map((p) => p.endeavor.id)).toEqual([
      'nested-long',
      'nested-short-a',
      'nested-short-b',
    ])
    expect(placements[0]?.columnCount).toBe(2)
  })

  it('anchors offsets to the rendered band, not to midnight', () => {
    const business = rootWith(planStateMocks.loaded, {
      [planDayViewRangeOption.key]: DayViewRange.business,
    })
    expect(selectPlanTimelinePlacements(business)[0]?.yOffset).toBe(60)
  })

  it('places nothing on an empty day', () => {
    expect(
      selectPlanTimelinePlacements(rootWith(planStateMocks.loadedEmptyDay)),
    ).toEqual([])
  })
})

describe('selectPlanAuthoritativeEvents / selectPlanDayException', () => {
  it('exposes the loaded array', () => {
    expect(
      selectPlanAuthoritativeEvents(rootWith(planStateMocks.loaded)),
    ).toHaveLength(3)
  })

  it('exposes nothing while loading', () => {
    expect(
      selectPlanAuthoritativeEvents(rootWith(planStateMocks.loading)),
    ).toEqual([])
  })

  it('exposes the typed exception only on failure', () => {
    expect(selectPlanDayException(rootWith(planStateMocks.loaded))).toBeNull()
    expect(selectPlanDayException(rootWith(planStateMocks.failed))?.kind).toBe(
      'dayLoadFailed',
    )
  })
})

describe('quick-create availability', () => {
  it('is available on the timeline with the flag on and nothing armed', () => {
    expect(
      selectIsPlanQuickCreateAvailable(rootWith(planStateMocks.loaded)),
    ).toBe(true)
  })

  it('is unavailable with the flag off', () => {
    expect(
      selectIsPlanQuickCreateAvailable(
        rootWith({
          ...planStateMocks.loaded,
          isQuickEventCreationEnabled: false,
        }),
      ),
    ).toBe(false)
  })

  it('is unavailable while a card is armed for editing', () => {
    expect(
      selectIsPlanQuickCreateAvailable(rootWith(planStateMocks.editing)),
    ).toBe(false)
  })

  it('is unavailable on the matrix, which has no canvas to press', () => {
    expect(
      selectIsPlanQuickCreateAvailable(
        rootWith({
          ...planStateMocks.loaded,
          viewMode: PlanViewMode.priorityMatrix,
        }),
      ),
    ).toBe(false)
  })

  it('exposes the uncommitted ghost when one is showing', () => {
    expect(
      selectPlanQuickCreateDraft(rootWith(planStateMocks.quickCreating))?.start,
    ).toEqual(planAt(14))
    expect(
      selectPlanQuickCreateDraft(rootWith(planStateMocks.loaded)),
    ).toBeNull()
  })
})

describe('edit-mode reads', () => {
  it('names the armed card', () => {
    expect(selectPlanEditingEndeavorId(rootWith(planStateMocks.editing))).toBe(
      'nested-long',
    )
  })

  it('names nothing when edit mode is off', () => {
    expect(
      selectPlanEditingEndeavorId(rootWith(planStateMocks.loaded)),
    ).toBeNull()
  })

  it('previews the original times until a drag moves them', () => {
    expect(selectPlanEditPreview(rootWith(planStateMocks.editing))).toEqual({
      start: planAt(9),
      end: planAt(13),
    })
  })
})

describe('selectIsPlanActivityIndicated — one signal, three load kinds', () => {
  it('is quiet when nothing is loading', () => {
    expect(selectIsPlanActivityIndicated(rootWith(planStateMocks.loaded))).toBe(
      false,
    )
  })

  it('lights for a manual refresh', () => {
    const state = {
      ...planStateMocks.loaded,
      activity: {
        isRefreshing: true,
        isAppLoading: false,
        preloadCenterDayKey: null,
      },
    }
    expect(selectIsPlanActivityIndicated(rootWith(state))).toBe(true)
  })

  it('lights for the app-wide load', () => {
    expect(
      selectIsPlanActivityIndicated(rootWith(planStateMocks.loading)),
    ).toBe(true)
  })

  it('lights for a read-ahead window alone', () => {
    const state = {
      ...planStateMocks.loaded,
      activity: {
        isRefreshing: false,
        isAppLoading: false,
        preloadCenterDayKey: planDayKey(today),
      },
    }
    expect(selectIsPlanActivityIndicated(rootWith(state))).toBe(true)
  })

  it('stays lit until the last of the three finishes', () => {
    let state: PlanState = planStateMocks.everythingLoading
    expect(selectIsPlanActivityIndicated(rootWith(state))).toBe(true)

    state = {
      ...state,
      activity: { ...state.activity, isRefreshing: false },
    }
    expect(selectIsPlanActivityIndicated(rootWith(state))).toBe(true)

    state = {
      ...state,
      activity: { ...state.activity, isAppLoading: false },
    }
    expect(selectIsPlanActivityIndicated(rootWith(state))).toBe(true)

    state = {
      ...state,
      activity: { ...state.activity, preloadCenterDayKey: null },
    }
    expect(selectIsPlanActivityIndicated(rootWith(state))).toBe(false)
  })

  it('returns to the glyph after a failure, exactly as after a success', () => {
    expect(selectIsPlanActivityIndicated(rootWith(planStateMocks.failed))).toBe(
      false,
    )
  })
})

describe('selectCanRefreshPlan / selectIsPlanPreloadCurrent', () => {
  it('allows a refresh when none is running', () => {
    expect(selectCanRefreshPlan(rootWith(planStateMocks.loaded))).toBe(true)
  })

  it('refuses a second refresh while one is in flight', () => {
    expect(
      selectCanRefreshPlan(rootWith(planStateMocks.everythingLoading)),
    ).toBe(false)
  })

  it('knows whether the installed buffer is centred on the selected day', () => {
    expect(
      selectIsPlanPreloadCurrent(rootWith(planStateMocks.loadedWithPreload)),
    ).toBe(true)
    expect(selectIsPlanPreloadCurrent(rootWith(planStateMocks.loaded))).toBe(
      false,
    )
  })
})

describe('matrix reads', () => {
  it('admits only the triaged, open, task-shaped rows', () => {
    expect(
      selectPlanMatrixItems(rootWith(planStateMocks.matrix))
        .map((i) => i.id)
        .sort(),
    ).toEqual([
      'matrix-decide',
      'matrix-delegate',
      'matrix-delete',
      'matrix-prioritize',
      'matrix-ticket',
    ])
  })

  it('offers untriaged tasks to the picker that the board excludes', () => {
    const ids = selectPlanMatrixPickerCandidates(
      rootWith(planStateMocks.matrix),
    ).map((e) => e.id)
    expect(ids).toContain('matrix-no-due')
    expect(ids).not.toContain('matrix-habit')
  })

  it('reports an empty board before the rows have loaded', () => {
    expect(selectIsPlanMatrixEmpty(rootWith(planStateMocks.loaded))).toBe(true)
    expect(selectIsPlanMatrixEmpty(rootWith(planStateMocks.matrix))).toBe(false)
  })
})

/**
 * The four Plan preferences, read from the ONE place they are stored
 * (KC-IS-#71 item 19).
 *
 * `dayViewRange` and `showCompletedInTimeline` used to be mirrored onto
 * `PlanState` and the mirror was never filled — `onPlanPreferencesLoaded` had
 * no dispatcher anywhere in the repo — so whatever the user chose in Settings,
 * the timeline drew the Full band with completed items shown. These are the
 * cases that make the choice reach the surface.
 */
describe('the Plan preferences come from the settings snapshot', () => {
  it('falls back to the option defaults while the snapshot is empty', () => {
    const root = rootWith(planStateMocks.loaded)

    expect(selectPlanDayViewRange(root)).toBe(DayViewRange.full)
    expect(selectPlanShowsCompleted(root)).toBe(true)
    expect(selectPlanListSort(root)).toBe(PlanListSort.time)
    expect(selectPlanListGrouping(root)).toBe(PlanListGrouping.none)
  })

  it('follows the user’s choice once the snapshot carries one', () => {
    const root = rootWith(planStateMocks.loaded, {
      [planDayViewRangeOption.key]: DayViewRange.business,
      [planShowCompletedInTimelineOption.key]: false,
      [planListSortOption.key]: PlanListSort.title,
      [planListGroupingOption.key]: PlanListGrouping.project,
    })

    expect(selectPlanDayViewRange(root)).toBe(DayViewRange.business)
    expect(selectPlanShowsCompleted(root)).toBe(false)
    expect(selectPlanListSort(root)).toBe(PlanListSort.title)
    expect(selectPlanListGrouping(root)).toBe(PlanListGrouping.project)
  })

  it('refuses a stored value the enumeration does not know, taking canon’s fallback', () => {
    // A hand-edited preference file, or a value written by a newer build.
    const root = rootWith(planStateMocks.loaded, {
      [planDayViewRangeOption.key]: 'nocturnal',
      [planListSortOption.key]: 'by-vibes',
      [planListGroupingOption.key]: 'by-vibes',
      [planShowCompletedInTimelineOption.key]: 'yes please',
    })

    expect(selectPlanDayViewRange(root)).toBe(DayViewRange.full)
    expect(selectPlanShowsCompleted(root)).toBe(true)
    expect(selectPlanListSort(root)).toBe(PlanListSort.time)
    expect(selectPlanListGrouping(root)).toBe(PlanListGrouping.none)
  })
})

/**
 * The row capabilities, resolved against the flags the surface cached
 * (KC-IS-#71 item 22) rather than against the `() => false` stand-in
 * `resolveEndeavorCapabilities` documents for a dark-launched flag.
 */
describe('selectPlanRowCapabilities', () => {
  const operationsWith = (enabledCapabilityFlags: readonly string[]) =>
    selectPlanRowCapabilities(
      rootWith({ ...planStateMocks.loaded, enabledCapabilityFlags }),
    ).operations.map((binding) => binding.operation)

  it('withholds the gated Detail tap while its flag is unresolved — the shipping baseline', () => {
    expect(operationsWith([])).not.toContain('viewDetail')
  })

  it('offers it once the flag is cached as enabled', () => {
    expect(operationsWith([FeatureFlags.endeavorDetail.name])).toContain(
      'viewDetail',
    )
  })

  it('still affords the two ungated swipe operations either way', () => {
    for (const flags of [[], [FeatureFlags.endeavorDetail.name]]) {
      const operations = operationsWith(flags)
      expect(operations).toContain('startSession')
      expect(operations).toContain('delete')
    }
  })
})
