/**
 * The Page's render tests, mirroring `PlanPage.stories` (`RC-11`).
 *
 * These are the end-to-end ones: a real store built by `makeStore`, real
 * Producers dispatched against a **seeded in-memory `LocalStore`** injected
 * through `ThunkExtra`, and assertions on what the user sees and on what
 * landed in state. Nothing is mocked at the wire (`RC-35`); the only doubles
 * are the `stubbed…` bindings the manifest already ships.
 *
 * The Page composes four slices, so the cross-slice hand-offs are asserted
 * where they are made — the capture prompt, the detail request, and the haptic
 * — rather than left to a comment claiming they are wired.
 */
import type { EndeavorRecord } from '@kro/core'
import {
  EndeavorHost,
  EndeavorKind,
  endeavorRecordFromEndeavor,
  makeEndeavor,
} from '@kro/core'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StoreProvider } from '../../../../library/StoreProvider'
import {
  type ThunkExtra,
  makeStore,
  stubbedThunkExtra,
} from '../../../../library/store'
import { makeInMemoryLocalStore } from '../../../../services/localStore/InMemoryLocalStore'
import { PLAN_REFERENCE_DAY, planAt } from '../../PlanMocks'
import { PlanPage } from '../PlanPage'
import { installPointerEvents, pointer } from './pointerEvents'

installPointerEvents()

const today = () => {
  const at = new Date()
  at.setHours(0, 0, 0, 0)
  return at
}

/** An event on TODAY, because the Page opens on the day it mounts. */
const seededEvent = (id: string, hour: number, durationSeconds = 3600) =>
  makeEndeavor({
    id,
    title: id,
    kind: EndeavorKind.calendarEvent,
    start: new Date(today().getTime() + hour * 3_600_000),
    duration: durationSeconds,
    hostedBy: [EndeavorHost.local],
  })

const recordOf = (
  id: string,
  hour: number,
  durationSeconds = 3600,
): EndeavorRecord =>
  endeavorRecordFromEndeavor(seededEvent(id, hour, durationSeconds), {
    now: PLAN_REFERENCE_DAY,
  })

const storeWith = (
  records: readonly EndeavorRecord[] = [],
  extraOverrides: Partial<ThunkExtra> = {},
) => {
  const localStore = makeInMemoryLocalStore({ endeavors: records })
  return makeStore({ ...stubbedThunkExtra, localStore, ...extraOverrides })
}

const mount = (
  store = storeWith(),
  props: Parameters<typeof PlanPage>[0] = {},
) =>
  render(
    <StoreProvider store={store}>
      <PlanPage {...props} />
    </StoreProvider>,
  )

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', {
    value: 390,
    configurable: true,
  })
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes('coarse'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
      onchange: null,
    }) as unknown as MediaQueryList) as typeof window.matchMedia
})

afterEach(cleanup)

describe('PlanPage', () => {
  it('opens on today with the hour grid drawn and the now line on it', async () => {
    mount()

    expect(await screen.findByTestId('plan-timeline')).toBeTruthy()
    expect(screen.getAllByTestId('plan-timeline-hour-rule')).toHaveLength(25)
    expect(screen.getByTestId('plan-timeline-now')).toBeTruthy()
  })

  it('tells the shell which destination the URL landed on', () => {
    // The regression the first screenshot pass caught: replacing the shell's
    // placeholder with a real Page took the route-mount signal with it, and
    // `/plan` served the timeline under a header still reading "My Day".
    const store = storeWith()
    mount(store)

    expect(store.getState().main.selected.kind).toBe('plan')
  })

  it('reads the day through the real Producer and draws what came back', async () => {
    const store = storeWith([recordOf('standup', 9), recordOf('review', 14)])
    mount(store)

    await waitFor(() =>
      expect(screen.getAllByTestId('plan-timeline-block')).toHaveLength(2),
    )
    expect(store.getState().plan.dayLoad.kind).toBe('loaded')
    expect(screen.getByTestId('plan-subtitle').textContent).toBe('2 events')
  })

  it('shows the ONE activity signal while the first read is in flight', () => {
    mount()

    // `.pending` has already run synchronously by the time render commits, so
    // the spinner is what a user sees on the first frame.
    expect(screen.getByTestId('plan-refresh').dataset.busy).toBe('true')
  })

  it('steps the selected day and re-reads it — the picker is not decorative', async () => {
    const store = storeWith([recordOf('standup', 9)])
    mount(store)
    await waitFor(() =>
      expect(screen.getAllByTestId('plan-timeline-block')).toHaveLength(1),
    )
    const before = store.getState().plan.selectedDate.getDate()

    await userEvent.click(screen.getByRole('button', { name: 'Next day' }))

    // `addingPlanDays` normalises to the start of the day, so the assertion is
    // on the calendar day rather than on an exact instant — a fixed 86.4 M ms
    // would also be wrong across a DST boundary.
    await waitFor(() =>
      expect(store.getState().plan.selectedDate.getDate()).not.toBe(before),
    )
    await waitFor(() =>
      expect(screen.queryAllByTestId('plan-timeline-block')).toHaveLength(0),
    )
  })

  it('arms edit mode on a hold, and buzzes exactly once for it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const vibrateForTimelineHold = vi.fn(() => true)
    const store = storeWith([recordOf('standup', 23)], {
      vibrationService: {
        ...stubbedThunkExtra.vibrationService,
        vibrateForTimelineHold,
      },
    })
    mount(store)

    await vi.waitFor(() =>
      expect(screen.getAllByTestId('plan-timeline-block')).toHaveLength(1),
    )
    const surface = screen.getByTestId('plan-timeline-block-surface')
    pointer('pointerDown', surface, { clientX: 100, clientY: 100 })
    act(() => {
      vi.advanceTimersByTime(600)
    })

    expect(store.getState().plan.editSession?.endeavorId).toBe('standup')
    await vi.waitFor(() =>
      expect(vibrateForTimelineHold).toHaveBeenCalledTimes(1),
    )
    vi.useRealTimers()
  })

  it('hands a tapped block to the Detail slice rather than opening one itself', async () => {
    const store = storeWith([recordOf('standup', 9)])
    mount(store)
    await waitFor(() =>
      expect(screen.getAllByTestId('plan-timeline-block')).toHaveLength(1),
    )

    const surface = screen.getByTestId('plan-timeline-block-surface')
    pointer('pointerDown', surface, { clientX: 20, clientY: 20 })
    pointer('pointerUp', surface, { clientX: 20, clientY: 20 })

    await waitFor(() =>
      expect(store.getState().endeavorDetail.endeavor?.id).toBe('standup'),
    )
  })

  it('seeds the ghost AND the capture prompt from one empty-slot hold', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const store = storeWith()
    mount(store)
    await vi.waitFor(() =>
      expect(screen.getByTestId('plan-timeline-slots')).toBeTruthy(),
    )

    const slot = screen.getByTestId('plan-timeline-slots')
      .children[36] as HTMLElement
    pointer('pointerDown', slot, { clientX: 100, clientY: 540 })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    const state = store.getState()
    // The ghost is on the canvas at the pressed quarter hour...
    expect(state.plan.quickCreate?.start.getHours()).toBe(9)
    expect(state.plan.quickCreate?.durationSeconds).toBe(3600)
    // ...and the prompt opened on Event, already scheduled there.
    expect(state.capture.prompt?.draft.kind).toBe('event')
    expect(screen.getByTestId('plan-timeline-draft')).toBeTruthy()
    vi.useRealTimers()
  })

  it('seeds the same pair from a double tap, and does NOT buzz for it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const vibrateForTimelineHold = vi.fn(() => true)
    const store = storeWith([], {
      vibrationService: {
        ...stubbedThunkExtra.vibrationService,
        vibrateForTimelineHold,
      },
    })
    mount(store)
    await vi.waitFor(() =>
      expect(screen.getByTestId('plan-timeline-slots')).toBeTruthy(),
    )

    const slot = screen.getByTestId('plan-timeline-slots')
      .children[40] as HTMLElement
    pointer('pointerDown', slot, { clientX: 100, clientY: 600 })
    pointer('pointerUp', slot, { clientX: 100, clientY: 600 })
    act(() => {
      vi.advanceTimersByTime(80)
    })
    pointer('pointerDown', slot, { clientX: 100, clientY: 600 })
    pointer('pointerUp', slot, { clientX: 100, clientY: 600 })

    expect(store.getState().plan.quickCreate?.start.getHours()).toBe(10)
    expect(store.getState().capture.prompt?.draft.kind).toBe('event')
    // Canon: *"a double-tap already confirms itself visually and needs no buzz."*
    expect(vibrateForTimelineHold).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('commits a dragged edge to the row and persists it through the Producer', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const store = storeWith([recordOf('standup', 23)])
    mount(store)
    await vi.waitFor(() =>
      expect(screen.getAllByTestId('plan-timeline-block')).toHaveLength(1),
    )

    const surface = screen.getByTestId('plan-timeline-block-surface')
    pointer('pointerDown', surface, { clientX: 100, clientY: 100 })
    act(() => {
      vi.advanceTimersByTime(600)
    })

    const handle = screen
      .getAllByTestId('plan-timeline-edit-handle')
      .find((dot) => dot.dataset.edge === 'end') as HTMLElement
    // 60px at 60px/hour is exactly one hour — four snap grains.
    pointer('pointerDown', handle, { clientX: 0, clientY: 300 })
    pointer('pointerMove', handle, { clientX: 0, clientY: 360 })
    pointer('pointerUp', handle, { clientX: 0, clientY: 360 })

    await userEvent.click(screen.getByTestId('plan-timeline-commit-surface'))

    await vi.waitFor(() => {
      const day = store.getState().plan.dayLoad
      expect(day.kind).toBe('loaded')
      if (day.kind !== 'loaded') return
      expect(day.events[0]?.duration).toBe(7200)
    })
    vi.useRealTimers()
  })

  it('switches destination through the rotary picker, and the FAB follows the rule', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const store = storeWith()
    mount(store)

    expect(screen.getByTestId('plan-fab')).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'List View' }))
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    await userEvent.click(
      screen.getByRole('button', { name: 'Priority Matrix' }),
    )
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(store.getState().plan.viewMode).toBe('priorityMatrix')
    expect(screen.queryByTestId('plan-fab')).toBeNull()
    vi.useRealTimers()
  })

  it('shows the reconnect banner the route resolved, and nothing when healthy', () => {
    const { rerender } = mount(storeWith(), { googleNeedsReconnect: true })
    expect(screen.getByTestId('plan-reconnect-banner')).toBeTruthy()

    rerender(
      <StoreProvider store={storeWith()}>
        <PlanPage googleNeedsReconnect={false} />
      </StoreProvider>,
    )
    expect(screen.queryByTestId('plan-reconnect-banner')).toBeNull()
  })

  it('never dispatches a create while the flag is off — an inert canvas is honest', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const store = storeWith()
    mount(store)
    await vi.waitFor(() =>
      expect(screen.getByTestId('plan-timeline')).toBeTruthy(),
    )

    // The flag is cached at `onViewLoaded`; turning it off in state is what a
    // debug override does, and the canvas must lose its press targets.
    act(() => {
      store.dispatch({
        type: 'plan/onViewLoaded',
        payload: {
          now: new Date(),
          selectedDate: new Date(),
          isQuickEventCreationEnabled: false,
          enabledCapabilityFlags: [],
        },
      })
    })

    expect(screen.queryByTestId('plan-timeline-slots')).toBeNull()
    vi.useRealTimers()
  })

  it('reads the reference fixtures the rest of this feature is tested against', () => {
    // A guard on the shared fixture, so a change to `PlanMocks` that would
    // silently re-date every scene in this suite fails here first.
    expect(planAt(9).getHours()).toBe(9)
    expect(PLAN_REFERENCE_DAY.getDay()).toBe(4)
  })
})
