/**
 * The two pane edges the session answers with an EFFECT — canon's Session
 * Setup segment (#517).
 *
 * Pure state coordination between the pane and the session lives in the
 * reducers (the session's slice drops a pending conclusion when the pane
 * leaves Session). What is left here is what a reducer cannot do:
 *
 * - **prepare** — preparing a launch reads storage, so it is a Producer, and
 *   the pane re-pointing is what asks for it;
 * - **raiseSession** — the conclusion arrives from the tick task, and whether
 *   to raise it depends on Endeavor Detail's editor, a third slice's reading
 *   that only the overlay Page may combine (`RC-37`).
 *
 * A pure function of the previous and current readings, one action at most.
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
