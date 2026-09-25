/**
 * Render tests mirroring `DayProgressFragment.stories.tsx` 1:1 (`RC-11`) —
 * the same `DayProgressMocks` states, through the same `fragmentPropsFor`.
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DAY_PROGRESS_MOCK_TODAY as today,
  dayProgressStateMocks as mocks,
} from '../../DayProgressMocks'
import { addDays } from '../../DayProgressRules'
import { DayProgressFragment } from '../DayProgressFragment'
import { fragmentPropsFor } from './dayProgressFixtures'

afterEach(cleanup)

describe('DayProgressFragment', () => {
  it('BusyDay: subtitle, both tallies and three activity cards, newest first', () => {
    render(<DayProgressFragment {...fragmentPropsFor(mocks.busyDay)} />)
    expect(screen.getByText('Today · Thu, Sep 24')).toBeTruthy()
    expect(screen.getByText('1/2')).toBeTruthy()
    expect(screen.getByText('1/3')).toBeTruthy()
    const cards = screen
      .getAllByRole('listitem')
      .filter((li) => li.hasAttribute('data-kro-day-progress-row'))
    expect(cards).toHaveLength(3)
    expect(
      within(cards[0] as HTMLElement).getByText('Session finished'),
    ).toBeTruthy()
    expect(within(cards[0] as HTMLElement).getByText('1h 35m')).toBeTruthy()
    expect(
      within(cards[1] as HTMLElement).getByText('Write weekly blog'),
    ).toBeTruthy()
    expect(
      within(cards[1] as HTMLElement).getByText('9:00 – 9:45'),
    ).toBeTruthy()
    expect(within(cards[2] as HTMLElement).getByText('No timer')).toBeTruthy()
  })

  it('EmptyDay: nothing planned and the empty activity state', () => {
    render(<DayProgressFragment {...fragmentPropsFor(mocks.emptyDay)} />)
    expect(screen.getByText('Nothing planned for this day.')).toBeTruthy()
    expect(screen.getByText('No activity yet')).toBeTruthy()
  })

  it('OnlyTasks: no habits tally', () => {
    render(<DayProgressFragment {...fragmentPropsFor(mocks.onlyTasks)} />)
    expect(screen.queryByText('Habits')).toBeNull()
    expect(screen.getByText('Tasks')).toBeTruthy()
  })

  it('HabitsAndTasks: both tallies complete', () => {
    render(<DayProgressFragment {...fragmentPropsFor(mocks.habitsAndTasks)} />)
    expect(screen.getAllByText('1/1')).toHaveLength(2)
  })

  it('LongTitles: the long title is rendered whole (CSS truncates)', () => {
    render(<DayProgressFragment {...fragmentPropsFor(mocks.longTitles)} />)
    expect(screen.getByText(/quarterly retrospective blog post/)).toBeTruthy()
  })

  it('NonAscii: non-ASCII titles and their emoji symbols', () => {
    render(<DayProgressFragment {...fragmentPropsFor(mocks.nonAscii)} />)
    expect(screen.getByText('週報を書く')).toBeTruthy()
    expect(screen.getByText('📝')).toBeTruthy()
  })

  it('Loading: both loading lines', () => {
    render(<DayProgressFragment {...fragmentPropsFor(mocks.loading)} />)
    expect(screen.getByText('Loading your day…')).toBeTruthy()
    expect(screen.getByText('Loading activity…')).toBeTruthy()
  })

  it('Failed: the typed exception copy as an alert', () => {
    render(<DayProgressFragment {...fragmentPropsFor(mocks.failed)} />)
    expect(screen.getByRole('alert').textContent).toBe(
      "Couldn't load your activity for this day.",
    )
  })

  it('EarlierWeek: next week enabled, no activity, full-date subtitle', () => {
    const onNextWeek = vi.fn()
    render(
      <DayProgressFragment
        {...fragmentPropsFor(mocks.earlierWeek, { onNextWeek })}
      />,
    )
    expect(screen.getByText('Thursday, September 17')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }))
    expect(onNextWeek).toHaveBeenCalledTimes(1)
    expect(screen.getByText('No activity yet')).toBeTruthy()
  })

  it('the lane: next week disabled on the current week, a tap selects that day', () => {
    const onSelectDay = vi.fn()
    const onPreviousWeek = vi.fn()
    render(
      <DayProgressFragment
        {...fragmentPropsFor(mocks.busyDay, { onSelectDay, onPreviousWeek })}
      />,
    )
    expect(
      (screen.getByRole('button', { name: 'Next week' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    expect(onPreviousWeek).toHaveBeenCalledTimes(1)
    fireEvent.click(
      screen.getByRole('button', { name: 'Wednesday, September 23' }),
    )
    expect(onSelectDay).toHaveBeenCalledWith(addDays(today, -1))
    expect(
      screen
        .getByRole('button', { name: 'Thursday, September 24' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
  })
})
