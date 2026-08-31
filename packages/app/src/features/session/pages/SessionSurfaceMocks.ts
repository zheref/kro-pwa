/**
 * The render tier's canned props (`RC-31`, `UZF-18`).
 *
 * **Every variant is derived from a `sessionStateMocks` entry through the real
 * Selectors.** That is the whole design: `SessionMocks.ts` already guarantees
 * each state is one the phase machine can actually reach (it builds them by
 * running the real Shifters), and running the real Selectors over it guarantees
 * the *props* are ones the Page would actually pass. A hand-written prop object
 * could show a sheet in `running` with a Mark-complete button, or a pill tinted
 * green while paused — combinations no dispatch can produce, snapshotted as if
 * they were real.
 *
 * Stories and render tests consume the same entries, so a story and its
 * mirroring test cannot drift (`RC-11`).
 */
import type { RootState } from '../../../library/store'
import { initialAuthState } from '../../auth/AuthState'
import { initialCaptureState } from '../../capture/CaptureFeature'
import { initialDoState } from '../../do/DoFeature'
import { initialEarnState } from '../../earn/EarnFeature'
import { initialEndeavorDetailState } from '../../endeavorDetail/EndeavorDetailState'
import { initialFindState } from '../../find/FindState'
import { initialGreetingState } from '../../greeting/GreetingFeature'
import { initialMainState } from '../../main/MainFeature'
import { initialPlanState } from '../../plan/PlanState'
import { initialPlatformState } from '../../platform/PlatformFeature'
import { initialTriageState } from '../../triage/TriageFeature'
import { DEFAULT_DURATION_PRESETS } from '../../../design/chrome/dial/DurationDial'
import { sessionStateMocks } from '../SessionMocks'
import {
  type SessionPillState,
  selectAreBreaksAvailable,
  selectEditedSessionTitle,
  selectIsEditingSessionSymbol,
  selectIsEditingSessionTitle,
  selectIsSessionInFlight,
  selectIsStopwatchAvailable,
  selectSessionElapsedDuration,
  selectSessionIdentity,
  selectSessionMode,
  selectSessionPhase,
  selectSessionPillState,
  selectSessionRemainingDuration,
  selectSessionStatusLabel,
  selectSessionTargetDuration,
  selectTomatoCount,
  selectTomatoRow,
} from '../SessionSelectors'
import type { SessionState } from '../SessionState'
import type { SessionSheetFragmentProps } from './SessionSheetFragment'
import {
  type SessionSuggestion,
  SessionSurfacePresentation,
} from './sessionSheetModel'

/** The other twelve slices, present only because `RootState` names them. */
export const rootStateWithSession = (session: SessionState): RootState => ({
  greeting: initialGreetingState,
  do: initialDoState,
  capture: initialCaptureState,
  triage: initialTriageState,
  plan: initialPlanState,
  find: initialFindState,
  endeavorDetail: initialEndeavorDetailState,
  earn: initialEarnState,
  platform: initialPlatformState,
  session,
  auth: initialAuthState,
  main: initialMainState,
})

const noop = () => {}

/** Three suggestions, so the scrolling row is exercised as well as the copy. */
export const sessionSuggestionMocks: readonly SessionSuggestion[] = [
  {
    id: 'suggestion-inbox',
    symbol: '📥',
    title: 'Clear the inbox',
    duration: 900,
    rewardPoints: 12,
  },
  {
    id: 'suggestion-notes',
    symbol: '✍️',
    title: 'Write the release notes',
    duration: 5_400,
    rewardPoints: 0,
  },
  {
    id: 'suggestion-call',
    symbol: '📞',
    title: 'Call the supplier back about the delayed shipment',
    duration: null,
    rewardPoints: 4,
  },
]

/** Exactly one, so the centred single-suggestion branch is exercised. */
export const singleSessionSuggestion: readonly SessionSuggestion[] = [
  sessionSuggestionMocks[0] as SessionSuggestion,
]

/**
 * The sheet's props for one canned state — every value through its Selector,
 * every callback a no-op a story or a test replaces.
 */
export const sheetPropsFor = (
  session: SessionState,
  overrides: Partial<SessionSheetFragmentProps> = {},
): SessionSheetFragmentProps => {
  const root = rootStateWithSession(session)
  const identity = selectSessionIdentity(root)
  return {
    phase: selectSessionPhase(root),
    presentation: SessionSurfacePresentation.sheet,
    symbol: identity?.symbol ?? '',
    title: identity?.title ?? '',
    statusLabel: selectSessionStatusLabel(root),
    mode: selectSessionMode(root),
    targetDuration: selectSessionTargetDuration(root),
    elapsedDuration: selectSessionElapsedDuration(root),
    remainingDuration: selectSessionRemainingDuration(root),
    presets: DEFAULT_DURATION_PRESETS,
    suggestions: [],
    isSessionInFlight: selectIsSessionInFlight(root),
    isEditingTitle: selectIsEditingSessionTitle(root),
    editedTitle: selectEditedSessionTitle(root),
    isEditingSymbol: selectIsEditingSessionSymbol(root),
    tomatoGlyphs: selectTomatoRow(root).glyphs,
    tomatoOverflowLabel: selectTomatoRow(root).overflowLabel,
    completedSessionsCount: selectTomatoCount(root),
    isStopwatchAvailable: selectIsStopwatchAvailable(root),
    areBreaksAvailable: selectAreBreaksAvailable(root),
    onTapClose: noop,
    onTapEditTitle: noop,
    onChangeTitle: noop,
    onConfirmTitleEdit: noop,
    onCancelTitleEdit: noop,
    onTapSymbol: noop,
    onPickSymbol: noop,
    onDismissSymbolPicker: noop,
    onSelectMode: noop,
    onAdjustDuration: noop,
    onSelectSuggestion: noop,
    onTapPlay: noop,
    onTapPause: noop,
    onTapResume: noop,
    onTapFinishEarly: noop,
    onTapAbort: noop,
    onTapComplete: noop,
    onTapStartNew: noop,
    onTapBreak: noop,
    onTapEndBreak: noop,
    ...overrides,
  }
}

/** The pill's surface for one canned state — `selectSessionPillState`, whole. */
export const pillStateFor = (session: SessionState): SessionPillState =>
  selectSessionPillState(rootStateWithSession(session))

/**
 * One entry per user-visible state the sheet claims to support.
 *
 * The names say which canned session each came from, so a reader can follow a
 * story back to the Shifters that produced it.
 */
export const sessionSheetMocks = {
  /** Ready, countdown, `statusQuo` gates — the shipped opening state. */
  ready: sheetPropsFor(sessionStateMocks.ready),
  /** Ready, with three parallel-task suggestions in the reserved slot. */
  readyWithSuggestions: sheetPropsFor(sessionStateMocks.ready, {
    suggestions: sessionSuggestionMocks,
  }),
  /** Ready with both session flags on — the mode toggle offers Stopwatch. */
  readyEverythingOn: sheetPropsFor(sessionStateMocks.readyEverythingOn),
  /** Ready on a blank focus session, before an edit promotes it. */
  readyAnonymous: sheetPropsFor(sessionStateMocks.readyAnonymous),
  /** The title editor open, prefilled from the identity. */
  editingTitle: sheetPropsFor(sessionStateMocks.editingTitle),
  /** Running, ten minutes into a 25-minute countdown. */
  running: sheetPropsFor(sessionStateMocks.running),
  /** Running, with a single centred "maybe do this next" suggestion. */
  runningWithNextSuggestion: sheetPropsFor(sessionStateMocks.running, {
    suggestions: singleSessionSuggestion,
  }),
  /** Running against an endeavor with twelve recorded sessions. */
  runningTomatoOverflow: sheetPropsFor(sessionStateMocks.running, {
    tomatoGlyphs: 10,
    tomatoOverflowLabel: '× 12',
    completedSessionsCount: 12,
  }),
  /** Paused ten minutes in — every fragment closed, the figure frozen. */
  paused: sheetPropsFor(sessionStateMocks.paused),
  /** Paused, on the desktop's inline column, so the hint reads "Close to …". */
  pausedInline: sheetPropsFor(sessionStateMocks.paused, {
    presentation: SessionSurfacePresentation.inline,
    onTapClose: undefined,
  }),
  /** The countdown reached zero — Complete / Start New, breaks gated off. */
  concluded: sheetPropsFor(sessionStateMocks.concluded),
  /** The same conclusion with the break flag on — all three choices. */
  concludedWithBreak: sheetPropsFor(sessionStateMocks.concluded, {
    areBreaksAvailable: true,
  }),
  /** A conclusion whose endeavor has a title long enough to wrap. */
  concludedLongTitle: sheetPropsFor(sessionStateMocks.concluded, {
    title: 'Prepare the quarterly review deck and rehearse the narrative',
  }),
  /** A break running, two minutes in. */
  onBreak: sheetPropsFor(sessionStateMocks.onBreak),
  /** The same break, thirty seconds from its end. */
  breakNearlyOver: sheetPropsFor(sessionStateMocks.onBreak, {
    remainingDuration: 30,
  }),
  /** A break on the desktop column. */
  breakInline: sheetPropsFor(sessionStateMocks.onBreak, {
    presentation: SessionSurfacePresentation.inline,
    onTapClose: undefined,
  }),
} satisfies Record<string, SessionSheetFragmentProps>

/** One entry per pill state the affordance diagram names. */
export const sessionPillMocks = {
  /** Running — green glass, pause. */
  running: pillStateFor(sessionStateMocks.running),
  /** Paused — untinted glass, resume. */
  paused: pillStateFor(sessionStateMocks.paused),
  /** On a break — beige glass, "Break" in place of the title, pause. */
  onBreak: pillStateFor(sessionStateMocks.onBreak),
  /** Concluded and dismissed — untinted glass, the blue checkmark. */
  concluded: pillStateFor(sessionStateMocks.concludedDismissed),
  /** Ready — hidden, and offering nothing. */
  hidden: pillStateFor(sessionStateMocks.ready),
} satisfies Record<string, SessionPillState>
