/**
 * All Tasks' render tests, mirroring `TasksFragment.stories.tsx` (`RC-11`).
 *
 * The display limit and its three group states are the behaviour worth
 * asserting here: seven rows and a "Show more…", then one group in full with
 * its siblings collapsed, and the affordance changing wording with the state.
 */
import { EndeavorGroupingCriteria } from '@kro/core'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installPointerEvents } from '../../../design/endeavor/__tests__/pointerEnvironment'
import { allFindEndeavorMocks, nineOpenTasks } from '../FindMocks'
import { TasksFragment, type TasksFragmentProps } from './TasksFragment'
import { adaptedGroups, tasksCapabilitiesWith } from './__tests__/pagesHarness'

const NOW = new Date(2026, 5, 18, 9, 40)
const capabilities = tasksCapabilitiesWith()

let pointerEnvironment: () => void

beforeEach(() => {
  pointerEnvironment = installPointerEvents()
})

afterEach(() => {
  cleanup()
  pointerEnvironment()
})

const props = (
  overrides: Partial<TasksFragmentProps> = {},
): TasksFragmentProps => ({
  heading: 'Tasks',
  subtitle: '',
  query: '',
  grouping: EndeavorGroupingCriteria.status,
  groups: adaptedGroups(nineOpenTasks, capabilities),
  expandedGroupKey: null,
  capabilities,
  emptyState: null,
  isLoading: false,
  exception: null,
  now: NOW,
  locale: 'en-US',
  input: 'touch',
  onChangeQuery: () => {},
  onSelectGrouping: () => {},
  onExpandGroup: () => {},
  onCollapseGroups: () => {},
  onOperation: () => {},
  onSelectEndeavor: () => {},
  onRetry: () => {},
  ...overrides,
})

describe('the grouped list', () => {
  it('shows seven rows of a nine-row group and offers the rest', () => {
    render(<TasksFragment {...props()} />)

    const group = screen.getByTestId('tasks-group')
    expect(within(group).getAllByTestId('tasks-row-open')).toHaveLength(7)
    expect(
      within(group).getByRole('button', { name: 'Show more…' }),
    ).toBeTruthy()
  })

  it("states the group's TOTAL count in its header, not the clipped one", () => {
    render(<TasksFragment {...props()} />)

    expect(screen.getByRole('heading', { name: 'Pending (9)' })).toBeTruthy()
  })

  it('lists every row and states the count once a group is expanded', () => {
    render(
      <TasksFragment
        {...props({
          groups: adaptedGroups(nineOpenTasks, capabilities, {
            expandedGroupKey: 'pending',
          }),
          expandedGroupKey: 'pending',
        })}
      />,
    )

    const group = screen.getByTestId('tasks-group')
    expect(within(group).getAllByTestId('tasks-row-open')).toHaveLength(9)
    expect(within(group).getByText('9 tasks listed')).toBeTruthy()
  })

  it('collapses the siblings of the expanded group, as canon does', () => {
    render(
      <TasksFragment
        {...props({
          groups: adaptedGroups(allFindEndeavorMocks, capabilities, {
            expandedGroupKey: 'pending',
          }),
          expandedGroupKey: 'pending',
        })}
      />,
    )

    const collapsed = screen
      .getAllByTestId('tasks-group')
      .filter((group) => group.dataset.groupState === 'collapsed')
    expect(collapsed.length).toBeGreaterThan(0)
    for (const group of collapsed) {
      expect(within(group).queryAllByTestId('tasks-row-open')).toHaveLength(0)
    }
  })
})

describe('the group affordance says what it will do', () => {
  it('offers "Show All" while every group is clipped', async () => {
    const onExpandGroup = vi.fn()
    render(<TasksFragment {...props({ onExpandGroup })} />)

    await userEvent.click(screen.getByRole('button', { name: 'Show All' }))

    expect(onExpandGroup).toHaveBeenCalledWith('pending')
  })

  it('offers "Collapse" on the group that is open', async () => {
    const onCollapseGroups = vi.fn()
    render(
      <TasksFragment
        {...props({
          groups: adaptedGroups(nineOpenTasks, capabilities, {
            expandedGroupKey: 'pending',
          }),
          expandedGroupKey: 'pending',
          onCollapseGroups,
        })}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Collapse' }))

    expect(onCollapseGroups).toHaveBeenCalledTimes(1)
  })

  it('offers "Show" on a sibling the expansion collapsed', () => {
    render(
      <TasksFragment
        {...props({
          groups: adaptedGroups(allFindEndeavorMocks, capabilities, {
            expandedGroupKey: 'pending',
          }),
          expandedGroupKey: 'pending',
        })}
      />,
    )

    expect(
      screen.getAllByRole('button', { name: 'Show' }).length,
    ).toBeGreaterThan(0)
  })
})

describe('the grouping control', () => {
  it('states the four criteria as one exclusive choice', () => {
    render(<TasksFragment {...props()} />)

    const control = screen.getByRole('radiogroup', { name: 'Group by' })
    expect(within(control).getAllByRole('radio')).toHaveLength(4)
    expect(
      within(control)
        .getByRole('radio', { name: 'Status' })
        .getAttribute('aria-checked'),
    ).toBe('true')
  })

  it('reports the criterion the user picked', async () => {
    const onSelectGrouping = vi.fn()
    render(<TasksFragment {...props({ onSelectGrouping })} />)

    await userEvent.click(screen.getByRole('radio', { name: 'Kind' }))

    expect(onSelectGrouping).toHaveBeenCalledWith(EndeavorGroupingCriteria.kind)
  })
})

describe('rows', () => {
  it("opens Detail from a row's own named control — not by wrapping the row", async () => {
    const onSelectEndeavor = vi.fn()
    render(<TasksFragment {...props({ onSelectEndeavor })} />)

    await userEvent.click(
      screen.getAllByTestId('tasks-row-open')[0] as HTMLElement,
    )

    expect(onSelectEndeavor).toHaveBeenCalledWith(nineOpenTasks[0]?.id)
  })

  it('keeps that control OUTSIDE the action surface, so neither grammar eats it', () => {
    render(<TasksFragment {...props({ input: 'pointer' })} />)

    for (const open of screen.getAllByTestId('tasks-row-open')) {
      // The kit's hover strip is an overlay on the row's trailing edge, and its
      // touch counterpart takes a pointer capture; a control inside the surface
      // would be unclickable under either.
      expect(open.closest('[data-slot="endeavor-action-surface"]')).toBeNull()
    }
  })

  it("still carries the vista's row operations beside that control", () => {
    render(<TasksFragment {...props({ input: 'pointer' })} />)

    expect(screen.getAllByRole('button', { name: 'Complete' }).length).toBe(7)
  })

  it('names the heading and, on a list destination, its subtitle', () => {
    render(
      <TasksFragment {...props({ heading: 'Household', subtitle: 'List' })} />,
    )

    expect(screen.getByRole('heading', { name: 'Household' })).toBeTruthy()
    expect(screen.getByText('List')).toBeTruthy()
  })
})

describe('empty and failed states', () => {
  it("shows canon's first-run message when nothing is stored", () => {
    render(
      <TasksFragment
        {...props({ groups: [], emptyState: { kind: 'noData' } })}
      />,
    )

    expect(screen.getByText('No Endeavors Yet')).toBeTruthy()
  })

  it('surfaces a recoverable failure with its retry', async () => {
    const onRetry = vi.fn()
    render(
      <TasksFragment
        {...props({
          exception: {
            kind: 'fetchFailed',
            message: "Couldn't load your endeavors: offline",
            recoverable: true,
          },
          onRetry,
        })}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('reports every keystroke of its own search field', async () => {
    const onChangeQuery = vi.fn()
    render(<TasksFragment {...props({ onChangeQuery })} />)

    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Search tasks' }),
      'a',
    )

    expect(onChangeQuery).toHaveBeenCalledWith('a')
  })
})
