/**
 * The pane's web-only Inbox segment — mirrors `InboxPanePage.stories.tsx`
 * scene for scene (`RC-11`), then walks one triage through end to end.
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installRadixEnvironment } from '../../../design/system/primitives/__tests__/radixEnvironment'
import { PaneFrame } from '../../endeavorDetail/pages/__tests__/paneHarness'
import { Harness } from '../../find/pages/__tests__/pagesHarness'
import { triageEndeavorFixtures } from '../../triage/TriageMocks'
import { InboxPanePage } from '../InboxPanePage'
import { inboxPaneScenes, inboxPaneStore } from './inboxPaneScenes'

beforeEach(() => {
  installRadixEnvironment()
})
afterEach(cleanup)

const mount = (key: keyof typeof inboxPaneScenes) => {
  const { intents, triageRowId } = inboxPaneScenes[key]
  const store = inboxPaneStore(intents, triageRowId)
  render(
    <Harness store={store}>
      <PaneFrame>
        <InboxPanePage locale="en-US" />
      </PaneFrame>
    </Harness>,
  )
  return store
}

const { unscheduledTask, habit } = triageEndeavorFixtures

describe('InboxPanePage', () => {
  it('shows the real Inbox in the pane, headed by the pane rather than itself', async () => {
    mount('inbox')
    const surface = await screen.findByTestId('inbox-surface')
    expect(surface.getAttribute('data-kro-presentation')).toBe('pane')
    expect(
      await screen.findByRole('button', {
        name: `Triage ${unscheduledTask.title}`,
      }),
    ).toBeTruthy()
    // Canon's kind gate: a habit never queues.
    expect(
      screen.queryByRole('button', { name: `Triage ${habit.title}` }),
    ).toBeNull()
  })

  it('opens a row’s Triage over the list, inside the pane', async () => {
    const store = mount('triaging')
    await screen.findByTestId('triage-form')
    expect(screen.getByTestId('triage-pane')).toBeTruthy()
    expect(store.getState().triage.presentation).toBe('pane')
    expect(store.getState().capture.inbox.isOpen).toBe(false)
    // The list stands down, so the layer fills the pane body alone.
    expect(
      screen.queryByRole('button', { name: `Triage ${unscheduledTask.title}` }),
    ).toBeNull()
  })

  it('mounts nothing while the pane is on another reading', async () => {
    const store = mount('elsewhere')
    await waitFor(() =>
      expect(store.getState().main.detailPane.segment).toBe('plan'),
    )
    expect(screen.queryByTestId('detail-pane-inbox')).toBeNull()
  })

  it('starts Triage from a row tap and returns to the Inbox once decided', async () => {
    const store = mount('inbox')
    fireEvent.click(
      await screen.findByRole('button', {
        name: `Triage ${unscheduledTask.title}`,
      }),
    )
    await screen.findByTestId('triage-form')
    expect(store.getState().capture.triageRequest).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /archive/i }))
    fireEvent.click(await screen.findByTestId('triage-confirm'))

    await waitFor(() => expect(screen.queryByTestId('triage-form')).toBeNull())
    expect(store.getState().main.detailPane.segment).toBe('inbox')
    await waitFor(() =>
      expect(
        screen.queryByRole('button', {
          name: `Triage ${unscheduledTask.title}`,
        }),
      ).toBeNull(),
    )
  })

  it('backs out of Triage to the same Inbox list', async () => {
    mount('triaging')
    await screen.findByTestId('triage-form')
    fireEvent.click(screen.getByTestId('triage-back'))
    await waitFor(() => expect(screen.queryByTestId('triage-form')).toBeNull())
    expect(screen.getByTestId('inbox-surface')).toBeTruthy()
  })
})
