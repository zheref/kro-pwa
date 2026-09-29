/**
 * The pane's web-only Inbox segment — its vocabulary, its flag, the Selectors
 * that read it, and the reducer path that reveals it when a capture routes to
 * the Inbox. States come from `MainMocks` (`RC-31`).
 */
import {
  FeatureFlags,
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
  detailPaneSegmentReadsEndeavor,
  detailPaneSegmentsOffered,
  detailPaneTitle,
} from '../DetailPane'
import {
  type MainState,
  type PendingShellRoute,
  mainSlice,
  onShellMounted,
} from '../MainFeature'
import { MainMocks, desktopSurface, handheldSurface } from '../MainMocks'
import { deliverCaptureRouteThunk, loadShellThunk } from '../MainProducer'
import {
  selectDetailPaneSegment,
  selectDetailPaneSegments,
  selectDetailPaneSubtitle,
  selectDetailPaneTitle,
  selectIsInboxHostedByPane,
} from '../MainSelectors'
import {
  isInboxHostedByPane,
  withDetailPaneInboxRevealed,
} from '../MainShifters'
import { DestinationKind } from '../SidebarDestination'

const reduce = mainSlice.reducer
const rootWith = (main: MainState): RootState =>
  ({ ...makeStore(stubbedThunkExtra).getState(), main }) as RootState

describe('detailPaneSegmentsOffered', () => {
  it('offers canon’s three segments while the Inbox flag is off', () => {
    expect(detailPaneSegmentsOffered(false)).toEqual([
      'sessionSetup',
      'performance',
      'plan',
    ])
  })

  it('adds Inbox last while the flag is on, keeping canon’s order first', () => {
    expect(detailPaneSegmentsOffered(true)).toEqual([
      'sessionSetup',
      'performance',
      'plan',
      'inbox',
    ])
  })

  it('never offers a segment twice', () => {
    const offered = detailPaneSegmentsOffered(true)
    expect(new Set(offered).size).toBe(offered.length)
  })
})

describe('the Inbox header', () => {
  it('reads "Inbox" whatever the pane is pointed at', () => {
    expect(detailPaneTitle('inbox', 'Pay rent')).toBe('Inbox')
    expect(detailPaneTitle('inbox', null)).toBe('Inbox')
  })

  it('carries no subtitle — the Inbox is its own list, not an endeavor’s reading', () => {
    expect(detailPaneSegmentReadsEndeavor('inbox')).toBe(false)
    expect(
      selectDetailPaneSubtitle(rootWith(MainMocks.desktopDetailPaneInbox)),
    ).toBeNull()
  })

  it('keeps the endeavor subtitle on canon’s segments', () => {
    expect(detailPaneSegmentReadsEndeavor('plan')).toBe(true)
    expect(
      selectDetailPaneSubtitle(rootWith(MainMocks.desktopDetailPanePlan)),
    ).toBe('Write the quarterly review')
  })
})

describe('withDetailPaneInboxRevealed', () => {
  it('opens a hidden pane on the Inbox, where the capture waits', () => {
    const next = withDetailPaneInboxRevealed(
      MainMocks.desktopDetailPaneInboxReady,
    )
    expect(next.detailPane).toEqual({ segment: 'inbox', endeavor: null })
  })

  it('switches a pane showing another reading over to the Inbox, keeping its selection', () => {
    const onPlan: MainState = {
      ...MainMocks.desktopDetailPanePlan,
      isDetailPaneInboxEnabled: true,
      detailPaneBackStack: [{ segment: 'performance', endeavor: null }],
    }
    const next = withDetailPaneInboxRevealed(onPlan)
    expect(next.detailPane).toEqual({
      segment: 'inbox',
      endeavor: onPlan.detailPane.endeavor,
    })
    expect(next.detailPaneBackStack).toEqual([])
  })

  it('leaves the pane alone with the flag off, or on the phone layout', () => {
    expect(withDetailPaneInboxRevealed(MainMocks.desktopDetailPaneReady)).toBe(
      MainMocks.desktopDetailPaneReady,
    )
    const phone: MainState = {
      ...MainMocks.desktopDetailPaneInboxReady,
      surface: handheldSurface,
    }
    expect(isInboxHostedByPane(phone)).toBe(false)
    expect(withDetailPaneInboxRevealed(phone)).toBe(phone)
  })
})

const inboxRoute: PendingShellRoute = {
  context: {
    destination: { kind: DestinationKind.inbox },
    endeavorId: 'e-new',
    day: null,
    scrollTarget: null,
    highlight: false,
    listMode: false,
    autoNavigates: false,
  },
  deliverAtMs: 0,
}

describe('a capture routed to the Inbox, delivered', () => {
  const delivered = (state: MainState, route: PendingShellRoute) =>
    reduce(
      state,
      deliverCaptureRouteThunk.fulfilled(
        { ok: true, value: route.context },
        'request',
        { pending: route, now: new Date(1) },
      ),
    )

  it('reveals the pane’s Inbox on a pane host with the flag on', () => {
    expect(
      delivered(MainMocks.desktopDetailPaneInboxReady, inboxRoute).detailPane,
    ).toEqual({ segment: 'inbox', endeavor: null })
  })

  it('keeps the endeavor the pane was reading — the capture does not drop it', () => {
    const reading: MainState = {
      ...MainMocks.desktopDetailPanePlan,
      isDetailPaneInboxEnabled: true,
    }
    expect(delivered(reading, inboxRoute).detailPane).toEqual({
      segment: 'inbox',
      endeavor: reading.detailPane.endeavor,
    })
  })

  it('leaves the pane hidden with the flag off — the overlay presents it', () => {
    expect(
      delivered(MainMocks.desktopDetailPaneReady, inboxRoute).detailPane
        .segment,
    ).toBeNull()
  })

  it('never reveals the Inbox for a capture routed to the Plan', () => {
    const planRoute: PendingShellRoute = {
      ...inboxRoute,
      context: {
        ...inboxRoute.context,
        destination: { kind: DestinationKind.plan },
        autoNavigates: true,
      },
    }
    expect(
      delivered(MainMocks.desktopDetailPaneInboxReady, planRoute).detailPane
        .segment,
    ).toBeNull()
  })
})

describe('selectIsInboxHostedByPane', () => {
  it('is true on the desktop pane host with the flag on', () => {
    expect(
      selectIsInboxHostedByPane(
        rootWith(MainMocks.desktopDetailPaneInboxReady),
      ),
    ).toBe(true)
  })

  it('is false with the flag off', () => {
    expect(
      selectIsInboxHostedByPane(rootWith(MainMocks.desktopDetailPaneReady)),
    ).toBe(false)
  })

  it('is false on the phone layout, where the Inbox stays a sheet', () => {
    expect(
      selectIsInboxHostedByPane(
        rootWith({
          ...MainMocks.desktopDetailPaneInboxReady,
          surface: handheldSurface,
        }),
      ),
    ).toBe(false)
  })
})

describe('selectDetailPaneSegments and selectDetailPaneSegment', () => {
  it('offers Inbox when the shell loaded with the flag on', () => {
    expect(
      selectDetailPaneSegments(rootWith(MainMocks.desktopDetailPaneInbox)),
    ).toContain('inbox')
  })

  it('reads the Inbox segment and titles the pane "Inbox"', () => {
    const root = rootWith(MainMocks.desktopDetailPaneInbox)
    expect(selectDetailPaneSegment(root)).toBe('inbox')
    expect(selectDetailPaneTitle(root)).toBe('Inbox')
  })

  it('hides a pane left on the Inbox once the flag is off', () => {
    const flagOff: MainState = {
      ...MainMocks.desktopDetailPaneInbox,
      isDetailPaneInboxEnabled: false,
    }
    expect(selectDetailPaneSegment(rootWith(flagOff))).toBeNull()
    expect(selectDetailPaneSegments(rootWith(flagOff))).not.toContain('inbox')
  })
})

describe('the detailPaneInbox flag, through the shell load', () => {
  const loadWith = async (inboxOn: boolean) => {
    const store = makeStore({
      ...stubbedThunkExtra,
      featureFlags: makeHardcodedFeatureFlagService({
        overrides: inboxOn
          ? [enabledAssignment(FeatureFlags.detailPaneInbox)]
          : [],
      }),
    })
    store.dispatch(
      onShellMounted({ surface: desktopSurface, isDevelopment: false }),
    )
    await store.dispatch(loadShellThunk())
    return store.getState().main
  }

  it('installs the segment when the flag is on', async () => {
    expect((await loadWith(true)).isDetailPaneInboxEnabled).toBe(true)
  })

  it('keeps it off on the status quo, where it ships dark', async () => {
    expect((await loadWith(false)).isDetailPaneInboxEnabled).toBe(false)
  })

  it('leaves the pane itself on either way', async () => {
    expect((await loadWith(false)).isDetailPaneEnabled).toBe(true)
  })
})
