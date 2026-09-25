/**
 * The session ↔ pane reconciliation decision — pure (`RC-56`): a previous and
 * a current reading go in, at most one action comes out.
 */
import { describe, expect, it } from 'vitest'
import {
  type SessionPaneHostingSnapshot,
  sessionPaneHostingAction,
} from '../sessionPaneHosting'

const hidden: SessionPaneHostingSnapshot = {
  isHost: true,
  paneSegment: null,
  paneEndeavorId: null,
  isReady: true,
  isLoading: false,
  identity: null,
  isPresentingConclusion: false,
  isDetailEditorOpen: false,
}
const slides = { endeavorId: 'e-slides', isAnonymous: false }
const anonymous = { endeavorId: 'anon-1', isAnonymous: true }
const onSession = (
  overrides: Partial<SessionPaneHostingSnapshot> = {},
): SessionPaneHostingSnapshot => ({
  ...hidden,
  paneSegment: 'sessionSetup',
  ...overrides,
})

describe('preparing the session the pane asks for', () => {
  it('sets up the endeavor Execute opened Session on', () => {
    expect(
      sessionPaneHostingAction(
        hidden,
        onSession({ paneEndeavorId: 'e-slides' }),
      ),
    ).toEqual({ kind: 'prepare', endeavorId: 'e-slides' })
  })

  it('sets up a new, arbitrary task when Session opens with no endeavor', () => {
    expect(sessionPaneHostingAction(hidden, onSession())).toEqual({
      kind: 'prepare',
      endeavorId: null,
    })
  })

  it('re-prepares when the pane is re-pointed at another endeavor', () => {
    const before = onSession({ paneEndeavorId: 'e-slides', identity: slides })
    expect(
      sessionPaneHostingAction(before, { ...before, paneEndeavorId: 'e-walk' }),
    ).toEqual({ kind: 'prepare', endeavorId: 'e-walk' })
  })

  it('does nothing once the identity already matches', () => {
    const ready = onSession({ paneEndeavorId: 'e-slides', identity: slides })
    expect(sessionPaneHostingAction(hidden, ready)).toBeNull()
    const blank = onSession({ identity: anonymous })
    expect(sessionPaneHostingAction(hidden, blank)).toBeNull()
  })

  it('never re-prepares over a session that is running or loading', () => {
    expect(
      sessionPaneHostingAction(
        hidden,
        onSession({
          paneEndeavorId: 'e-walk',
          identity: slides,
          isReady: false,
        }),
      ),
    ).toBeNull()
    expect(
      sessionPaneHostingAction(hidden, onSession({ isLoading: true })),
    ).toBeNull()
  })

  it('does not retry a failed preparation on every render', () => {
    const failed = onSession({ paneEndeavorId: 'e-gone' })
    expect(sessionPaneHostingAction(failed, failed)).toBeNull()
  })

  it('prepares again when a finished session comes back to ready', () => {
    const concluded = onSession({
      paneEndeavorId: 'e-walk',
      identity: slides,
      isReady: false,
    })
    expect(
      sessionPaneHostingAction(concluded, { ...concluded, isReady: true }),
    ).toEqual({ kind: 'prepare', endeavorId: 'e-walk' })
  })
})

describe('a conclusion raises the pane', () => {
  it('raises Session when a countdown ends while the pane is hidden', () => {
    expect(
      sessionPaneHostingAction(hidden, {
        ...hidden,
        isReady: false,
        isPresentingConclusion: true,
      }),
    ).toEqual({ kind: 'raiseSession' })
  })

  it('raises Session over Plan or Performance too', () => {
    const onPlan = { ...hidden, paneSegment: 'plan' as const }
    expect(
      sessionPaneHostingAction(onPlan, {
        ...onPlan,
        isPresentingConclusion: true,
      }),
    ).toEqual({ kind: 'raiseSession' })
  })

  it('does nothing when Session is already showing the conclusion', () => {
    const showing = onSession({ isReady: false })
    expect(
      sessionPaneHostingAction(showing, {
        ...showing,
        isPresentingConclusion: true,
      }),
    ).toBeNull()
  })
})

describe('a conclusion never takes the pane from an open Detail editor', () => {
  const onPlanEditing = {
    ...hidden,
    paneSegment: 'plan' as const,
    isDetailEditorOpen: true,
  }

  it('leaves the conclusion to the pill while Detail has an editor open', () => {
    expect(
      sessionPaneHostingAction(onPlanEditing, {
        ...onPlanEditing,
        isPresentingConclusion: true,
      }),
    ).toBeNull()
  })

  it('still raises Session over Detail when no editor is open', () => {
    const reading = { ...onPlanEditing, isDetailEditorOpen: false }
    expect(
      sessionPaneHostingAction(reading, {
        ...reading,
        isPresentingConclusion: true,
      }),
    ).toEqual({ kind: 'raiseSession' })
  })

  it('does not raise late when the editor closes after the conclusion arrived', () => {
    const concluded = { ...onPlanEditing, isPresentingConclusion: true }
    expect(
      sessionPaneHostingAction(concluded, {
        ...concluded,
        isDetailEditorOpen: false,
      }),
    ).toBeNull()
  })
})

describe('leaving a conclusion unanswered', () => {
  const concluded = onSession({ isReady: false, isPresentingConclusion: true })

  // Reducer-tier now (the session slice follows the shell's events), so the
  // effect's decision stays silent — see `SessionPaneRelease.test`.
  it('asks for nothing when the pane is dismissed', () => {
    expect(
      sessionPaneHostingAction(concluded, { ...concluded, paneSegment: null }),
    ).toBeNull()
  })

  it('asks for nothing when the pane moves to Plan', () => {
    expect(
      sessionPaneHostingAction(concluded, {
        ...concluded,
        paneSegment: 'plan',
      }),
    ).toBeNull()
  })

  it('does nothing when there was no conclusion to leave', () => {
    const running = onSession({ isReady: false })
    expect(
      sessionPaneHostingAction(running, { ...running, paneSegment: null }),
    ).toBeNull()
  })
})

describe('outside the pane host', () => {
  it('does nothing on the tab-bar shell or with the flag off', () => {
    expect(
      sessionPaneHostingAction(hidden, { ...onSession(), isHost: false }),
    ).toBeNull()
    expect(
      sessionPaneHostingAction(hidden, {
        ...hidden,
        isHost: false,
        isPresentingConclusion: true,
      }),
    ).toBeNull()
  })

  it('does nothing while the pane shows something else', () => {
    const onPlan = { ...hidden, paneSegment: 'plan' as const }
    expect(sessionPaneHostingAction(hidden, onPlan)).toBeNull()
  })

  it('does nothing when neither side moved', () => {
    expect(sessionPaneHostingAction(hidden, hidden)).toBeNull()
  })
})
