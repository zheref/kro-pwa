/**
 * The session feature's render tier — a pure re-export barrel.
 *
 * `apps/web` reaches the three artifacts it mounts through here: the Execute
 * destination's body, the shell-level overlays, and (for a story or a test) the
 * Fragments underneath them. Nothing else in this package imports the render
 * tier, so this file is the whole seam between the session's logic and its
 * pixels.
 */
export {
  type SessionSheetFragmentProps,
  SessionSheetFragment,
} from './SessionSheetFragment'
export {
  type SessionPillFragmentProps,
  SessionPillFragment,
} from './SessionPillFragment'
export {
  type SessionSurfaceFragmentProps,
  SessionSurfaceFragment,
} from './SessionSurfaceFragment'
export { type SessionSheetPageProps, SessionSheetPage } from './SessionSheetPage'
export { SessionDestinationPage } from './SessionDestinationPage'
export { SessionOverlays } from './SessionOverlays'
export {
  SESSION_PILL_BOX,
  SESSION_SLOT_HEIGHT,
  type SessionDialState,
  type SessionSuggestion,
  SessionSurfacePresentation,
  areSessionSuggestionsInteractive,
  formatSessionDurationShort,
  sessionDialState,
  sessionDismissalHint,
  sessionPillTint,
  sessionSuggestionsHeading,
  sessionSurfaceTint,
} from './sessionSheetModel'
