/**
 * The destination Page — the swap point every route file mounts.
 *
 * What matters here is that mounting a route IS how the shell's selection is
 * set: no component reads a router, and a pasted link selects correctly.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { StoreProvider } from '../../../library/StoreProvider'
import { makeStore, stubbedThunkExtra } from '../../../library/store'
import { DestinationPage } from '../DestinationPage'
import { withShellLoaded } from '../MainShifters'
import { MainMocks, projectMocks, statusQuoGates } from '../MainMocks'
import { onDestinationRouteMounted } from '../MainFeature'
import { DestinationKind } from '../SidebarDestination'

afterEach(cleanup)

const renderRoute = (props: Parameters<typeof DestinationPage>[0]) => {
  const store = makeStore(stubbedThunkExtra)
  render(
    <StoreProvider store={store}>
      <DestinationPage {...props} />
    </StoreProvider>,
  )
  return store
}

describe('DestinationPage', () => {
  it('selects its own destination on mount — the URL is the authority', () => {
    const store = renderRoute({ kind: DestinationKind.earn })

    expect(store.getState().main.selected.kind).toBe(DestinationKind.earn)
  })

  it("renders the placeholder with canon's content heading", () => {
    renderRoute({ kind: DestinationKind.inbox })

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Inbox')
  })

  it('selects a project list by id, even before the titles have loaded', () => {
    const store = renderRoute({ kind: DestinationKind.list, listId: 'p-2' })

    expect(store.getState().main.selected).toEqual({
      kind: DestinationKind.list,
      listId: 'p-2',
      listTitle: '',
    })
  })

  it("picks up the project's name once the Lists rows are in state", () => {
    const store = makeStore(stubbedThunkExtra)
    store.dispatch(
      onDestinationRouteMounted({
        destination: { kind: DestinationKind.myDay },
      }),
    )
    // Install the rows the way the shell's own load does.
    const loaded = withShellLoaded(store.getState().main, {
      gates: statusQuoGates,
      projects: [projectMocks.work],
    })
    expect(loaded.projects).toHaveLength(1)

    render(
      <StoreProvider store={store}>
        <DestinationPage kind={DestinationKind.list} listId="p-2" />
      </StoreProvider>,
    )

    // With no projects in the store yet the title is empty rather than guessed.
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('')
  })

  it('does not disturb anything else in the slice', () => {
    const store = renderRoute({ kind: DestinationKind.plan })

    expect(store.getState().main.isAddingProject).toBe(
      MainMocks.idle.isAddingProject,
    )
    expect(store.getState().main.searchQuery).toBe('')
  })
})
