/**
 * The pane's Performance segment picks its reading from what the pane is
 * pointed at — Endeavor Activity for an endeavor, Day Progress for the day.
 */
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installRadixEnvironment } from '../../../design/system/primitives/__tests__/radixEnvironment'
import {
  PaneFrame,
  makePaneHostStore,
} from '../../endeavorDetail/pages/__tests__/paneHarness'
import { Harness } from '../../find/pages/__tests__/pagesHarness'
import {
  userDidDrillIntoDetailPane,
  userDidRequestDayProgress,
  userDidSelectDetailPaneSegment,
} from '../MainFeature'
import { PerformancePanePage } from '../PerformancePanePage'

beforeEach(() => {
  installRadixEnvironment()
})
afterEach(cleanup)

const mount = () => {
  const store = makePaneHostStore()
  render(
    <Harness store={store}>
      <PaneFrame>
        <PerformancePanePage locale="en-US" />
      </PaneFrame>
    </Harness>,
  )
  return store
}

describe('PerformancePanePage', () => {
  it('shows Day Progress when the rings open the whole-day reading', async () => {
    const store = mount()
    await waitFor(() =>
      expect(store.getState().main.isDetailPaneEnabled).toBe(true),
    )
    act(() => {
      store.dispatch(userDidRequestDayProgress())
    })
    const host = await screen.findByTestId('detail-pane-performance')
    expect(host.getAttribute('data-reading')).toBe('dayProgress')
  })

  it('shows Endeavor Activity when drilled in from a session', async () => {
    const store = mount()
    await waitFor(() =>
      expect(store.getState().main.isDetailPaneEnabled).toBe(true),
    )
    act(() => {
      store.dispatch(
        userDidDrillIntoDetailPane({
          location: {
            segment: 'performance',
            endeavor: { id: 'e-1', title: 'Write the quarterly report' },
          },
        }),
      )
    })
    const host = await screen.findByTestId('detail-pane-performance')
    expect(host.getAttribute('data-reading')).toBe('endeavorActivity')
  })

  it('shows nothing while the pane is on another segment', async () => {
    const store = mount()
    await waitFor(() =>
      expect(store.getState().main.isDetailPaneEnabled).toBe(true),
    )
    act(() => {
      store.dispatch(userDidSelectDetailPaneSegment({ segment: 'plan' }))
    })
    expect(screen.queryByTestId('detail-pane-performance')).toBeNull()
  })

  it('reads nothing behind another reading: Day Progress never loads while hidden', async () => {
    const store = mount()
    await waitFor(() =>
      expect(store.getState().main.isDetailPaneEnabled).toBe(true),
    )
    act(() => {
      store.dispatch(userDidSelectDetailPaneSegment({ segment: 'plan' }))
    })
    expect(store.getState().dayProgress.load.kind).toBe('idle')
    expect(store.getState().endeavorActivity.load.kind).toBe('idle')
  })
})
