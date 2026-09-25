/**
 * The pane's Plan segment shows today's read-only timeline only when it is
 * pointed at no endeavor; an endeavor's Plan is Endeavor Detail's.
 */
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installRadixEnvironment } from '../../../design/system/primitives/__tests__/radixEnvironment'
import {
  PaneFrame,
  makePaneHostStore,
} from '../../endeavorDetail/pages/__tests__/paneHarness'
import { Harness } from '../../find/pages/__tests__/pagesHarness'
import {
  userDidDrillIntoDetailPane,
  userDidSelectDetailPaneSegment,
  userDidTapDetailPaneBack,
} from '../MainFeature'
import { TimelinePanePage } from '../TimelinePanePage'

beforeEach(() => {
  installRadixEnvironment()
})
afterEach(cleanup)

const mount = async () => {
  const store = makePaneHostStore()
  render(
    <Harness store={store}>
      <PaneFrame>
        <TimelinePanePage locale="en-US" />
      </PaneFrame>
    </Harness>,
  )
  await waitFor(() =>
    expect(store.getState().main.isDetailPaneEnabled).toBe(true),
  )
  return store
}

describe('TimelinePanePage', () => {
  it('shows the read-only timeline when Plan is picked with nothing selected', async () => {
    const store = await mount()
    act(() => {
      store.dispatch(userDidSelectDetailPaneSegment({ segment: 'plan' }))
    })
    const host = await screen.findByTestId('detail-pane-timeline')
    expect(host.querySelector('[data-read-only="true"]')).not.toBeNull()
  })

  it('drills into Session Setup for a new task from the previewed session', async () => {
    const store = await mount()
    act(() => {
      store.dispatch(userDidSelectDetailPaneSegment({ segment: 'plan' }))
    })
    await userEvent.click(
      await screen.findByTestId('plan-timeline-session-preview-start'),
    )
    expect(store.getState().main.detailPane.segment).toBe('sessionSetup')
    expect(store.getState().main.detailPane.endeavor).toBeNull()
    expect(store.getState().main.detailPaneBackStack).toHaveLength(1)
  })

  it('comes back to the timeline on Back after Start', async () => {
    const store = await mount()
    act(() => {
      store.dispatch(userDidSelectDetailPaneSegment({ segment: 'plan' }))
    })
    await userEvent.click(
      await screen.findByTestId('plan-timeline-session-preview-start'),
    )
    act(() => {
      store.dispatch(userDidTapDetailPaneBack())
    })
    expect(store.getState().main.detailPane.segment).toBe('plan')
    expect(await screen.findByTestId('detail-pane-timeline')).toBeTruthy()
  })

  it('steps aside when Plan is pointed at an endeavor', async () => {
    const store = await mount()
    act(() => {
      store.dispatch(
        userDidDrillIntoDetailPane({
          location: {
            segment: 'plan',
            endeavor: { id: 'e-1', title: 'Write the quarterly report' },
          },
        }),
      )
    })
    expect(screen.queryByTestId('detail-pane-timeline')).toBeNull()
  })

  it('shows nothing while the pane is on another segment', async () => {
    const store = await mount()
    act(() => {
      store.dispatch(userDidSelectDetailPaneSegment({ segment: 'performance' }))
    })
    expect(screen.queryByTestId('detail-pane-timeline')).toBeNull()
  })
})
