/**
 * The Shifters — pure, no store, no dispatch (`RC-56`).
 *
 * The one that carries acceptance criterion 2 is `withSurfaceChanged`: its
 * whole job is to be unable to touch the selection.
 */
import { describe, expect, it } from 'vitest'
import {
  desktopSurface,
  handheldSurface,
  MainMocks,
  projectMocks,
  statusQuoGates,
} from '../MainMocks'
import { MainExceptions } from '../MainException'
import { DestinationKind } from '../SidebarDestination'
import {
  withCaptureRouteConsumed,
  withDestinationSelected,
  withDraftProjectCancelled,
  withDraftProjectStarted,
  withDraftProjectTitleEdited,
  withException,
  withLoadingStarted,
  withProjectDeleted,
  withProjectsInstalled,
  withSearchQueryChanged,
  withShellLoaded,
  withSurfaceChanged,
} from '../MainShifters'

describe('withSurfaceChanged', () => {
  it('keeps the selection when a desktop window narrows into a phone shape', () => {
    const onPlan = MainMocks.desktopOnPlan
    const next = withSurfaceChanged(onPlan, handheldSurface)

    expect(next.surface).toEqual(handheldSurface)
    expect(next.selected).toEqual(onPlan.selected)
  })

  it('keeps the selection on the way back out to a sidebar shape', () => {
    const narrow = withSurfaceChanged(MainMocks.desktopOnPlan, handheldSurface)
    const wide = withSurfaceChanged(narrow, desktopSurface)

    expect(wide.selected.kind).toBe(DestinationKind.plan)
  })

  it('touches nothing else at all — no-op on every other field', () => {
    const before = MainMocks.desktopLoaded
    const after = withSurfaceChanged(before, handheldSurface)

    expect({ ...after, surface: before.surface }).toEqual(before)
  })
})

describe('withLoadingStarted / withShellLoaded / withException', () => {
  it('moves an idle shell into loading', () => {
    expect(withLoadingStarted(MainMocks.idle).load).toEqual({
      kind: 'loading',
    })
  })

  it('clears a previous failure when the user retries', () => {
    const retrying = withLoadingStarted(MainMocks.desktopListsFailed)
    expect(retrying.load.kind).toBe('loading')
  })

  it('installs the gates and the Lists rows together', () => {
    const next = withShellLoaded(MainMocks.idle, {
      gates: statusQuoGates,
      projects: [projectMocks.inbox],
    })

    expect(next.load).toEqual({ kind: 'loaded' })
    expect(next.gates).toEqual(statusQuoGates)
    expect(next.projects).toEqual([projectMocks.inbox])
  })

  it('parks a typed failure in the one lifecycle field', () => {
    const exception = MainExceptions.listsLoadFailed('closed')
    expect(withException(MainMocks.desktopLoaded, exception).load).toEqual({
      kind: 'failed',
      exception,
    })
  })
})

describe('withDestinationSelected', () => {
  it('records the new selection', () => {
    const next = withDestinationSelected(MainMocks.desktopLoaded, {
      kind: DestinationKind.earn,
    })
    expect(next.selected.kind).toBe(DestinationKind.earn)
  })

  it('drops a half-typed project name rather than carrying it to the next screen', () => {
    const next = withDestinationSelected(MainMocks.desktopAddingProject, {
      kind: DestinationKind.earn,
    })
    expect(next.isAddingProject).toBe(false)
    expect(next.draftProjectTitle).toBe('')
  })

  it('is a no-op on the selection when the same destination is re-picked', () => {
    const next = withDestinationSelected(
      MainMocks.desktopLoaded,
      MainMocks.desktopLoaded.selected,
    )
    expect(next.selected).toEqual(MainMocks.desktopLoaded.selected)
  })
})

describe('the inline "New project…" row', () => {
  it('opens empty even if something was typed and cancelled before', () => {
    const started = withDraftProjectStarted(MainMocks.desktopAddingProject)
    expect(started.isAddingProject).toBe(true)
    expect(started.draftProjectTitle).toBe('')
  })

  it('records what is typed', () => {
    expect(
      withDraftProjectTitleEdited(MainMocks.desktopAddingProject, 'Errands')
        .draftProjectTitle,
    ).toBe('Errands')
  })

  it('closes and forgets on cancel', () => {
    const next = withDraftProjectCancelled(MainMocks.desktopAddingProject)
    expect(next.isAddingProject).toBe(false)
    expect(next.draftProjectTitle).toBe('')
  })
})

describe('withProjectsInstalled', () => {
  it('closes the inline row once the project it stood in for exists', () => {
    const next = withProjectsInstalled(MainMocks.desktopAddingProject, [
      projectMocks.inbox,
    ])
    expect(next.projects).toEqual([projectMocks.inbox])
    expect(next.isAddingProject).toBe(false)
  })

  it('clears a previous failure — the write just succeeded', () => {
    expect(
      withProjectsInstalled(MainMocks.desktopListsFailed, []).load,
    ).toEqual({ kind: 'loaded' })
  })
})

describe('withProjectDeleted', () => {
  it('keeps an unrelated selection where it is', () => {
    const next = withProjectDeleted(MainMocks.desktopOnPlan, [])
    expect(next.selected.kind).toBe(DestinationKind.plan)
  })

  it('falls back to My Day when the deleted list was the selection', () => {
    const onList = {
      ...MainMocks.desktopLoaded,
      selected: {
        kind: DestinationKind.list,
        listId: projectMocks.work.id,
        listTitle: projectMocks.work.title,
      },
    } as const

    const next = withProjectDeleted(onList, [projectMocks.inbox])
    expect(next.selected.kind).toBe(DestinationKind.myDay)
  })

  it('leaves a still-present list selected', () => {
    const onList = {
      ...MainMocks.desktopLoaded,
      selected: {
        kind: DestinationKind.list,
        listId: projectMocks.inbox.id,
        listTitle: projectMocks.inbox.title,
      },
    } as const

    const next = withProjectDeleted(onList, [projectMocks.inbox])
    expect(next.selected.kind).toBe(DestinationKind.list)
  })
})

describe('withSearchQueryChanged / withCaptureRouteConsumed', () => {
  it('records what is being searched for', () => {
    expect(
      withSearchQueryChanged(MainMocks.desktopLoaded, 'groceries')
        .searchQuery,
    ).toBe('groceries')
  })

  it('selects the destination a capture routed to and parks its payload', () => {
    const context = {
      destination: { kind: DestinationKind.plan },
      endeavorId: 'e-1',
      day: new Date('2026-08-31T00:00:00Z'),
      scrollTarget: new Date('2026-08-31T09:30:00Z'),
      highlight: true,
      listMode: true,
    } as const

    const next = withCaptureRouteConsumed(MainMocks.desktopLoaded, context)
    expect(next.selected.kind).toBe(DestinationKind.plan)
    expect(next.routeContext).toEqual(context)
  })
})
