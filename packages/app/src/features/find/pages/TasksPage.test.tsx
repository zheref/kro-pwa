/**
 * All Tasks' container, against a real store over a seeded database
 * (`RC-22`, `RC-35`).
 *
 * The behaviour worth proving here is the one the three destinations share: the
 * SELECTION decides which vista is installed, and re-declaring it reseeds the
 * lens rather than carrying the previous list's grouping onto the next one's
 * rows.
 */
import {
  EndeavorGroupingCriteria,
  EndeavorsVistas,
  makeEndeavorsLensSnapshot,
  makeProject,
} from '@kro/core'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { loadShellThunk } from '../../main/MainProducer'
import {
  allFindEndeavorMocks,
  findEndeavorMocks,
  nineOpenTasks,
} from '../FindMocks'
import { type TasksVistaSelection, initialTasksLens } from '../FindState'
import { TasksPage } from './TasksPage'
import { Harness, makeSeededStore } from './__tests__/pagesHarness'

afterEach(cleanup)

const mount = (
  selection: TasksVistaSelection = { kind: 'default' },
  store = makeSeededStore({ endeavors: nineOpenTasks }),
) => {
  const view = render(
    <Harness store={store}>
      <TasksPage selection={selection} input="touch" locale="en-US" />
    </Harness>,
  )
  return { store, view }
}

describe('mount', () => {
  it('fetches through the real Producer and groups what the database held', async () => {
    mount()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Pending (9)' })).toBeTruthy()
    })
    expect(screen.getAllByTestId('tasks-row-open')).toHaveLength(7)
  })

  it('installs the vista the selection names', async () => {
    const { store } = mount({
      kind: 'list',
      listId: 'proj-1',
      listTitle: 'Household',
    })

    await waitFor(() => {
      expect(store.getState().find.tasksSelection).toEqual({
        kind: 'list',
        listId: 'proj-1',
        listTitle: 'Household',
      })
    })
  })

  it("heads a list destination with the list's own title", async () => {
    mount(
      { kind: 'list', listId: 'proj-1', listTitle: 'Household' },
      makeSeededStore({ endeavors: allFindEndeavorMocks }),
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Household' })).toBeTruthy()
    })
  })

  it("looks the title up from the shell's Lists when the route carries only an id", async () => {
    const store = makeSeededStore({
      endeavors: allFindEndeavorMocks,
      projects: [makeProject({ id: 'proj-1', title: 'Household' })],
    })
    await store.dispatch(loadShellThunk())

    mount({ kind: 'list', listId: 'proj-1', listTitle: null }, store)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Household' })).toBeTruthy()
    })
  })

  it("falls back to the generic heading rather than guessing an unknown list's name", async () => {
    mount(
      { kind: 'list', listId: 'never-loaded', listTitle: null },
      makeSeededStore({ endeavors: allFindEndeavorMocks }),
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Tasks' })).toBeTruthy()
    })
  })

  it('tells the shell which destination the URL landed on', async () => {
    const { store } = mount()

    await waitFor(() => {
      expect(store.getState().main.selected.kind).toBe('allTasks')
    })
  })

  it('selects the Lists destination when the route carries a list id', async () => {
    const { store } = mount({
      kind: 'list',
      listId: 'proj-2',
      listTitle: 'Work',
    })

    await waitFor(() => {
      expect(store.getState().main.selected).toMatchObject({
        kind: 'list',
        listId: 'proj-2',
      })
    })
  })
})

describe('the saved lens survives the mount that reads it', () => {
  it("restores the list's own saved grouping rather than the vista default", async () => {
    const store = makeSeededStore({
      endeavors: nineOpenTasks,
      lensSnapshots: {
        [EndeavorsVistas.tasksDefault.id]: makeEndeavorsLensSnapshot({
          ...initialTasksLens,
          grouping: EndeavorGroupingCriteria.dueSection,
        }),
      },
    })

    mount({ kind: 'default' }, store)

    await waitFor(() => {
      expect(store.getState().find.tasks.lens.grouping).toBe(
        EndeavorGroupingCriteria.dueSection,
      )
    })
    expect(store.getState().find.tasks.isLensRestored).toBe(true)
  })
})

describe('the grouping control writes the lens', () => {
  it('regroups the list by the criterion the user picked', async () => {
    const { store } = mount(
      { kind: 'default' },
      makeSeededStore({ endeavors: allFindEndeavorMocks }),
    )
    await waitFor(() => {
      expect(screen.getByRole('radiogroup', { name: 'Group by' })).toBeTruthy()
    })

    await userEvent.click(screen.getByRole('radio', { name: 'Kind' }))

    await waitFor(() => {
      expect(store.getState().find.tasks.lens.grouping).toBe(
        EndeavorGroupingCriteria.kind,
      )
    })
  })
})

describe('the display limit', () => {
  it('lifts the limit for the group the user expanded', async () => {
    const { store } = mount()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Show All' })).toBeTruthy()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Show All' }))

    await waitFor(() => {
      expect(store.getState().find.tasks.expandedGroupKey).toBe('pending')
    })
    expect(screen.getAllByTestId('tasks-row-open')).toHaveLength(9)
  })
})

describe('selecting a row raises the Detail intent', () => {
  it('parks a viewDetail request the global overlay can serve', async () => {
    const { store } = mount(
      { kind: 'default' },
      makeSeededStore({ endeavors: [findEndeavorMocks.morningTask] }),
    )
    await waitFor(() => {
      expect(screen.getByTestId('tasks-row-open')).toBeTruthy()
    })

    await userEvent.click(screen.getByTestId('tasks-row-open'))

    await waitFor(() => {
      expect(store.getState().find.intents).toEqual([
        {
          id: 1,
          operation: 'viewDetail',
          endeavorId: findEndeavorMocks.morningTask.id,
          surface: 'tasks',
        },
      ])
    })
  })
})
