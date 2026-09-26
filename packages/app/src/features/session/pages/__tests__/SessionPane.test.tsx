/**
 * Session in the trailing detail pane — the render tests mirroring
 * `SessionPane.stories.tsx` scene for scene, on the same seeded stores.
 */
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installRadixEnvironment } from '../../../../design/system/primitives/__tests__/radixEnvironment'
import type { AppStore } from '../../../../library/store'
import { PaneFrame } from '../../../endeavorDetail/pages/__tests__/paneHarness'
import { Harness } from '../../../find/pages/__tests__/pagesHarness'
import {
  userDidDismissDetailPane,
  userDidRequestSessionSetup,
} from '../../../main/MainFeature'
import { SessionOverlays } from '../SessionOverlays'
import { sessionPaneScenes, slidesEndeavor } from './sessionPaneScenes'

beforeEach(() => {
  installRadixEnvironment()
})
afterEach(cleanup)

const mount = (store: AppStore) =>
  render(
    <Harness store={store}>
      <PaneFrame>
        <SessionOverlays />
      </PaneFrame>
    </Harness>,
  )

describe('Session in the detail pane — mirrors SessionPane.stories', () => {
  it('sets up the endeavor Execute opened it on, titled Session Setup', async () => {
    const store = sessionPaneScenes.forEndeavor()
    mount(store)

    await waitFor(() => {
      expect(store.getState().session.identity?.endeavorId).toBe(
        slidesEndeavor.id,
      )
    })
    const panel = screen.getByTestId('trailing-detail-panel')
    expect(within(panel).getByTestId('detail-pane-session')).toBeTruthy()
    // The mode toggle is the header; the title names the panel.
    expect(panel.getAttribute('aria-label')).toBe('Session Setup')
    expect(
      within(panel).getAllByText(slidesEndeavor.title).length,
    ).toBeGreaterThan(0)
    // Hosted, not raised: no modal of its own, no close of its own.
    expect(
      document.querySelector('[data-kro-session-surface="modal"]'),
    ).toBeNull()
    // One container: the pane's glass. No second surface inside it.
    expect(
      document.querySelector('[data-kro-session-surface="inline"]'),
    ).toBeNull()
    expect(
      within(panel).getByRole('region', { name: 'Focus session' }),
    ).toBeTruthy()
  })

  it('abandons an in-flight preparation when the pane host unmounts', async () => {
    const store = sessionPaneScenes.forEndeavor()
    const { unmount } = mount(store)
    unmount()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(store.getState().session.identity).toBeNull()
  })

  it('lands the newest preparation when the pane is re-pointed mid-flight', async () => {
    const store = sessionPaneScenes.forEndeavor()
    mount(store)
    act(() => {
      store.dispatch(userDidRequestSessionSetup({ endeavor: null }))
    })
    await waitFor(() => {
      expect(store.getState().session.identity?.isAnonymous).toBe(true)
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(store.getState().session.identity?.isAnonymous).toBe(true)
  })

  it('sets up a new, arbitrary task when opened with nothing selected', async () => {
    const store = sessionPaneScenes.newTask()
    mount(store)

    await waitFor(() => {
      expect(store.getState().session.identity?.isAnonymous).toBe(true)
    })
    const panel = screen.getByTestId('trailing-detail-panel')
    expect(panel.getAttribute('aria-label')).toBe('New Session')
  })

  it('shows the pill for a running session and opens the pane from it', async () => {
    const store = sessionPaneScenes.running()
    mount(store)

    const pill = await screen.findByRole('button', { name: /Prepare slides/ })
    expect(store.getState().main.detailPane.segment).toBeNull()
    await userEvent.click(pill)

    await waitFor(() => {
      expect(store.getState().main.detailPane).toEqual({
        segment: 'sessionSetup',
        endeavor: { id: slidesEndeavor.id, title: slidesEndeavor.title },
      })
    })
    expect(screen.getByTestId('detail-pane-session')).toBeTruthy()
    // The pill steps back while the pane carries the session.
    expect(
      document
        .querySelector('[data-kro-session-pill-visible]')
        ?.getAttribute('data-kro-session-pill-visible'),
    ).toBe('false')
  })

  it('takes the session out of the pane when the pane is dismissed', async () => {
    const store = sessionPaneScenes.forEndeavor()
    mount(store)
    await screen.findByTestId('detail-pane-session')

    act(() => {
      store.dispatch(userDidDismissDetailPane())
    })
    expect(screen.queryByTestId('detail-pane-session')).toBeNull()
  })

  it('seats the mode toggle as the pane header, centred, in place of a title', async () => {
    const store = sessionPaneScenes.forEndeavor()
    mount(store)
    await screen.findByTestId('detail-pane-session')

    const navigation = await screen.findByTestId(
      'trailing-detail-panel-navigation',
    )
    expect(
      within(navigation).getByRole('group', { name: 'Session mode' }),
    ).toBeTruthy()
    // One toggle only — the body's own header row is gone.
    expect(screen.getAllByRole('group', { name: 'Session mode' })).toHaveLength(
      1,
    )
    expect(
      within(navigation).getByRole('button', { name: 'Close' }),
    ).toBeTruthy()
  })

  it('offers Show sessions for an endeavor and opens its activity in Performance', async () => {
    const store = sessionPaneScenes.forEndeavor()
    mount(store)
    const show = await screen.findByRole('button', { name: 'Show sessions' })
    await userEvent.click(show)
    expect(store.getState().main.detailPane).toEqual({
      segment: 'performance',
      endeavor: { id: slidesEndeavor.id, title: slidesEndeavor.title },
    })
    // A drill-in: Session is on the trail, so there is a way back to it.
    expect(store.getState().main.detailPaneBackStack).toEqual([
      {
        segment: 'sessionSetup',
        endeavor: { id: slidesEndeavor.id, title: slidesEndeavor.title },
      },
    ])
  })

  it('offers no Show sessions for a new, unnamed task — it has no history', async () => {
    const store = sessionPaneScenes.newTask()
    mount(store)
    await waitFor(() => {
      expect(store.getState().session.identity?.isAnonymous).toBe(true)
    })
    expect(screen.queryByRole('button', { name: 'Show sessions' })).toBeNull()
  })

  it('drills into activity with Back, and Back returns to Session', async () => {
    const store = sessionPaneScenes.forEndeavor()
    mount(store)
    await userEvent.click(
      await screen.findByRole('button', { name: 'Show sessions' }),
    )
    const back = await screen.findByRole('button', { name: 'Back' })
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
    await userEvent.click(back)
    await screen.findByTestId('detail-pane-session')
    expect(store.getState().main.detailPane.segment).toBe('sessionSetup')
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy()
  })

  it('centres the session vertically in the pane when it is shorter than it', async () => {
    const store = sessionPaneScenes.forEndeavor()
    mount(store)
    const session = await screen.findByTestId('detail-pane-session')
    expect(session.className).toContain('my-auto')
    expect(
      screen.getByTestId('trailing-detail-panel-content').className,
    ).toContain('min-h-full')
  })

  it('washes the pane from its top edge, behind the header', async () => {
    const store = sessionPaneScenes.forEndeavor()
    mount(store)
    await screen.findByTestId('detail-pane-session')
    const backdrop = screen.getByTestId('trailing-detail-panel-backdrop')
    expect(backdrop.querySelector('[data-kro-session-panel-tint]')).toBeTruthy()
    // Not inside the centred body any more.
    expect(
      screen
        .getByTestId('detail-pane-session')
        .querySelector('[data-kro-session-panel-tint]'),
    ).toBeNull()
  })
})
