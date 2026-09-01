/**
 * The vista-driven visibility panel's render tests, mirroring
 * `PlanVisibilityFragment.stories` (`RC-11`).
 *
 * Two acceptance criteria: the panel shows exactly what `.planDay` declares
 * (including the Calendars family #19's fixed panel could not), and a toggle
 * emits **one axis-tagged toggle and nothing else** — which is how "filters
 * never alter the rings" is checkable without mounting the Do surface. The
 * rings are computed by KC-IS-#16/#17 from their own source; a Fragment that
 * raises only a `PlanVisibilityToggle` has no path to them at all.
 */
import type { EndeavorsVista } from '@kro/core'
import {
  EndeavorHost,
  EndeavorKind,
  EndeavorsVistas,
  UserFilter,
  makeEndeavorsLens,
  vistaWithLens,
} from '@kro/core'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { initialPlanVisibility } from '../../../PlanState'
import { PlanVisibilityFragment } from '../PlanVisibilityFragment'

afterEach(cleanup)

const planDay = EndeavorsVistas.planDay

const mount = (
  overrides: Partial<Parameters<typeof PlanVisibilityFragment>[0]> = {},
) =>
  render(
    <PlanVisibilityFragment
      vista={planDay}
      visibility={initialPlanVisibility}
      onToggle={() => {}}
      {...overrides}
    />,
  )

const vistaExposing = (...filters: readonly UserFilter[]): EndeavorsVista =>
  vistaWithLens(planDay, makeEndeavorsLens({ exposes: filters }))

describe('PlanVisibilityFragment — what the vista declares', () => {
  it('draws all FOUR families `.planDay` declares, in canon order', () => {
    mount()
    const headings = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
    expect(headings).toEqual(['Show', 'Kinds', 'Calendars', 'Sources'])
  })

  it('adds the Calendars family the fixed three-section panel never drew', () => {
    mount()
    expect(screen.getByRole('region', { name: 'Calendars' })).toBeTruthy()
  })

  it('says so honestly while no calendar inventory has loaded', () => {
    mount()
    expect(screen.getByTestId('plan-visibility-empty').textContent).toBe(
      'No calendars loaded yet',
    )
  })

  it('draws a row per calendar once the inventory is there', () => {
    mount({
      calendars: [
        { id: 'google:work', name: 'Work' },
        { id: 'google:home', name: 'Home' },
      ],
    })
    expect(screen.getByRole('switch', { name: 'Work' })).toBeTruthy()
    expect(screen.getByRole('switch', { name: 'Home' })).toBeTruthy()
    expect(screen.queryByTestId('plan-visibility-empty')).toBeNull()
  })

  it('drops a family the vista does NOT declare', () => {
    mount({ vista: vistaExposing(UserFilter.kinds) })
    expect(screen.getByRole('region', { name: 'Kinds' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Sources' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Calendars' })).toBeNull()
  })

  it('states a declared family it cannot dispatch, rather than skipping it', () => {
    mount({ vista: vistaExposing(UserFilter.grouping) })
    const notice = screen.getByTestId('plan-visibility-unsupported')
    expect(notice.getAttribute('data-filter')).toBe('grouping')
    expect(notice.textContent).toContain('not available on Plan yet')
  })

  it('draws nothing at all for a vista that exposes nothing', () => {
    mount({ vista: vistaExposing() })
    expect(screen.queryAllByRole('switch')).toHaveLength(0)
  })
})

describe('PlanVisibilityFragment — what a press does', () => {
  it('emits ONE axis-tagged toggle and nothing else — no path to the rings', async () => {
    const onToggle = vi.fn()
    mount({ onToggle })

    await userEvent.click(screen.getByRole('switch', { name: 'Habits' }))

    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenCalledWith({
      axis: 'kind',
      value: EndeavorKind.habit,
    })
  })

  it('emits the calendar axis for a calendar row, carrying its id', async () => {
    const onToggle = vi.fn()
    mount({ onToggle, calendars: [{ id: 'google:work', name: 'Work' }] })

    await userEvent.click(screen.getByRole('switch', { name: 'Work' }))

    expect(onToggle).toHaveBeenCalledWith({
      axis: 'calendar',
      value: 'google:work',
    })
  })

  it('INVERTS the stored set, exactly as the shipped rows do', () => {
    mount({
      visibility: {
        ...initialPlanVisibility,
        hiddenHosts: [EndeavorHost.googleCalendar],
        hiddenCalendarIds: ['google:work'],
      },
      calendars: [{ id: 'google:work', name: 'Work' }],
    })

    expect(
      screen
        .getByRole('switch', { name: 'Google Calendar' })
        .getAttribute('aria-checked'),
    ).toBe('false')
    expect(
      screen.getByRole('switch', { name: 'Work' }).getAttribute('aria-checked'),
    ).toBe('false')
  })
})
