/**
 * The trailing detail pane's state tier — canon `#517` (`MacDetailPane.md`).
 *
 * Shifters pure (`RC-56`), reducer arms against the slice reducer (`RC-12`),
 * Selectors against a hand-built root state (`RC-55`), and the flag's
 * resolution through the real shell load against a stubbed flag service
 * (`RC-54`). Every state comes from `MainMocks` (`RC-31`).
 */
import {
  FeatureFlags,
  disabledAssignment,
  enabledAssignment,
  makeHardcodedFeatureFlagService,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  type RootState,
  makeStore,
  stubbedThunkExtra,
} from '../../../library/store'
import {
  DETAIL_PANE_SEGMENTS,
  detailPaneSegmentLabel,
  detailPaneTitle,
} from '../DetailPane'
import {
  mainSlice,
  userDidDismissDetailPane,
  userDidRequestDayProgress,
  onShellMounted,
  userDidDrillIntoDetailPane,
  userDidTapDetailPaneBack,
  userDidRequestEndeavorDetail,
  userDidRequestSessionSetup,
  userDidSelectDetailPaneSegment,
} from '../MainFeature'
import {
  MainMocks,
  desktopSurface,
  handheldSurface,
  statusQuoGates,
} from '../MainMocks'
import { loadShellThunk, openSessionSurfaceThunk } from '../MainProducer'
import { makeRecordingNavigationService } from '../../../services/navigation/NavigationService'
import {
  selectCanDetailPaneGoBack,
  selectDetailPaneDepth,
  selectDetailPaneEndeavor,
  selectDetailPaneLocationKey,
  selectDetailPaneSegment,
  selectDetailPaneSubtitle,
  selectDetailPaneTitle,
  selectIsDetailPaneAvailable,
  selectIsDetailPanePresented,
} from '../MainSelectors'
import {
  withDetailPaneDismissed,
  withDetailPaneEndeavorSelected,
  withDetailPaneSegmentSelected,
  withShellLoaded,
} from '../MainShifters'
import type { MainState } from '../MainFeature'

const reduce = mainSlice.reducer
const rootWith = (main: MainState): RootState =>
  ({ ...makeStore(stubbedThunkExtra).getState(), main }) as RootState

const review = { id: 'e-1', title: 'Write the quarterly review' }
const walk = { id: 'e-9', title: 'Evening walk' }

describe('the segment vocabulary', () => {
  it('lists the three segments in the toolbar order canon uses', () => {
    expect(DETAIL_PANE_SEGMENTS).toEqual([
      'sessionSetup',
      'performance',
      'plan',
    ])
  })

  it("labels the toolbar controls with canon's exact names", () => {
    expect(DETAIL_PANE_SEGMENTS.map(detailPaneSegmentLabel)).toEqual([
      'Session',
      'Performance',
      'Plan',
    ])
  })

  it('titles the header for the endeavor-specific mode of each segment', () => {
    expect(detailPaneTitle('sessionSetup', 'Walk')).toBe('Session Setup')
    expect(detailPaneTitle('performance', 'Walk')).toBe('Endeavor Activity')
    expect(detailPaneTitle('plan', 'Walk')).toBe('Details')
  })

  it('titles the header for the endeavor-free mode of each segment', () => {
    expect(detailPaneTitle('sessionSetup', null)).toBe('New Session')
    expect(detailPaneTitle('performance', null)).toBe('Day Progress')
    expect(detailPaneTitle('plan', null)).toBe('Timeline')
  })
})

describe('withDetailPaneSegmentSelected', () => {
  it('opens a hidden pane on the segment the user clicked', () => {
    const next = withDetailPaneSegmentSelected(
      MainMocks.desktopDetailPaneReady,
      'performance',
    )
    expect(next.detailPane.segment).toBe('performance')
  })

  it('hides the pane when the user clicks the segment already showing', () => {
    const next = withDetailPaneSegmentSelected(
      MainMocks.desktopDetailPanePlan,
      'plan',
    )
    expect(next.detailPane.segment).toBeNull()
    expect(next.detailPane.endeavor).toEqual(review)
  })

  it('switches segments and keeps reading the same endeavor', () => {
    const next = withDetailPaneSegmentSelected(
      MainMocks.desktopDetailPanePlan,
      'sessionSetup',
    )
    expect(next.detailPane).toEqual({
      segment: 'sessionSetup',
      endeavor: review,
    })
  })
})

describe('withDetailPaneEndeavorSelected', () => {
  it('points a hidden pane at an endeavor and shows its details', () => {
    const next = withDetailPaneEndeavorSelected(
      MainMocks.desktopDetailPaneReady,
      walk,
      'plan',
    )
    expect(next.detailPane).toEqual({ segment: 'plan', endeavor: walk })
  })

  it('replaces the endeavor an open pane was reading — double-click another card', () => {
    const next = withDetailPaneEndeavorSelected(
      MainMocks.desktopDetailPanePlan,
      walk,
      'plan',
    )
    expect(next.detailPane.endeavor).toEqual(walk)
  })

  it('clears the endeavor for the whole-day mode — the rings open Day Progress', () => {
    const next = withDetailPaneEndeavorSelected(
      MainMocks.desktopDetailPanePlan,
      null,
      'performance',
    )
    expect(next.detailPane).toEqual({ segment: 'performance', endeavor: null })
  })
})

describe('withDetailPaneDismissed', () => {
  it('hides an open pane', () => {
    expect(
      withDetailPaneDismissed(MainMocks.desktopDetailPanePlan).detailPane
        .segment,
    ).toBeNull()
  })

  it('keeps the endeavor so the toolbar reopens the same reading', () => {
    expect(
      withDetailPaneDismissed(MainMocks.desktopDetailPanePlan).detailPane
        .endeavor,
    ).toEqual(review)
  })

  it('is a no-op on a pane that is already hidden', () => {
    const state = MainMocks.desktopDetailPaneReady
    expect(withDetailPaneDismissed(state)).toEqual(state)
  })
})

describe('withShellLoaded installs the flag', () => {
  it('records the pane as enabled when the flag resolved on', () => {
    const next = withShellLoaded(MainMocks.idle, {
      gates: statusQuoGates,
      projects: [],
      isDetailPaneEnabled: true,
    })
    expect(next.isDetailPaneEnabled).toBe(true)
  })

  it('records it as disabled when the flag resolved off', () => {
    const next = withShellLoaded(MainMocks.desktopDetailPaneReady, {
      gates: statusQuoGates,
      projects: [],
      isDetailPaneEnabled: false,
    })
    expect(next.isDetailPaneEnabled).toBe(false)
  })

  it('defaults to disabled when a configuration carries no answer', () => {
    const next = withShellLoaded(MainMocks.idle, {
      gates: statusQuoGates,
      projects: [],
    })
    expect(next.isDetailPaneEnabled).toBe(false)
  })
})

describe('userDidSelectDetailPaneSegment', () => {
  it('opens Session from the toolbar on a hidden pane', () => {
    const next = reduce(
      MainMocks.desktopDetailPaneReady,
      userDidSelectDetailPaneSegment({ segment: 'sessionSetup' }),
    )
    expect(next.detailPane.segment).toBe('sessionSetup')
  })

  it('closes the pane when Plan is clicked while Plan is showing', () => {
    const next = reduce(
      MainMocks.desktopDetailPanePlan,
      userDidSelectDetailPaneSegment({ segment: 'plan' }),
    )
    expect(next.detailPane.segment).toBeNull()
  })

  it('moves from Day Progress to Plan without inventing an endeavor', () => {
    const next = reduce(
      MainMocks.desktopDetailPaneDayProgress,
      userDidSelectDetailPaneSegment({ segment: 'plan' }),
    )
    expect(next.detailPane).toEqual({ segment: 'plan', endeavor: null })
  })
})

describe('userDidDismissDetailPane', () => {
  it('closes the pane from its header dismiss control', () => {
    const next = reduce(
      MainMocks.desktopDetailPanePlan,
      userDidDismissDetailPane(),
    )
    expect(next.detailPane.segment).toBeNull()
  })

  it('closes Day Progress on Escape', () => {
    const next = reduce(
      MainMocks.desktopDetailPaneDayProgress,
      userDidDismissDetailPane(),
    )
    expect(next.detailPane.segment).toBeNull()
  })

  it('leaves every other shell field untouched', () => {
    const before = MainMocks.desktopDetailPanePlan
    const next = reduce(before, userDidDismissDetailPane())
    expect({ ...next, detailPane: before.detailPane }).toEqual(before)
  })
})

describe('userDidRequestEndeavorDetail', () => {
  it('opens Plan on the endeavor a card was double-clicked on', () => {
    const next = reduce(
      MainMocks.desktopDetailPaneReady,
      userDidRequestEndeavorDetail({ endeavor: walk }),
    )
    expect(next.detailPane).toEqual({ segment: 'plan', endeavor: walk })
  })

  it('switches an open Performance pane over to that endeavor’s details', () => {
    const next = reduce(
      MainMocks.desktopDetailPaneDayProgress,
      userDidRequestEndeavorDetail({ endeavor: review }),
    )
    expect(next.detailPane).toEqual({ segment: 'plan', endeavor: review })
  })

  it('keeps Plan open when the same endeavor is requested again', () => {
    const next = reduce(
      MainMocks.desktopDetailPanePlan,
      userDidRequestEndeavorDetail({ endeavor: review }),
    )
    expect(next.detailPane.segment).toBe('plan')
  })
})

describe('userDidRequestDayProgress', () => {
  it('opens Day Progress from the rings on a hidden pane', () => {
    const next = reduce(
      MainMocks.desktopDetailPaneReady,
      userDidRequestDayProgress(),
    )
    expect(next.detailPane).toEqual({ segment: 'performance', endeavor: null })
  })

  it('drops the endeavor Plan was reading — the rings read the whole day', () => {
    const next = reduce(
      MainMocks.desktopDetailPanePlan,
      userDidRequestDayProgress(),
    )
    expect(next.detailPane.endeavor).toBeNull()
  })

  it('stays on Day Progress when the rings are clicked again', () => {
    const next = reduce(
      MainMocks.desktopDetailPaneDayProgress,
      userDidRequestDayProgress(),
    )
    expect(next.detailPane.segment).toBe('performance')
  })
})

describe('selectIsDetailPaneAvailable', () => {
  it('is true on the desktop sidebar with the flag on', () => {
    expect(
      selectIsDetailPaneAvailable(rootWith(MainMocks.desktopDetailPaneReady)),
    ).toBe(true)
  })

  it('is false with the flag off — the dialog and the route stay', () => {
    expect(selectIsDetailPaneAvailable(rootWith(MainMocks.desktopLoaded))).toBe(
      false,
    )
  })

  it('is false on the tab-bar shell even with the flag on', () => {
    expect(
      selectIsDetailPaneAvailable(rootWith(MainMocks.handheldDetailPaneOpen)),
    ).toBe(false)
  })
})

describe('selectDetailPaneSegment / selectIsDetailPanePresented', () => {
  it('reads the showing segment on the desktop', () => {
    const root = rootWith(MainMocks.desktopDetailPanePlan)
    expect(selectDetailPaneSegment(root)).toBe('plan')
    expect(selectIsDetailPanePresented(root)).toBe(true)
  })

  it('reads nothing when the pane is hidden', () => {
    const root = rootWith(MainMocks.desktopDetailPaneReady)
    expect(selectDetailPaneSegment(root)).toBeNull()
    expect(selectIsDetailPanePresented(root)).toBe(false)
  })

  it('reads nothing on a phone, whatever the state left behind says', () => {
    const root = rootWith(MainMocks.handheldDetailPaneOpen)
    expect(selectDetailPaneSegment(root)).toBeNull()
    expect(selectIsDetailPanePresented(root)).toBe(false)
  })
})

describe('selectDetailPaneEndeavor', () => {
  it('reads the endeavor Plan is showing', () => {
    expect(
      selectDetailPaneEndeavor(rootWith(MainMocks.desktopDetailPanePlan)),
    ).toEqual(review)
  })

  it('reads nothing in the whole-day mode', () => {
    expect(
      selectDetailPaneEndeavor(
        rootWith(MainMocks.desktopDetailPaneDayProgress),
      ),
    ).toBeNull()
  })

  it('reads nothing before the pane was ever pointed anywhere', () => {
    expect(selectDetailPaneEndeavor(rootWith(MainMocks.idle))).toBeNull()
  })
})

describe('selectDetailPaneTitle / selectDetailPaneSubtitle', () => {
  it('titles Plan on an endeavor "Details", subtitled with its name', () => {
    const root = rootWith(MainMocks.desktopDetailPanePlan)
    expect(selectDetailPaneTitle(root)).toBe('Details')
    expect(selectDetailPaneSubtitle(root)).toBe(review.title)
  })

  it('titles the whole-day Performance "Day Progress" with no subtitle', () => {
    const root = rootWith(MainMocks.desktopDetailPaneDayProgress)
    expect(selectDetailPaneTitle(root)).toBe('Day Progress')
    expect(selectDetailPaneSubtitle(root)).toBeNull()
  })

  it('titles nothing while the pane is hidden', () => {
    const root = rootWith(MainMocks.desktopDetailPaneReady)
    expect(selectDetailPaneTitle(root)).toBeNull()
    expect(selectDetailPaneSubtitle(root)).toBeNull()
  })
})

describe('loadShellThunk resolves macDetailPane', () => {
  it('turns the pane on under the shipping flags, as canon ships it', async () => {
    const store = makeStore(stubbedThunkExtra)
    await store.dispatch(loadShellThunk())
    expect(store.getState().main.isDetailPaneEnabled).toBe(true)
  })

  it('turns the pane off when the kill switch is thrown', async () => {
    const store = makeStore({
      ...stubbedThunkExtra,
      featureFlags: makeHardcodedFeatureFlagService({
        overrides: [disabledAssignment(FeatureFlags.macDetailPane)],
      }),
    })
    await store.dispatch(loadShellThunk())
    expect(store.getState().main.isDetailPaneEnabled).toBe(false)
  })

  it('still resolves the flag when the Lists read fails', async () => {
    const store = makeStore({
      ...stubbedThunkExtra,
      featureFlags: makeHardcodedFeatureFlagService({
        overrides: [enabledAssignment(FeatureFlags.macDetailPane)],
      }),
      localStore: {
        ...stubbedThunkExtra.localStore,
        projects: {
          ...stubbedThunkExtra.localStore.projects,
          all: () => Promise.reject(new TypeError('closed')),
        },
      },
    })
    await store.dispatch(loadShellThunk())
    expect(store.getState().main.load.kind).toBe('failed')
    expect(store.getState().main.isDetailPaneEnabled).toBe(true)
  })
})

describe('userDidRequestSessionSetup', () => {
  it('opens Session on the running session’s endeavor from the pill', () => {
    const next = reduce(
      MainMocks.desktopDetailPaneReady,
      userDidRequestSessionSetup({ endeavor: walk }),
    )
    expect(next.detailPane).toEqual({ segment: 'sessionSetup', endeavor: walk })
  })

  it('opens New Session for an anonymous session', () => {
    const next = reduce(
      MainMocks.desktopDetailPanePlan,
      userDidRequestSessionSetup({ endeavor: null }),
    )
    expect(next.detailPane).toEqual({ segment: 'sessionSetup', endeavor: null })
  })

  it('keeps Session showing when it is requested again', () => {
    const open = reduce(
      MainMocks.desktopDetailPaneReady,
      userDidRequestSessionSetup({ endeavor: walk }),
    )
    expect(
      reduce(open, userDidRequestSessionSetup({ endeavor: walk })).detailPane
        .segment,
    ).toBe('sessionSetup')
  })
})

describe('openSessionSurfaceThunk', () => {
  const shellOn = (
    surface: typeof desktopSurface,
    navigation = makeRecordingNavigationService(),
  ) => {
    const store = makeStore({ ...stubbedThunkExtra, navigation })
    store.dispatch(onShellMounted({ surface, isDevelopment: false }))
    return { store, navigation }
  }

  it('opens the pane’s Session segment on the desktop sidebar', async () => {
    const { store, navigation } = shellOn(desktopSurface)
    await store.dispatch(loadShellThunk())
    await store.dispatch(openSessionSurfaceThunk({ endeavor: walk }))
    expect(store.getState().main.detailPane).toEqual({
      segment: 'sessionSetup',
      endeavor: walk,
    })
    expect(navigation.calls).toEqual([])
  })

  it('navigates to Execute on the phone layout, leaving the pane alone', async () => {
    const { store, navigation } = shellOn(handheldSurface)
    await store.dispatch(loadShellThunk())
    await store.dispatch(openSessionSurfaceThunk({ endeavor: walk }))
    expect(navigation.calls).toEqual([{ kind: 'navigate', path: '/execute' }])
    expect(store.getState().main.detailPane.segment).toBeNull()
  })

  it('navigates to Execute when the kill switch is thrown', async () => {
    const navigation = makeRecordingNavigationService()
    const store = makeStore({
      ...stubbedThunkExtra,
      navigation,
      featureFlags: makeHardcodedFeatureFlagService({
        overrides: [disabledAssignment(FeatureFlags.macDetailPane)],
      }),
    })
    store.dispatch(
      onShellMounted({ surface: desktopSurface, isDevelopment: false }),
    )
    await store.dispatch(loadShellThunk())
    await store.dispatch(openSessionSurfaceThunk({ endeavor: null }))
    expect(navigation.calls).toEqual([{ kind: 'navigate', path: '/execute' }])
  })

  it('resolves an error rather than throwing when the router fails', async () => {
    const { store } = shellOn(handheldSurface, {
      ...makeRecordingNavigationService(),
      navigate: () => {
        throw new Error('router gone')
      },
    })
    const action = await store.dispatch(
      openSessionSurfaceThunk({ endeavor: null }),
    )
    expect(action.type).toContain('fulfilled')
    expect((action.payload as { ok: boolean }).ok).toBe(false)
  })
})

const activity = (endeavor: typeof walk) => ({
  location: { segment: 'performance' as const, endeavor },
})

describe('userDidDrillIntoDetailPane', () => {
  it('pushes Session Setup and shows that endeavor’s activity', () => {
    const onSession = reduce(
      MainMocks.desktopDetailPaneReady,
      userDidRequestSessionSetup({ endeavor: walk }),
    )
    const next = reduce(onSession, userDidDrillIntoDetailPane(activity(walk)))
    expect(next.detailPane).toEqual({ segment: 'performance', endeavor: walk })
    expect(next.detailPaneBackStack).toEqual([
      { segment: 'sessionSetup', endeavor: walk },
    ])
  })

  it('opens a hidden pane without a trail — there is nowhere to go back to', () => {
    const next = reduce(
      MainMocks.desktopDetailPaneReady,
      userDidDrillIntoDetailPane(activity(review)),
    )
    expect(next.detailPane).toEqual({
      segment: 'performance',
      endeavor: review,
    })
    expect(next.detailPaneBackStack).toEqual([])
  })

  it('stacks a second drill-in on the first', () => {
    const once = reduce(
      MainMocks.desktopDetailPanePlan,
      userDidDrillIntoDetailPane(activity(review)),
    )
    const twice = reduce(
      once,
      userDidDrillIntoDetailPane({
        location: { segment: 'sessionSetup', endeavor: review },
      }),
    )
    expect(twice.detailPaneBackStack).toHaveLength(2)
  })
})

describe('userDidTapDetailPaneBack', () => {
  const drilled = reduce(
    MainMocks.desktopDetailPanePlan,
    userDidDrillIntoDetailPane(activity(review)),
  )

  it('returns to where the drill-in left from', () => {
    const back = reduce(drilled, userDidTapDetailPaneBack())
    expect(back.detailPane).toEqual(MainMocks.desktopDetailPanePlan.detailPane)
    expect(back.detailPaneBackStack).toEqual([])
  })

  it('is a no-op at a top-level reading', () => {
    const state = MainMocks.desktopDetailPanePlan
    expect(reduce(state, userDidTapDetailPaneBack())).toEqual(state)
  })

  it('drops the trail on any top-level move — a toolbar pick or a dismiss', () => {
    expect(
      reduce(drilled, userDidSelectDetailPaneSegment({ segment: 'plan' }))
        .detailPaneBackStack,
    ).toEqual([])
    expect(
      reduce(drilled, userDidDismissDetailPane()).detailPaneBackStack,
    ).toEqual([])
  })
})

describe('selectCanDetailPaneGoBack / selectDetailPaneDepth', () => {
  const drilled = reduce(
    MainMocks.desktopDetailPanePlan,
    userDidDrillIntoDetailPane(activity(review)),
  )

  it('offers Back once drilled in', () => {
    expect(selectCanDetailPaneGoBack(rootWith(drilled))).toBe(true)
    expect(selectDetailPaneDepth(rootWith(drilled))).toBe(1)
  })

  it('offers Close at a top-level reading', () => {
    const root = rootWith(MainMocks.desktopDetailPanePlan)
    expect(selectCanDetailPaneGoBack(root)).toBe(false)
    expect(selectDetailPaneDepth(root)).toBe(0)
  })

  it('offers nothing where the pane is not showing (a phone)', () => {
    expect(
      selectCanDetailPaneGoBack(
        rootWith({ ...drilled, surface: MainMocks.handheldLoaded.surface }),
      ),
    ).toBe(false)
  })

  it('keys each reading, so a push and a pop replay the slide', () => {
    expect(selectDetailPaneLocationKey(rootWith(drilled))).not.toBe(
      selectDetailPaneLocationKey(rootWith(MainMocks.desktopDetailPanePlan)),
    )
  })
})
