/**
 * Find's container, against a real store built with `makeStore(stubbedThunkExtra)`
 * over a seeded in-memory database (`RC-22`, `RC-35`) — never a hand-assembled
 * second store, never the live services.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { userDidChangeSearchQuery } from '../../main/MainFeature'
import { allFindEndeavorMocks, findEndeavorMocks } from '../FindMocks'
import { FindPage } from './FindPage'
import {
  Harness,
  detailEnabledFlags,
  makeSeededStore,
} from './__tests__/pagesHarness'

afterEach(cleanup)

const mount = (
  store = makeSeededStore({ endeavors: allFindEndeavorMocks }),
) => {
  render(
    <Harness store={store}>
      <FindPage input="touch" locale="en-US" />
    </Harness>,
  )
  return store
}

describe('mount', () => {
  it('fetches through the real Producer and lists what the database held', async () => {
    mount()

    await waitFor(() => {
      expect(screen.getByText('Prepare quarterly slides')).toBeTruthy()
    })
    expect(screen.getByText('Team sync')).toBeTruthy()
  })

  it('installs the surface with the resolved capability flags, not a guess', async () => {
    const store = mount(
      makeSeededStore({
        endeavors: allFindEndeavorMocks,
        featureFlags: detailEnabledFlags,
      }),
    )

    await waitFor(() => {
      expect(store.getState().find.find.enabledFlags).toEqual(['endeavorDetail'])
    })
  })

  it('leaves the dark-launched tap unresolved on the shipping baseline', async () => {
    const store = mount()

    await waitFor(() => {
      expect(store.getState().find.find.load.kind).toBe('loaded')
    })
    expect(store.getState().find.find.enabledFlags).toEqual([])
  })

  it('tells the shell which destination the URL landed on', async () => {
    const store = mount()

    await waitFor(() => {
      expect(store.getState().main.selected.kind).toBe('search')
    })
  })
})

describe('the sidebar\'s query seeds this surface', () => {
  it('narrows the lens to what the shell\'s field was submitted with', async () => {
    const store = makeSeededStore({ endeavors: allFindEndeavorMocks })
    store.dispatch(userDidChangeSearchQuery({ query: 'slides' }))

    mount(store)

    await waitFor(() => {
      expect(store.getState().find.find.lens.searchQuery).toBe('slides')
    })
    expect(screen.getByText('Prepare quarterly slides')).toBeTruthy()
    expect(screen.queryByText('Team sync')).toBeNull()
  })
})

describe('filters and search write the lens', () => {
  it('hides a kind when its chip is pressed, and the row goes with it', async () => {
    const store = mount()
    await waitFor(() => {
      expect(screen.getByText('Team sync')).toBeTruthy()
    })

    await userEvent.click(
      screen.getByRole('button', { name: /Event/, pressed: true }),
    )

    await waitFor(() => {
      expect(screen.queryByText('Team sync')).toBeNull()
    })
    expect(store.getState().find.find.lens.hiddenKinds).toContain(
      'calendarEvent',
    )
  })

  it('reveals the archived row only once Show Archived is on', async () => {
    const store = mount()
    await waitFor(() => {
      expect(screen.getByText('Prepare quarterly slides')).toBeTruthy()
    })
    expect(screen.queryByText('Renew the domain')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: /Archived/ }))

    await waitFor(() => {
      expect(screen.getByText('Renew the domain')).toBeTruthy()
    })
    expect(store.getState().find.find.lens.showArchived).toBe(true)
  })
})

describe('Detail is reachable from a Find row', () => {
  it('parks a viewDetail request the global overlay can serve', async () => {
    const store = mount(
      makeSeededStore({ endeavors: [findEndeavorMocks.teamSync] }),
    )
    await waitFor(() => {
      expect(screen.getByTestId('find-row-open')).toBeTruthy()
    })

    await userEvent.click(screen.getByTestId('find-row-open'))

    await waitFor(() => {
      expect(store.getState().find.intents).toEqual([
        {
          id: 1,
          operation: 'viewDetail',
          endeavorId: findEndeavorMocks.teamSync.id,
          surface: 'find',
        },
      ])
    })
  })
})

describe('the bulk operations act on exactly the visible rows', () => {
  it('deletes every visible endeavor and empties the surface', async () => {
    const store = mount(
      makeSeededStore({
        endeavors: [findEndeavorMocks.morningTask, findEndeavorMocks.teamSync],
      }),
    )
    await waitFor(() => {
      expect(screen.getByText('Team sync')).toBeTruthy()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Endeavor actions' }))
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Delete all visible (2)' }),
    )

    await waitFor(() => {
      expect(store.getState().find.find.endeavors).toHaveLength(0)
    })
    expect(screen.getByText('No Endeavors Yet')).toBeTruthy()
  })

  it('archives the visible rows, which closes them rather than removing them', async () => {
    const store = mount(
      makeSeededStore({ endeavors: [findEndeavorMocks.morningTask] }),
    )
    await waitFor(() => {
      expect(screen.getByText('Prepare quarterly slides')).toBeTruthy()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Endeavor actions' }))
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Archive all visible (1)' }),
    )

    await waitFor(() => {
      expect(store.getState().find.find.endeavors[0]?.status).toBe('closed')
    })
  })

  it('applies a bulk delete only to what the filters left visible', async () => {
    const store = mount()
    await waitFor(() => {
      expect(screen.getByText('Team sync')).toBeTruthy()
    })

    await userEvent.click(
      screen.getByRole('button', { name: /Event/, pressed: true }),
    )
    await waitFor(() => {
      expect(screen.queryByText('Team sync')).toBeNull()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Endeavor actions' }))
    await userEvent.click(
      screen.getByRole('menuitem', { name: /^Delete all visible/ }),
    )

    await waitFor(() => {
      expect(
        store
          .getState()
          .find.find.endeavors.map((endeavor) => endeavor.id),
      ).toContain(findEndeavorMocks.teamSync.id)
    })
  })
})
