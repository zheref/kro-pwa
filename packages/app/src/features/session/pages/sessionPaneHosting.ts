/**
 * How the session surface and the shell's trailing detail pane stay in step
 * while the pane hosts it — canon's Session Setup segment (#517), reached
 * across two slices.
 *
 * Canon keeps `sessionSetup` inside `MainFeature` and raises it with one
 * Shifter (`applySessionSetupPresentation`). Here the session is its own slice
 * and the pane is the shell's (`RC-20`), so `SessionOverlays` — the Page that
 * may see both — reconciles them. This is the decision half: a pure function of
 * the previous and current readings, one action at most.
 */

/** One render's reading of the two slices. */
export interface SessionPaneHostingSnapshot {
  /** The shell hosts a pane at all (flag on, sidebar shell). */
  readonly isHost: boolean
  readonly paneSegment: 'sessionSetup' | 'performance' | 'plan' | null
  /** The endeavor the pane is pointed at; `null` is a new, arbitrary task. */
  readonly paneEndeavorId: string | null
  /** The session is at `ready` — configuring, nothing running yet. */
  readonly isReady: boolean
  readonly isLoading: boolean
  /** The prepared identity: its endeavor, and whether it is anonymous. */
  readonly identity: {
    readonly endeavorId: string
    readonly isAnonymous: boolean
  } | null
  /** A countdown just ended and wants to be seen. */
  readonly isPresentingConclusion: boolean
  /**
   * Endeavor Detail has an editor open. Raising Session would take the pane
   * from it and discard the unsaved draft, so the pill carries the conclusion.
   */
  readonly isDetailEditorOpen: boolean
}

export type SessionPaneHostingAction =
  /** Set up the session the pane is asking for (`null` = a new task). */
  | { readonly kind: 'prepare'; readonly endeavorId: string | null }
  /** A conclusion arrived while the pane showed something else — raise it. */
  | { readonly kind: 'raiseSession' }
  /** The pane left a conclusion unanswered — flow 7: the pill keeps it. */
  | { readonly kind: 'dismissConclusion' }

/** Whether the prepared identity is the one the pane is asking for. */
const isPreparedFor = (snapshot: SessionPaneHostingSnapshot): boolean => {
  const { identity, paneEndeavorId } = snapshot
  if (identity === null) return false
  return paneEndeavorId === null
    ? identity.isAnonymous
    : !identity.isAnonymous && identity.endeavorId === paneEndeavorId
}

export function sessionPaneHostingAction(
  previous: SessionPaneHostingSnapshot,
  current: SessionPaneHostingSnapshot,
): SessionPaneHostingAction | null {
  if (!current.isHost) return null

  const showsSession = current.paneSegment === 'sessionSetup'
  const showedSession = previous.paneSegment === 'sessionSetup'

  if (
    current.isPresentingConclusion &&
    !previous.isPresentingConclusion &&
    !showsSession &&
    !current.isDetailEditorOpen
  ) {
    return { kind: 'raiseSession' }
  }

  if (showedSession && !showsSession && current.isPresentingConclusion) {
    return { kind: 'dismissConclusion' }
  }

  if (!showsSession || !current.isReady || current.isLoading) return null
  if (isPreparedFor(current)) return null

  // Only on a change worth answering — entering the segment, re-pointing it,
  // or the session coming back to `ready` — so a preparation that failed is
  // not retried on every render.
  const changed =
    !showedSession ||
    previous.paneEndeavorId !== current.paneEndeavorId ||
    !previous.isReady ||
    previous.isLoading
  return changed
    ? { kind: 'prepare', endeavorId: current.paneEndeavorId }
    : null
}
