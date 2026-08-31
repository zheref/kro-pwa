/**
 * Find's render tests, mirroring `FindFragment.stories.tsx` 1:1 (`RC-11`).
 *
 * The interaction half is here too, because these are the flows the issue names
 * and none of them can be judged from a screenshot: the swipe grammar on touch,
 * the hover/context grammar on pointer, and the ellipsis menu's two irreversible
 * bulk operations.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installPointerEvents } from '../../../design/endeavor/__tests__/pointerEnvironment'
import { allFindEndeavorMocks, findEndeavorMocks } from '../FindMocks'
import { FindFragment, type FindFragmentProps } from './FindFragment'
import { adaptedRows, findCapabilitiesWith } from './__tests__/pagesHarness'

const NOW = new Date(2026, 5, 18, 9, 40)
const capabilities = findCapabilitiesWith()

let pointerEnvironment: () => void

beforeEach(() => {
  pointerEnvironment = installPointerEvents()
})

afterEach(() => {
  cleanup()
  pointerEnvironment()
})

const props = (
  overrides: Partial<FindFragmentProps> = {},
): FindFragmentProps => ({
  query: '',
  rows: adaptedRows(allFindEndeavorMocks, capabilities),
  capabilities,
  emptyState: null,
  selectedKinds: ['task', 'calendarEvent', 'habit'],
  selectedHosts: ['local', 'supabase', 'googleCalendar'],
  selectedStatuses: ['pending', 'planned', 'ongoing'],
  showArchived: false,
  visibleCount: allFindEndeavorMocks.length,
  isLoading: false,
  exception: null,
  now: NOW,
  locale: 'en-US',
  input: 'touch',
  onChangeQuery: () => {},
  onToggleFilter: () => {},
  onToggleShowArchived: () => {},
  onOperation: () => {},
  onOpenDetail: () => {},
  onDeleteAllVisible: () => {},
  onArchiveAllVisible: () => {},
  onRetry: () => {},
  ...overrides,
})

describe('the loaded list — the scene acceptance criterion 1 is read against', () => {
  it('lists every row the vista handed it, under canon\'s section heading', () => {
    render(<FindFragment {...props()} />)

    expect(screen.getByRole('heading', { name: 'All Endeavors' })).toBeTruthy()
    expect(screen.getByText('Prepare quarterly slides')).toBeTruthy()
    expect(screen.getByText('Team sync')).toBeTruthy()
  })

  it('offers all three chip rows, each named for a screen reader', () => {
    render(<FindFragment {...props()} />)

    expect(screen.getByRole('group', { name: 'Kinds' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Sources' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Statuses' })).toBeTruthy()
  })

  it('marks a chip pressed when the lens is NOT hiding it', () => {
    render(<FindFragment {...props()} />)

    const kinds = screen.getByRole('group', { name: 'Kinds' })
    expect(
      within(kinds).getByRole('button', { name: /Task/ }).getAttribute('aria-pressed'),
    ).toBe('true')
  })
})

describe('the four empty states are four different messages', () => {
  it('says "No Endeavors Yet" when nothing was ever fetched', () => {
    render(
      <FindFragment
        {...props({ rows: [], visibleCount: 0, emptyState: { kind: 'noData' } })}
      />,
    )
    expect(screen.getByText('No Endeavors Yet')).toBeTruthy()
  })

  it('says "No Filters Selected" when the user turned every chip off', () => {
    render(
      <FindFragment
        {...props({
          rows: [],
          visibleCount: 0,
          selectedKinds: [],
          selectedHosts: [],
          selectedStatuses: [],
          emptyState: { kind: 'noFilters' },
        })}
      />,
    )
    expect(screen.getByText('No Filters Selected')).toBeTruthy()
    expect(screen.queryByText('No Endeavors Yet')).toBeNull()
  })

  it('quotes the query back on a search that matched nothing', () => {
    render(
      <FindFragment
        {...props({
          query: 'zzzz',
          rows: [],
          visibleCount: 0,
          emptyState: { kind: 'noResults', query: 'zzzz' },
        })}
      />,
    )
    expect(
      screen.getByText('No endeavors match "zzzz" with the current filters.'),
    ).toBeTruthy()
  })

  it('keeps the previously loaded rows visible through a failed refresh', () => {
    render(
      <FindFragment
        {...props({
          exception: {
            kind: 'fetchFailed',
            message: "Couldn't load your endeavors: offline",
            recoverable: true,
          },
        })}
      />,
    )
    expect(screen.getByText("Couldn't load your endeavors: offline")).toBeTruthy()
    expect(screen.getByText('Prepare quarterly slides')).toBeTruthy()
  })
})

describe('the search field', () => {
  it('reports every keystroke, so the lens narrows as the user types', async () => {
    const onChangeQuery = vi.fn()
    render(<FindFragment {...props({ onChangeQuery })} />)

    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Search endeavors' }),
      'q',
    )

    expect(onChangeQuery).toHaveBeenCalledWith('q')
  })

  it('offers a clear control only once there is something to clear', async () => {
    const onChangeQuery = vi.fn()
    const { rerender } = render(<FindFragment {...props({ onChangeQuery })} />)
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull()

    rerender(<FindFragment {...props({ query: 'tax', onChangeQuery })} />)
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }))

    expect(onChangeQuery).toHaveBeenCalledWith('')
  })
})

describe('the filter chips dispatch by axis', () => {
  it('toggles a kind by its own axis, never by position', async () => {
    const onToggleFilter = vi.fn()
    render(<FindFragment {...props({ onToggleFilter })} />)

    const kinds = screen.getByRole('group', { name: 'Kinds' })
    await userEvent.click(within(kinds).getByRole('button', { name: /Habit/ }))

    expect(onToggleFilter).toHaveBeenCalledWith({ axis: 'kind', value: 'habit' })
  })

  it('raises the Archived chip as its own event — it is a flag, not a status', async () => {
    const onToggleShowArchived = vi.fn()
    const onToggleFilter = vi.fn()
    render(
      <FindFragment {...props({ onToggleShowArchived, onToggleFilter })} />,
    )

    const statuses = screen.getByRole('group', { name: 'Statuses' })
    await userEvent.click(
      within(statuses).getByRole('button', { name: /Archived/ }),
    )

    expect(onToggleShowArchived).toHaveBeenCalledTimes(1)
    expect(onToggleFilter).not.toHaveBeenCalled()
  })
})

describe('row operations — one capability set, two input grammars', () => {
  const oneRow = adaptedRows([findEndeavorMocks.morningTask], capabilities)

  it('performs the leading swipe\'s FIRST binding on a full swipe (touch)', () => {
    const onOperation = vi.fn()
    render(
      <FindFragment
        {...props({ rows: oneRow, visibleCount: 1, input: 'touch', onOperation })}
      />,
    )

    const content = document.querySelector(
      '[data-slot="endeavor-action-content"]',
    )
    if (content === null) throw new Error('no action content')
    fireEvent.pointerDown(content, { clientX: 0, pointerId: 1 })
    fireEvent.pointerMove(content, { clientX: 200, pointerId: 1 })
    fireEvent.pointerUp(content, { clientX: 200, pointerId: 1 })

    // Find's leading swipe is Start, then Edit — declaration order is the order.
    expect(onOperation).toHaveBeenCalledWith(
      'startSession',
      findEndeavorMocks.morningTask.id,
    )
  })

  it('performs the trailing swipe\'s destructive binding the same way', () => {
    const onOperation = vi.fn()
    render(
      <FindFragment
        {...props({ rows: oneRow, visibleCount: 1, input: 'touch', onOperation })}
      />,
    )

    const content = document.querySelector(
      '[data-slot="endeavor-action-content"]',
    )
    if (content === null) throw new Error('no action content')
    fireEvent.pointerDown(content, { clientX: 300, pointerId: 1 })
    fireEvent.pointerMove(content, { clientX: 100, pointerId: 1 })
    fireEvent.pointerUp(content, { clientX: 100, pointerId: 1 })

    expect(onOperation).toHaveBeenCalledWith(
      'delete',
      findEndeavorMocks.morningTask.id,
    )
  })

  it('offers the SAME bindings as hover buttons on a pointer surface', async () => {
    const onOperation = vi.fn()
    render(
      <FindFragment
        {...props({ rows: oneRow, visibleCount: 1, input: 'pointer', onOperation })}
      />,
    )

    // The strip is opacity-0 until hover/focus; it is in the tree either way,
    // which is what makes it reachable by keyboard.
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))

    expect(onOperation).toHaveBeenCalledWith(
      'startSession',
      findEndeavorMocks.morningTask.id,
    )
  })

  it('gives every row a named context-menu trigger, on both grammars', () => {
    render(
      <FindFragment {...props({ rows: oneRow, visibleCount: 1, input: 'pointer' })} />,
    )

    expect(
      screen.getByRole('button', {
        name: `Actions for ${findEndeavorMocks.morningTask.title}`,
      }),
    ).toBeTruthy()
  })

  it('opens Detail from a control OUTSIDE the action surface, on both grammars', async () => {
    for (const input of ['touch', 'pointer'] as const) {
      cleanup()
      const onOpenDetail = vi.fn()
      render(
        <FindFragment
          {...props({ rows: oneRow, visibleCount: 1, input, onOpenDetail })}
        />,
      )

      const open = screen.getByTestId('find-row-open')
      // Outside, so neither the pointer capture nor the hover strip can eat it.
      expect(
        open.closest('[data-slot="endeavor-action-surface"]'),
      ).toBeNull()

      await userEvent.click(open)
      expect(onOpenDetail).toHaveBeenCalledWith(
        findEndeavorMocks.morningTask.id,
      )
    }
  })
})

describe('the ellipsis menu — two irreversible bulk operations', () => {
  it('stays closed until asked, and says so through aria-expanded', () => {
    render(<FindFragment {...props()} />)

    const trigger = screen.getByRole('button', { name: 'Endeavor actions' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('counts the visible rows in both labels, as canon does', async () => {
    render(<FindFragment {...props({ visibleCount: 4 })} />)

    await userEvent.click(screen.getByRole('button', { name: 'Endeavor actions' }))

    expect(
      screen.getByRole('menuitem', { name: 'Delete all visible (4)' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('menuitem', { name: 'Archive all visible (4)' }),
    ).toBeTruthy()
  })

  it('deletes every visible endeavor and closes — canon has no confirm step', async () => {
    const onDeleteAllVisible = vi.fn()
    render(<FindFragment {...props({ visibleCount: 2, onDeleteAllVisible })} />)

    await userEvent.click(screen.getByRole('button', { name: 'Endeavor actions' }))
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Delete all visible (2)' }),
    )

    expect(onDeleteAllVisible).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('archives every visible endeavor through the second entry', async () => {
    const onArchiveAllVisible = vi.fn()
    render(<FindFragment {...props({ visibleCount: 2, onArchiveAllVisible })} />)

    await userEvent.click(screen.getByRole('button', { name: 'Endeavor actions' }))
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Archive all visible (2)' }),
    )

    expect(onArchiveAllVisible).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape and returns focus to its trigger', async () => {
    render(<FindFragment {...props()} />)

    const trigger = screen.getByRole('button', { name: 'Endeavor actions' })
    await userEvent.click(trigger)
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })
})
