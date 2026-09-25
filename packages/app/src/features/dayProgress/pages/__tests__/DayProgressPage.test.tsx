/**
 * `DayProgressPage` render tests mirroring `DayProgressPage.stories.tsx`
 * (`RC-11`) — a real store seeded through the persistence path, the real
 * mount dispatch and the real Producer.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StoreProvider } from '../../../../library/StoreProvider'
import { DAY_PROGRESS_TICK_MS, DayProgressPage } from '../DayProgressPage'
import { makeSeededDayProgressStore } from './dayProgressFixtures'

// Only `Date` is faked — the mount effect stamps 11pm on the fixture day, so
// every fixture performance is already in the past; promises still resolve.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 8, 24, 23, 0) })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('DayProgressPage', () => {
  it('Typical: loads today and lists its activity', async () => {
    render(
      <StoreProvider store={makeSeededDayProgressStore()}>
        <DayProgressPage />
      </StoreProvider>,
    )
    expect(await screen.findByText('Write weekly blog')).toBeTruthy()
    expect(screen.getByText(/^Today · /)).toBeTruthy()
  })

  it('EmptyStore: the empty state once loaded', async () => {
    render(
      <StoreProvider store={makeSeededDayProgressStore([])}>
        <DayProgressPage />
      </StoreProvider>,
    )
    expect(await screen.findByText('No activity yet')).toBeTruthy()
  })

  it('Spanish: dates follow the locale prop', async () => {
    render(
      <StoreProvider store={makeSeededDayProgressStore()}>
        <DayProgressPage locale="es-ES" />
      </StoreProvider>,
    )
    await screen.findByText('Write weekly blog')
    expect(screen.getByText(/^Today · /).textContent).not.toMatch(
      /Mon|Tue|Wed|Thu|Fri|Sat|Sun/,
    )
  })

  it('previous week then next week round-trips through the store', async () => {
    const store = makeSeededDayProgressStore()
    render(
      <StoreProvider store={store}>
        <DayProgressPage />
      </StoreProvider>,
    )
    await screen.findByText('Write weekly blog')
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    expect(store.getState().dayProgress.weekOffset).toBe(-1)
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }))
    expect(store.getState().dayProgress.weekOffset).toBe(0)
    expect(await screen.findByText('Write weekly blog')).toBeTruthy()
  })
})

describe('DayProgressPage across midnight', () => {
  it('an open pane rolls over to the new day and re-reads it', async () => {
    vi.useRealTimers()
    vi.useFakeTimers({
      toFake: ['Date', 'setInterval', 'clearInterval'],
      now: new Date(2026, 8, 24, 23, 59, 30),
    })
    const store = makeSeededDayProgressStore()
    render(
      <StoreProvider store={store}>
        <DayProgressPage />
      </StoreProvider>,
    )
    await screen.findByText('Write weekly blog')
    expect(store.getState().dayProgress.today?.getDate()).toBe(24)

    act(() => {
      vi.advanceTimersByTime(DAY_PROGRESS_TICK_MS)
    })

    expect(store.getState().dayProgress.today?.getDate()).toBe(25)
    expect(await screen.findByText(/^Today · /)).toBeTruthy()
  })
})
