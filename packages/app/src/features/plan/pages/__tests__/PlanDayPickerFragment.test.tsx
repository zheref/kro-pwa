/**
 * The five-day picker's render tests, mirroring `PlanDayPickerFragment.stories`
 * (`RC-11`) — and where acceptance criterion 3's *"day picker styling matches
 * canon"* half is checked as a rendered fact rather than as a screenshot.
 *
 * The dates come from #18's own `planDayPickerDates`, never from an inline
 * array, so a story cannot show a batch the slice could not produce (`RC-31`).
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { planDayPickerDates } from '../../PlanNavigation'
import { PLAN_REFERENCE_DAY, PLAN_REFERENCE_NOW, planAt } from '../../PlanMocks'
import { addingPlanDays, startOfPlanDay } from '../../PlanCalendar'
import {
  PlanDayPickerFragment,
  pickerWeekdayColor,
} from '../PlanDayPickerFragment'

afterEach(cleanup)

const today = startOfPlanDay(PLAN_REFERENCE_DAY)
const dates = planDayPickerDates(today)

const mount = (
  overrides: Partial<Parameters<typeof PlanDayPickerFragment>[0]> = {},
) =>
  render(
    <PlanDayPickerFragment
      dates={dates}
      selectedDate={today}
      now={PLAN_REFERENCE_NOW}
      onSelectDate={() => {}}
      onStepDay={() => {}}
      {...overrides}
    />,
  )

describe('PlanDayPickerFragment', () => {
  it('shows canon five days with a chevron either side — seven columns', () => {
    mount()

    expect(screen.getAllByTestId('plan-day-chip')).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Previous day' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next day' })).toBeTruthy()
  })

  it('marks exactly one chip selected, and announces it as pressed', () => {
    mount()

    const selected = screen
      .getAllByTestId('plan-day-chip')
      .filter((chip) => chip.dataset.selected === 'true')
    expect(selected).toHaveLength(1)
    expect(selected[0]?.getAttribute('aria-pressed')).toBe('true')
  })

  it('marks today separately from the selection — the two are not the same chip', () => {
    // Selection two days on, so today is visible and unselected: the case
    // canon crimson letter is FOR.
    mount({ selectedDate: addingPlanDays(today, 2) })

    const chips = screen.getAllByTestId('plan-day-chip')
    const todayChip = chips.find((chip) => chip.dataset.today === 'true')
    expect(todayChip).toBeDefined()
    expect(todayChip?.dataset.selected).toBe('false')
  })

  it('names every chip with its whole date, since "T 18" names nothing aloud', () => {
    mount()

    expect(
      screen.getByRole('button', { name: 'Thursday, June 18, 2026' }),
    ).toBeTruthy()
  })

  it('asks for the day it was tapped, not for a step', async () => {
    const onSelectDate = vi.fn()
    mount({ onSelectDate })

    await userEvent.click(
      screen.getByRole('button', { name: 'Saturday, June 20, 2026' }),
    )

    expect(onSelectDate).toHaveBeenCalledTimes(1)
    expect(onSelectDate.mock.calls[0]?.[0]).toBeInstanceOf(Date)
  })

  it('steps by one in the direction of the chevron', async () => {
    const onStepDay = vi.fn()
    mount({ onStepDay })

    await userEvent.click(screen.getByRole('button', { name: 'Next day' }))
    await userEvent.click(screen.getByRole('button', { name: 'Previous day' }))

    expect(onStepDay).toHaveBeenNthCalledWith(1, 1)
    expect(onStepDay).toHaveBeenNthCalledWith(2, -1)
  })

  it('renders a batch that is not centred on the selection — the strip slides under it', () => {
    // Canon: the batch shifts only after selection crosses a boundary, so a
    // selection at the edge must still render five chips with today in place.
    mount({ selectedDate: addingPlanDays(today, 2) })

    expect(screen.getAllByTestId('plan-day-chip')).toHaveLength(5)
    expect(
      screen.getAllByTestId('plan-day-chip').filter((c) => c.dataset.selected === 'true'),
    ).toHaveLength(1)
  })
})

describe('pickerWeekdayColor', () => {
  it('gives an ordinary unselected day the plain foreground', () => {
    expect(pickerWeekdayColor(false, false)).toContain('--kro-color-fore)')
  })

  it('inverts on the selected fill, which is opaque `fore`', () => {
    expect(pickerWeekdayColor(false, true)).toContain('--kro-color-absolute')
  })

  it('keeps today crimson while it is unselected', () => {
    expect(pickerWeekdayColor(true, false)).toContain(
      '--kro-color-timeline-today-foreground',
    )
  })

  it('lightens today crimson once selected — 2.57:1 is not a legible letter', () => {
    expect(pickerWeekdayColor(true, true)).toContain(
      '--kro-color-timeline-today-selected-foreground',
    )
  })
})

describe('the picker batch it is given', () => {
  it('is #18 own arithmetic, so a story cannot show an impossible week', () => {
    expect(dates).toHaveLength(5)
    expect(dates[2]?.getTime()).toBe(today.getTime())
    expect(dates[0]?.getTime()).toBe(addingPlanDays(today, -2).getTime())
    expect(planAt(0).getTime()).toBe(today.getTime())
  })
})
