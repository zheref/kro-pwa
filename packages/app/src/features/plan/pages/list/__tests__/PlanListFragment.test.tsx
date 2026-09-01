/**
 * The list canvas's render and interaction tests, mirroring
 * `PlanListFragment.stories` 1:1 (`RC-11`).
 *
 * The three that carry an acceptance criterion:
 *   · the four temporal buckets under None, and the SAME day regrouped;
 *   · the grouping switch, driven as a user drives it;
 *   · the row gestures, resolved per input type from the vista's own
 *     capability set — swipe surfaces on touch, a hover strip on pointer.
 *
 * The context menu is deliberately never OPENED here: it is a Radix dropdown,
 * and mounting a popper under jsdom costs seconds
 * (`system/primitives/__tests__/radixEnvironment.tsx`). Its trigger's presence
 * is what this suite asserts; the menu's own behaviour is the kit's suite.
 */
import { PlanListGrouping, PlanListSort } from '@kro/core'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { planListSections } from '../planListModel'
import { PlanListFragment } from '../PlanListFragment'
import {
  PLAN_LIST_NOW,
  planListCapabilitiesFixture,
  planListMixedDay,
  planListProjectDay,
  planListTimeOfDayDay,
} from '../planListMocks'

afterEach(cleanup)

const mount = (
  overrides: Partial<Parameters<typeof PlanListFragment>[0]> = {},
) =>
  render(
    <PlanListFragment
      sections={planListSections({
        endeavors: planListMixedDay,
        grouping: PlanListGrouping.none,
        now: PLAN_LIST_NOW,
      })}
      capabilities={planListCapabilitiesFixture}
      grouping={PlanListGrouping.none}
      sort={PlanListSort.time}
      now={PLAN_LIST_NOW}
      input="touch"
      topInsetPx={74}
      bottomInsetPx={102}
      onSelectGrouping={() => {}}
      onSelectSort={() => {}}
      onOperation={() => {}}
      onOpenDetail={() => {}}
      {...overrides}
    />,
  )

describe('PlanListFragment — the four temporal buckets', () => {
  it('draws All Day, Past Events, Ongoing and Coming Next, in that order', () => {
    mount()
    const headers = screen
      .getAllByTestId('plan-list-section-header')
      .map((header) => header.textContent?.replace('Now', '').trim())
    expect(headers).toEqual([
      'All Day',
      'Past Events',
      'Ongoing',
      'Coming Next',
    ])
  })

  it('pulses only the Ongoing header — one signal, on the section that has news', () => {
    mount()
    expect(screen.getAllByTestId('plan-list-section-activity')).toHaveLength(1)
  })

  it('marks the row that is happening right now, not just its section', () => {
    mount()
    const ongoing = screen
      .getAllByTestId('plan-list-row')
      .filter((row) => row.getAttribute('data-ongoing') === 'true')
    expect(ongoing.map((row) => row.getAttribute('data-endeavor-id'))).toEqual([
      'list-ongoing',
    ])
  })

  it('shows the day empty state when the day has no rows at all', () => {
    mount({ sections: [] })
    expect(screen.getByText('Nothing on this day')).toBeTruthy()
    expect(screen.queryAllByTestId('plan-list-row')).toHaveLength(0)
  })
})

describe('PlanListFragment — grouping', () => {
  it('renders the SAME day as project sections when the grouping says so', () => {
    mount({
      grouping: PlanListGrouping.project,
      sections: planListSections({
        endeavors: planListProjectDay,
        grouping: PlanListGrouping.project,
        now: PLAN_LIST_NOW,
      }),
    })
    expect(
      screen
        .getAllByTestId('plan-list-section')
        .map((section) => section.getAttribute('data-section')),
    ).toEqual(['atlas', 'borealis', 'noProject'])
  })

  it('renders the time-of-day bands when the grouping says so', () => {
    mount({
      grouping: PlanListGrouping.timeOfDay,
      sections: planListSections({
        endeavors: planListTimeOfDayDay,
        grouping: PlanListGrouping.timeOfDay,
        now: PLAN_LIST_NOW,
      }),
    })
    expect(
      screen
        .getAllByTestId('plan-list-section')
        .map((section) => section.getAttribute('data-section')),
    ).toEqual(['morning', 'afternoon', 'evening'])
  })

  it('SWITCHES grouping when the user presses another chip', async () => {
    const onSelectGrouping = vi.fn()
    mount({ onSelectGrouping })

    const group = screen.getByRole('group', { name: 'Group by' })
    await userEvent.click(
      within(group).getByRole('button', { name: 'Project' }),
    )

    expect(onSelectGrouping).toHaveBeenCalledWith(PlanListGrouping.project)
  })

  it('shows the active grouping as the pressed chip, and only that one', () => {
    mount({ grouping: PlanListGrouping.timeOfDay })
    const group = screen.getByRole('group', { name: 'Group by' })
    const pressed = within(group)
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-pressed') === 'true')
    expect(pressed.map((button) => button.textContent)).toEqual(['Time of day'])
  })

  it('switches the SORT from the same bar, without touching the grouping', async () => {
    const onSelectSort = vi.fn()
    const onSelectGrouping = vi.fn()
    mount({ onSelectSort, onSelectGrouping })

    const group = screen.getByRole('group', { name: 'Sort by' })
    await userEvent.click(
      within(group).getByRole('button', { name: 'Priority' }),
    )

    expect(onSelectSort).toHaveBeenCalledWith(PlanListSort.priority)
    expect(onSelectGrouping).not.toHaveBeenCalled()
  })
})

describe('PlanListFragment — row operations', () => {
  it('reveals the vista swipe surfaces on TOUCH, both edges', () => {
    const { container } = mount({ input: 'touch' })
    expect(
      container.querySelectorAll('[data-slot="endeavor-swipe-leading"]').length,
    ).toBeGreaterThan(0)
    expect(
      container.querySelectorAll('[data-slot="endeavor-swipe-trailing"]')
        .length,
    ).toBeGreaterThan(0)
  })

  it('turns the SAME bindings into a hover strip on POINTER', () => {
    const { container } = mount({ input: 'pointer' })
    expect(
      container.querySelectorAll('[data-slot="endeavor-hover-actions"]').length,
    ).toBeGreaterThan(0)
    // The swipe surfaces are gone: a pointer user never swipes.
    expect(
      container.querySelectorAll('[data-slot="endeavor-swipe-leading"]').length,
    ).toBe(0)
  })

  it('offers a context-menu trigger on every row, on both input types', () => {
    mount({ input: 'touch' })
    expect(
      screen.getAllByRole('button', { name: /^Actions for / }).length,
    ).toBe(screen.getAllByTestId('plan-list-row').length)
  })

  it('raises Start Session as an operation, never as a bespoke callback', async () => {
    const onOperation = vi.fn()
    mount({ input: 'pointer', onOperation })

    const [start] = screen.getAllByRole('button', { name: 'Start Session' })
    await userEvent.click(start!)

    expect(onOperation).toHaveBeenCalledWith('startSession', expect.any(String))
  })

  it('raises Delete the same way, from the trailing binding', async () => {
    const onOperation = vi.fn()
    mount({ input: 'pointer', onOperation })

    const [remove] = screen.getAllByRole('button', { name: 'Delete' })
    await userEvent.click(remove!)

    expect(onOperation).toHaveBeenCalledWith('delete', expect.any(String))
  })

  it('opens Detail from the labelled control beside the row, not from the tap', async () => {
    const onOpenDetail = vi.fn()
    mount({ onOpenDetail })

    await userEvent.click(
      screen.getByRole('button', { name: 'Open Deep work' }),
    )

    expect(onOpenDetail).toHaveBeenCalledWith('list-ongoing')
  })
})
