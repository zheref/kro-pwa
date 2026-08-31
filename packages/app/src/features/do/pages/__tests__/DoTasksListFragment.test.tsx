import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DoTasksListFragment } from '../DoTasksListFragment'
import { noopDoCardHandlers } from '../doCardHandlers'
import {
  DO_SURFACE_MOCK_LOCALE,
  DO_SURFACE_MOCK_NOW,
  doSurfaceMocks,
  doSurfaceProps,
} from '../doSurfaceMocks'

afterEach(cleanup)

const day = doSurfaceProps(doSurfaceMocks.typicalDay)
const overdue = { title: 'Overdue', tag: 'overdue' } as const

const list = (overrides: Partial<Parameters<typeof DoTasksListFragment>[0]> = {}) => (
  <DoTasksListFragment
    destination={overdue}
    tasks={day.lanes.overdue}
    selectedCardKey={null}
    isInMarkCompleteMode={false}
    now={DO_SURFACE_MOCK_NOW}
    locale={DO_SURFACE_MOCK_LOCALE}
    onBack={() => {}}
    handlers={noopDoCardHandlers}
    {...overrides}
  />
)

describe('the expanded section', () => {
  it('lists every card of that section as a horizontal row', () => {
    render(list())

    const rows = document.querySelectorAll(
      '[data-slot="endeavor-card"][data-layout="horizontal"]',
    )
    expect(rows.length).toBe(day.lanes.overdue.length)
    expect(day.lanes.overdue.length).toBeGreaterThan(0)
  })

  it('titles itself with the section it expanded', () => {
    render(list())
    expect(screen.getByText('Overdue')).toBeTruthy()
  })

  it('shows canon\'s "All clear!" when the section has emptied', () => {
    render(list({ tasks: [] }))
    expect(screen.getByTestId('do-tasks-list-empty').textContent).toBe(
      'All clear!',
    )
  })
})

describe('leaving the list', () => {
  it('offers the local back affordance a nested destination owes', async () => {
    const onBack = vi.fn()
    render(list({ onBack }))

    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})

describe('preparation inside the list', () => {
  it('prepares a card under this section\'s own tag', async () => {
    const onPrepare = vi.fn()
    render(list({ handlers: { ...noopDoCardHandlers, onPrepare } }))

    const first = day.lanes.overdue[0]
    if (first === undefined) throw new Error('the Overdue fixture is empty')
    await userEvent.click(screen.getByRole('button', { name: first.title }))

    expect(onPrepare).toHaveBeenCalledWith('overdue', first.id)
  })

  it('marks the prepared row selected, and only that one', () => {
    const first = day.lanes.overdue[0]
    if (first === undefined) throw new Error('the Overdue fixture is empty')

    render(list({ selectedCardKey: `overdue:${first.id}` }))

    const selected = document.querySelectorAll(
      '[data-slot="endeavor-card"][data-selected="true"]',
    )
    expect(selected).toHaveLength(1)
  })

  it('refuses to prepare while bulk mark-complete mode is on', async () => {
    const onPrepare = vi.fn()
    render(
      list({
        isInMarkCompleteMode: true,
        handlers: { ...noopDoCardHandlers, onPrepare },
      }),
    )

    const first = day.lanes.overdue[0]
    if (first === undefined) throw new Error('the Overdue fixture is empty')
    await userEvent.click(screen.getByRole('button', { name: first.title }))

    expect(onPrepare).not.toHaveBeenCalled()
  })
})
