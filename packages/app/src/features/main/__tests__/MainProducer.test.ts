/**
 * The Producers, driven through the real thunks against stubbed Services
 * injected via `extra` (`RC-54`, `RC-35`). No mocked `fetch`, no live store,
 * no router.
 */
import { makeProject, projectRecordFromProject } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { makeStore, stubbedThunkExtra } from '../../../library/store'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import { makeRecordingNavigationService } from '../../../services/navigation/NavigationService'
import {
  createProjectThunk,
  deleteProjectThunk,
  deliverCaptureRouteThunk,
  loadShellThunk,
  navigateToDestinationThunk,
} from '../MainProducer'
import { DestinationKind } from '../SidebarDestination'

const now = new Date('2026-08-31T09:00:00.000Z')

/** A thunk resolves a `Result`; this narrows the action's payload to read it. */
const navigationFailed = (action: { payload?: unknown }): boolean => {
  const payload = action.payload as { ok: boolean } | undefined
  return payload?.ok === false
}

const storeWithProjects = (titles: readonly string[]) => {
  const localStore = makeInMemoryLocalStore()
  return {
    localStore,
    seed: async () => {
      for (const [index, title] of titles.entries()) {
        await localStore.projects.put(
          projectRecordFromProject(
            makeProject({ id: `p-${index + 1}`, title }),
            { now },
          ),
        )
      }
    },
  }
}

describe('loadShellThunk', () => {
  it('reads the Lists rows the store already holds', async () => {
    const { localStore, seed } = storeWithProjects(['Home', 'Work'])
    await seed()
    const store = makeStore({ ...stubbedThunkExtra, localStore })

    await store.dispatch(loadShellThunk())

    expect(
      store.getState().main.projects.map((project) => project.title),
    ).toEqual(['Home', 'Work'])
  })

  it('resolves the gates even when there are no projects at all', async () => {
    const store = makeStore(stubbedThunkExtra)
    await store.dispatch(loadShellThunk())

    expect(store.getState().main.projects).toEqual([])
    expect(store.getState().main.gates.tasks).toBe(true)
  })

  it('never throws out of the payload creator when the store is broken', async () => {
    const inner = makeInMemoryLocalStore()
    const store = makeStore({
      ...stubbedThunkExtra,
      localStore: {
        ...inner,
        projects: {
          ...inner.projects,
          all: () => Promise.reject(new TypeError('closed')),
        },
      },
    })

    const action = await store.dispatch(loadShellThunk())
    expect(action.type).toContain('fulfilled')
    expect(store.getState().main.load.kind).toBe('failed')
  })
})

describe('createProjectThunk', () => {
  it('writes the project and hands back the whole new row set', async () => {
    const { localStore } = storeWithProjects([])
    const store = makeStore({ ...stubbedThunkExtra, localStore })

    await store.dispatch(
      createProjectThunk({ id: 'p-1', title: 'Garden', now }),
    )

    expect(
      store.getState().main.projects.map((project) => project.title),
    ).toEqual(['Garden'])
  })

  it('trims the name before saving, so " Garden " is not a new project name', async () => {
    const { localStore } = storeWithProjects([])
    const store = makeStore({ ...stubbedThunkExtra, localStore })

    await store.dispatch(
      createProjectThunk({ id: 'p-1', title: '  Garden  ', now }),
    )

    expect(store.getState().main.projects[0]?.title).toBe('Garden')
  })

  it('refuses a name that is blank once trimmed, without touching the store', async () => {
    const { localStore } = storeWithProjects([])
    const store = makeStore({ ...stubbedThunkExtra, localStore })

    await store.dispatch(createProjectThunk({ id: 'p-1', title: '   ', now }))

    const { load } = store.getState().main
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') {
      expect(load.exception.kind).toBe('projectTitleEmpty')
    }
    expect(await localStore.projects.all()).toEqual([])
  })

  it('surfaces a typed exception when the write fails', async () => {
    const inner = makeInMemoryLocalStore()
    const store = makeStore({
      ...stubbedThunkExtra,
      localStore: {
        ...inner,
        projects: {
          ...inner.projects,
          put: () => Promise.reject(new Error('quota')),
        },
      },
    })

    await store.dispatch(createProjectThunk({ id: 'p-1', title: 'Garden', now }))

    const { load } = store.getState().main
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') {
      expect(load.exception.kind).toBe('projectCreateFailed')
    }
  })
})

describe('deleteProjectThunk', () => {
  it('removes the row from what the sidebar renders', async () => {
    const { localStore, seed } = storeWithProjects(['Home', 'Work'])
    await seed()
    const store = makeStore({ ...stubbedThunkExtra, localStore })
    await store.dispatch(loadShellThunk())

    await store.dispatch(deleteProjectThunk({ id: 'p-1', now }))

    expect(
      store.getState().main.projects.map((project) => project.title),
    ).toEqual(['Work'])
  })

  it('soft-deletes, leaving a tombstone the sync engine can still push', async () => {
    const { localStore, seed } = storeWithProjects(['Home'])
    await seed()
    const store = makeStore({ ...stubbedThunkExtra, localStore })

    await store.dispatch(deleteProjectThunk({ id: 'p-1', now }))

    expect(await localStore.projects.all()).toEqual([])
    const withRemoved = await localStore.projects.allIncludingRemoved()
    expect(withRemoved).toHaveLength(1)
    expect(withRemoved[0]?.deletedAtEpochMillis).not.toBeNull()
  })

  it('surfaces a typed exception when the delete fails', async () => {
    const inner = makeInMemoryLocalStore()
    const store = makeStore({
      ...stubbedThunkExtra,
      localStore: {
        ...inner,
        projects: {
          ...inner.projects,
          softDelete: () => Promise.reject(new Error('offline')),
        },
      },
    })

    await store.dispatch(deleteProjectThunk({ id: 'p-1', now }))

    const { load } = store.getState().main
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') {
      expect(load.exception.kind).toBe('projectDeleteFailed')
    }
  })
})

describe('navigateToDestinationThunk — the router as a Service (RC-17)', () => {
  it('navigates to the destination\'s own path', async () => {
    const navigation = makeRecordingNavigationService()
    const store = makeStore({ ...stubbedThunkExtra, navigation })

    await store.dispatch(
      navigateToDestinationThunk({
        destination: { kind: DestinationKind.inbox },
      }),
    )

    expect(navigation.calls).toEqual([{ kind: 'navigate', path: '/inbox' }])
  })

  it('builds a list path from the project id', async () => {
    const navigation = makeRecordingNavigationService()
    const store = makeStore({ ...stubbedThunkExtra, navigation })

    await store.dispatch(
      navigateToDestinationThunk({
        destination: {
          kind: DestinationKind.list,
          listId: 'p-2',
          listTitle: 'Work',
        },
      }),
    )

    expect(navigation.calls[0]?.path).toBe('/lists/p-2')
  })

  it('never throws when the router is missing — it resolves a Result', async () => {
    const store = makeStore({
      ...stubbedThunkExtra,
      navigation: {
        navigate: () => {
          throw new Error('no router')
        },
        replace: () => {},
        back: () => {},
      },
    })

    const action = await store.dispatch(
      navigateToDestinationThunk({
        destination: { kind: DestinationKind.earn },
      }),
    )

    expect(action.type).toContain('fulfilled')
    expect(navigationFailed(action)).toBe(true)
  })
})

describe('deliverCaptureRouteThunk — the capture one-shot', () => {
  const pending = {
    context: {
      destination: { kind: DestinationKind.plan },
      endeavorId: 'e-1',
      day: new Date('2026-08-31T00:00:00.000Z'),
      scrollTarget: new Date('2026-08-31T09:30:00.000Z'),
      highlight: true,
      listMode: true,
      autoNavigates: true,
    },
    deliverAtMs: now.getTime() + 500,
  } as const

  /** The branch the capture rules say never auto-navigates. */
  const pendingInbox = {
    context: {
      destination: { kind: DestinationKind.inbox },
      endeavorId: 'e-2',
      day: null,
      scrollTarget: null,
      highlight: false,
      listMode: false,
      autoNavigates: false,
    },
    deliverAtMs: now.getTime() + 500,
  } as const

  it('waits: a tick before the deadline navigates nowhere', async () => {
    const navigation = makeRecordingNavigationService()
    const store = makeStore({ ...stubbedThunkExtra, navigation })

    await store.dispatch(deliverCaptureRouteThunk({ pending, now }))

    expect(navigation.calls).toEqual([])
    expect(store.getState().main.routeContext).toBeNull()
  })

  it('navigates to Plan once the deadline has passed, carrying the payload', async () => {
    const navigation = makeRecordingNavigationService()
    const store = makeStore({ ...stubbedThunkExtra, navigation })

    await store.dispatch(
      deliverCaptureRouteThunk({
        pending,
        now: new Date(pending.deliverAtMs),
      }),
    )

    expect(navigation.calls).toEqual([{ kind: 'navigate', path: '/plan' }])

    const context = store.getState().main.routeContext
    expect(context).toMatchObject({ endeavorId: 'e-1', highlight: true, listMode: true })
    expect(store.getState().main.selected.kind).toBe(DestinationKind.plan)
  })

  it('does nothing at all when there is no intent', async () => {
    const navigation = makeRecordingNavigationService()
    const store = makeStore({ ...stubbedThunkExtra, navigation })

    await store.dispatch(deliverCaptureRouteThunk({ pending: null, now }))

    expect(navigation.calls).toEqual([])
  })

  it('DELIVERS an Inbox route without navigating anywhere', async () => {
    // THE REGRESSION. `CaptureRules`: "everything else opens the Inbox and
    // never auto-navigates". The one-shot must still be consumed — that is
    // what opens the Inbox with its Just Created row — but the router is not
    // called and the user stays on the surface they captured from.
    const navigation = makeRecordingNavigationService()
    const store = makeStore({ ...stubbedThunkExtra, navigation })
    const before = store.getState().main.selected

    await store.dispatch(
      deliverCaptureRouteThunk({
        pending: pendingInbox,
        now: new Date(pendingInbox.deliverAtMs),
      }),
    )

    expect(navigation.calls).toEqual([])
    expect(store.getState().main.routeContext).toMatchObject({ endeavorId: 'e-2' })
    expect(store.getState().main.selected).toEqual(before)
  })
})
