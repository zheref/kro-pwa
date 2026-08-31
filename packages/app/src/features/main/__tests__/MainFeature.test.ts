/**
 * The slice: sync arms called directly against the reducer (`RC-12`), and the
 * thunk lifecycle driven through the real thunk against a stubbed store
 * (`RC-54`).
 */
import {
  FeatureFlags,
  disabledAssignment,
  makeHardcodedFeatureFlagService,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import { makeStore, stubbedThunkExtra } from '../../../library/store'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import {
  initialMainState,
  mainSlice,
  onDestinationRouteMounted,
  onShellMounted,
  onShellRouteContextConsumed,
  onSurfaceChanged,
  userDidCancelAddProject,
  userDidChangeSearchQuery,
  userDidEditDraftProjectTitle,
  userDidTapAddProject,
  userDidTapDestination,
  userDidToggleSidebar,
} from '../MainFeature'
import { desktopSurface, handheldSurface, MainMocks } from '../MainMocks'
import { loadShellThunk } from '../MainProducer'
import { DestinationKind } from '../SidebarDestination'

const reduce = mainSlice.reducer

describe('onShellMounted', () => {
  it('stamps the first measurement and the host\'s build kind', () => {
    const next = reduce(
      initialMainState,
      onShellMounted({ surface: handheldSurface, isDevelopment: true }),
    )
    expect(next.surface).toEqual(handheldSurface)
    expect(next.isDevelopment).toBe(true)
  })

  it('lands on My Day before any flag has resolved', () => {
    expect(initialMainState.selected.kind).toBe(DestinationKind.myDay)
  })

  it('leaves a production build without the Tweak row\'s permission', () => {
    const next = reduce(
      initialMainState,
      onShellMounted({ surface: desktopSurface, isDevelopment: false }),
    )
    expect(next.isDevelopment).toBe(false)
  })
})

describe('onSurfaceChanged — acceptance criterion 2', () => {
  it('keeps the selected destination when the window narrows past the breakpoint', () => {
    const onEarn = reduce(
      MainMocks.desktopLoaded,
      userDidTapDestination({ destination: { kind: DestinationKind.earn } }),
    )
    const narrowed = reduce(
      onEarn,
      onSurfaceChanged({ surface: handheldSurface }),
    )

    expect(narrowed.surface).toEqual(handheldSurface)
    expect(narrowed.selected.kind).toBe(DestinationKind.earn)
  })

  it('keeps it on the way back out again', () => {
    const narrowed = reduce(
      MainMocks.desktopOnPlan,
      onSurfaceChanged({ surface: handheldSurface }),
    )
    const widened = reduce(
      narrowed,
      onSurfaceChanged({ surface: desktopSurface }),
    )

    expect(widened.selected.kind).toBe(DestinationKind.plan)
  })

  it('is a no-op when the class has not actually changed', () => {
    const same = reduce(
      MainMocks.desktopLoaded,
      onSurfaceChanged({ surface: desktopSurface }),
    )
    expect(same).toEqual(MainMocks.desktopLoaded)
  })
})

describe('selection', () => {
  it('follows a route mount, which is how a pasted link selects', () => {
    const next = reduce(
      MainMocks.desktopLoaded,
      onDestinationRouteMounted({
        destination: { kind: DestinationKind.inbox },
      }),
    )
    expect(next.selected.kind).toBe(DestinationKind.inbox)
  })

  it('follows a tap immediately, before the navigation resolves', () => {
    const next = reduce(
      MainMocks.desktopLoaded,
      userDidTapDestination({ destination: { kind: DestinationKind.earn } }),
    )
    expect(next.selected.kind).toBe(DestinationKind.earn)
  })

  it('follows a list route, carrying the project id', () => {
    const next = reduce(
      MainMocks.desktopLoaded,
      onDestinationRouteMounted({
        destination: {
          kind: DestinationKind.list,
          listId: 'p-2',
          listTitle: 'Work',
        },
      }),
    )
    expect(next.selected).toMatchObject({ kind: 'list', listId: 'p-2' })
  })
})

describe('the sidebar column and its search field', () => {
  it('collapses and restores on the toggle', () => {
    const hidden = reduce(MainMocks.desktopLoaded, userDidToggleSidebar())
    expect(hidden.isSidebarVisible).toBe(false)
    expect(reduce(hidden, userDidToggleSidebar()).isSidebarVisible).toBe(true)
  })

  it('records the query as it is typed', () => {
    const next = reduce(
      MainMocks.desktopLoaded,
      userDidChangeSearchQuery({ query: 'tax' }),
    )
    expect(next.searchQuery).toBe('tax')
  })

  it('accepts an emptied query rather than ignoring the clear', () => {
    const typed = reduce(
      MainMocks.desktopLoaded,
      userDidChangeSearchQuery({ query: 'tax' }),
    )
    expect(
      reduce(typed, userDidChangeSearchQuery({ query: '' })).searchQuery,
    ).toBe('')
  })
})

describe('the inline "New project…" row', () => {
  it('opens on the section\'s "+"', () => {
    const next = reduce(MainMocks.desktopLoaded, userDidTapAddProject())
    expect(next.isAddingProject).toBe(true)
  })

  it('records the name being typed', () => {
    const opened = reduce(MainMocks.desktopLoaded, userDidTapAddProject())
    const typed = reduce(
      opened,
      userDidEditDraftProjectTitle({ title: 'Garden' }),
    )
    expect(typed.draftProjectTitle).toBe('Garden')
  })

  it('closes and forgets on escape', () => {
    const next = reduce(
      MainMocks.desktopAddingProject,
      userDidCancelAddProject(),
    )
    expect(next.isAddingProject).toBe(false)
    expect(next.draftProjectTitle).toBe('')
  })
})

describe('the shell one-shot', () => {
  it('clears once the destination has read it', () => {
    const withContext = {
      ...MainMocks.desktopLoaded,
      routeContext: {
        destination: { kind: DestinationKind.plan },
        endeavorId: 'e-1',
        day: null,
        scrollTarget: null,
        highlight: false,
        listMode: false,
      },
    } as const

    expect(
      reduce(withContext, onShellRouteContextConsumed()).routeContext,
    ).toBeNull()
  })
})

describe('loadShellThunk lifecycle (RC-54)', () => {
  it('installs the shipping gates a user actually sees', async () => {
    const store = makeStore(stubbedThunkExtra)
    await store.dispatch(loadShellThunk())

    const { gates, load } = store.getState().main
    expect(load.kind).toBe('loaded')
    expect(gates.tasks).toBe(true)
    expect(gates.day).toBe(true)
    // The four `statusQuoSet` leaves unassigned or disabled.
    expect(gates.matrix).toBe(false)
    expect(gates.board).toBe(false)
    expect(gates.blueprints).toBe(false)
    expect(gates.habits).toBe(false)
  })

  it('surfaces a typed exception when the Lists read fails', async () => {
    const failing = makeInMemoryLocalStore()
    const store = makeStore({
      ...stubbedThunkExtra,
      localStore: {
        ...failing,
        projects: {
          ...failing.projects,
          all: () => Promise.reject(new Error('database is closing')),
        },
      },
    })

    await store.dispatch(loadShellThunk())

    const { load } = store.getState().main
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') {
      expect(load.exception.kind).toBe('listsLoadFailed')
      expect(load.exception.recoverable).toBe(true)
    }
  })

  it('never touches the store while the Lists flag is closed', async () => {
    let reads = 0
    const inner = makeInMemoryLocalStore()
    const store = makeStore({
      ...stubbedThunkExtra,
      // `allEnabled` minus `lists` is not expressible through the baseline, so
      // the override list — which wins, being appended last — does it.
      featureFlags: makeHardcodedFeatureFlagService({
        overrides: [disabledAssignment(FeatureFlags.lists)],
      }),
      localStore: {
        ...inner,
        projects: {
          ...inner.projects,
          all: () => {
            reads += 1
            return inner.projects.all()
          },
        },
      },
    })

    await store.dispatch(loadShellThunk())

    expect(reads).toBe(0)
    expect(store.getState().main.gates.lists).toBe(false)
    expect(store.getState().main.load.kind).toBe('loaded')
  })
})
