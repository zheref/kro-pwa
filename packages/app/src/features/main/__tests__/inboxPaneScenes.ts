/**
 * The Inbox pane scenes the stories and the render tests share, so a story and
 * its mirroring test can never drive two different panes (`RC-11`, `RC-31`).
 */
import type { UnknownAction } from '@reduxjs/toolkit'
import { makePaneHostStore } from '../../endeavorDetail/pages/__tests__/paneHarness'
import { userDidTapTriage } from '../../capture/CaptureFeature'
import { loadCaptureContextThunk } from '../../capture/CaptureProducer'
import {
  TRIAGE_MOCK_NOW,
  triageEndeavorFixtures,
  triageFixturePool,
} from '../../triage/TriageMocks'
import { userDidSelectDetailPaneSegment } from '../MainFeature'
import { loadShellThunk } from '../MainProducer'

/** A pane host seeded with the Triage fixtures, driven by `intents`. */
export const inboxPaneStore = (
  intents: readonly UnknownAction[],
  triageRowId: string | null = null,
) => {
  const store = makePaneHostStore({
    endeavors: [...triageFixturePool],
    now: TRIAGE_MOCK_NOW,
  })
  void store.dispatch(loadShellThunk()).then(async () => {
    for (const intent of intents) store.dispatch(intent)
    if (triageRowId === null) return
    await store.dispatch(loadCaptureContextThunk({ now: TRIAGE_MOCK_NOW }))
    store.dispatch(
      userDidTapTriage({
        endeavorId: triageRowId,
        now: TRIAGE_MOCK_NOW,
        host: 'pane',
      }),
    )
  })
  return store
}

const openInbox = userDidSelectDetailPaneSegment({ segment: 'inbox' })

export const inboxPaneScenes = {
  /** The toolbar's Inbox: the Inbox page in the pane. */
  inbox: { intents: [openInbox], triageRowId: null },
  /** A row's Triage tapped in the pane: the form over the list. */
  triaging: {
    intents: [openInbox],
    triageRowId: triageEndeavorFixtures.unscheduledTask.id,
  },
  /** The pane on another reading: the Inbox is not mounted. */
  elsewhere: {
    intents: [userDidSelectDetailPaneSegment({ segment: 'plan' })],
    triageRowId: null,
  },
} as const
