'use client'

/**
 * The session surface's stateful container (`RC-37`; implements `UZF-4`).
 *
 * The only artifact in this lane that calls both `useAppSelector` and
 * `useAppDispatch`. It selects, it dispatches, and it renders exactly one
 * Fragment — the presentation host — with the sheet's content inside it. Every
 * value it passes down came from a named Selector `#21` already exports; nothing
 * here derives anything from `RootState` inline (`RC-5`).
 *
 * ## Which host, decided by the shell's own table
 *
 * `presentationFor(PresentationSurface.session, surface)` is the shell's ported
 * `DoSurfaceLayout` decision — *"is there room beside the content the user is
 * already reading"* — and it is asked here rather than re-derived, so the
 * session sheet and every other two-presentation surface in the app agree about
 * what "desktop" means. Reading a *pure mapping* from a sibling feature is not
 * the cross-slice import `RC-20` forbids: that rule is about one slice reaching
 * into another's **state shape**, and `MainPresentation` holds no state.
 *
 * The `destination` host bypasses the table outright: `/execute` is a page at
 * every width, so it is always the inline column.
 *
 * ## Every clock reading happens here
 *
 * Not one Producer in this feature reads the time — they all take `now`. That is
 * `#21`'s design and this Page is the boundary that honours it: every dispatch
 * below stamps `new Date()` at the call site, so a suite can drive the whole
 * machine with instants of its own choosing.
 */
import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../../../library/hooks'
import {
  PresentationSurface,
  presentationFor,
} from '../../main/MainPresentation'
import { Zap } from 'lucide-react'
import {
  PANEL_TOOLBAR_GLYPH,
  PanelToolbarButton,
} from '../../../design/chrome/panel/TrailingDetailPanel'
import { controlDensity } from '../../../design/system/density'
import { doSurfaceLayout } from '../../main/DoSurfaceLayout'
import { userDidDrillIntoDetailPane } from '../../main/MainFeature'
import { ToolbarSlot } from '../../main/ToolbarSlots'
import { useSurfaceLayout } from '../../main/useSurfaceLayout'
import {
  userDidCancelTitleEdit,
  userDidChangeTitle,
  userDidDismissSymbolPicker,
  userDidSelectMode,
  userDidSelectTargetDuration,
  userDidTapEditTitle,
  userDidTapStartNewSession,
  userDidTapSymbol,
} from '../SessionFeature'
import {
  abortSessionThunk,
  endBreakThunk,
  finishSessionEarlyThunk,
  markEndeavorCompleteFromSessionThunk,
  pauseSessionThunk,
  resumeSessionThunk,
  startBreakThunk,
  startNewSessionThunk,
  startSessionThunk,
  updateSessionIdentityThunk,
} from '../SessionProducer'
import {
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
  selectSessionRemainingDuration,
  selectSessionStatusLabel,
  selectSessionTargetDuration,
  selectTomatoCount,
  selectSessionMarkers,
  selectTomatoRow,
} from '../SessionSelectors'
import { DEFAULT_DURATION_PRESETS } from '../../../design/chrome/dial/DurationDial'
import {
  SessionModeControl,
  SessionSheetFragment,
} from './SessionSheetFragment'
import { SessionSurfaceFragment } from './SessionSurfaceFragment'
import {
  type SessionSuggestion,
  SessionSurfacePresentation,
  sessionPanelTint,
} from './sessionSheetModel'

interface SessionSheetPageCommonProps {
  /**
   * The parallel-task suggestions. Empty in the shipped build — the session
   * slice carries none and sourcing them is another child's lane — but a real
   * prop rather than a hardcoded `[]`, so the day they exist this Page passes
   * them through instead of being rewritten. See `SessionSheetFragment`'s note
   * on the reserved slot.
   */
  readonly suggestions?: readonly SessionSuggestion[]
}

/**
 * **A discriminated union, not one shape with two optional fields.**
 *
 * The two hosts differ in exactly one contract: a `raised` surface is layered
 * over whatever the user was reading and *must* be closable, while a
 * `destination` surface IS the page and can never be closed. Optional
 * `isOpen`/`onRequestClose` let a caller mount a raised surface with no way out
 * — the close button and Escape both become no-ops, and nothing catches it
 * until someone is trapped in it. Splitting the union moves that from a runtime
 * trap to a compile error, and keeps the destination call site as short as it
 * should be (`<SessionSheetPage host="destination" />`).
 */
export type SessionSheetPageProps =
  | (SessionSheetPageCommonProps & {
      /** The surface IS the page, at `/execute`. Never closed. */
      readonly host: 'destination'
    })
  | (SessionSheetPageCommonProps & {
      /**
       * Inside the shell's trailing detail pane (canon #517's Session Setup
       * segment). Like `destination` it has no close of its own — the pane's
       * header owns dismissal, and Escape with it.
       */
      readonly host: 'pane'
    })
  | (SessionSheetPageCommonProps & {
      /** Layered over the route: the pill was tapped, or a countdown ended. */
      readonly host: 'raised'
      readonly isOpen: boolean
      readonly onRequestClose: () => void
    })

const NO_SUGGESTIONS: readonly SessionSuggestion[] = []

/** The `destination` host's non-close. Stable, so it never re-renders the tree. */
const noClose = (): void => {}

export function SessionSheetPage(props: SessionSheetPageProps) {
  const { host, suggestions = NO_SUGGESTIONS } = props
  const isOpen = props.host === 'raised' ? props.isOpen : true
  const onRequestClose =
    props.host === 'raised' ? props.onRequestClose : undefined
  const dispatch = useAppDispatch()
  const surface = useSurfaceLayout()

  const phase = useAppSelector(selectSessionPhase)
  const identity = useAppSelector(selectSessionIdentity)
  const statusLabel = useAppSelector(selectSessionStatusLabel)
  const mode = useAppSelector(selectSessionMode)
  const targetDuration = useAppSelector(selectSessionTargetDuration)
  const elapsedDuration = useAppSelector(selectSessionElapsedDuration)
  const remainingDuration = useAppSelector(selectSessionRemainingDuration)
  const isSessionInFlight = useAppSelector(selectIsSessionInFlight)
  const isEditingTitle = useAppSelector(selectIsEditingSessionTitle)
  const editedTitle = useAppSelector(selectEditedSessionTitle)
  const isEditingSymbol = useAppSelector(selectIsEditingSessionSymbol)
  const tomatoRow = useAppSelector(selectTomatoRow)
  const sessionMarkers = useAppSelector(selectSessionMarkers)
  const completedSessionsCount = useAppSelector(selectTomatoCount)
  const isStopwatchAvailable = useAppSelector(selectIsStopwatchAvailable)
  const areBreaksAvailable = useAppSelector(selectAreBreaksAvailable)

  const presentation =
    host === 'destination' || host === 'pane'
      ? SessionSurfacePresentation.inline
      : presentationFor(PresentationSurface.session, surface).kind === 'sheet'
        ? SessionSurfacePresentation.sheet
        : SessionSurfacePresentation.modal

  const onConfirmTitleEdit = useCallback(() => {
    void dispatch(
      updateSessionIdentityThunk({ title: editedTitle, now: new Date() }),
    )
  }, [dispatch, editedTitle])

  const onPickSymbol = useCallback(
    (symbol: string) => {
      void dispatch(updateSessionIdentityThunk({ symbol, now: new Date() }))
    },
    [dispatch],
  )

  const onTapStartNew = useCallback(() => {
    const now = new Date()
    // The runtime returns to `ready` synchronously; the durable half clears the
    // anchor document, without which a reload would re-present the concluded
    // session as a ghost.
    dispatch(userDidTapStartNewSession({ now }))
    void dispatch(startNewSessionThunk({ now }))
  }, [dispatch])

  // Desktop (pointer-driven) surfaces get the compact controls; touch keeps
  // the regular layout, unchanged.
  const density = controlDensity(doSurfaceLayout(surface).isTouchPrimary)

  const content = (
    <SessionSheetFragment
      phase={phase}
      density={density}
      hidesHeader={host === 'pane'}
      presentation={presentation}
      symbol={identity?.symbol ?? ''}
      title={identity?.title ?? ''}
      statusLabel={statusLabel}
      mode={mode}
      targetDuration={targetDuration}
      elapsedDuration={elapsedDuration}
      remainingDuration={remainingDuration}
      presets={DEFAULT_DURATION_PRESETS}
      suggestions={suggestions}
      isSessionInFlight={isSessionInFlight}
      isEditingTitle={isEditingTitle}
      editedTitle={editedTitle}
      isEditingSymbol={isEditingSymbol}
      tomatoGlyphs={tomatoRow.glyphs}
      sessionMarkers={sessionMarkers}
      tomatoOverflowLabel={tomatoRow.overflowLabel}
      completedSessionsCount={completedSessionsCount}
      isStopwatchAvailable={isStopwatchAvailable}
      areBreaksAvailable={areBreaksAvailable}
      // `/execute` is a page: there is nothing to close, and canon's own
      // `dismissalHint` says so ("Close to dismiss" only where a close
      // exists). The header keeps the 36px slot reserved either way.
      onTapClose={host === 'raised' ? onRequestClose : undefined}
      onTapEditTitle={() => dispatch(userDidTapEditTitle())}
      onChangeTitle={(title) => dispatch(userDidChangeTitle(title))}
      onConfirmTitleEdit={onConfirmTitleEdit}
      onCancelTitleEdit={() => dispatch(userDidCancelTitleEdit())}
      onTapSymbol={() => dispatch(userDidTapSymbol())}
      onPickSymbol={onPickSymbol}
      onDismissSymbolPicker={() => dispatch(userDidDismissSymbolPicker())}
      onSelectMode={(next) => dispatch(userDidSelectMode(next))}
      onAdjustDuration={(seconds) =>
        dispatch(userDidSelectTargetDuration(seconds))
      }
      // No-op until a suggestion source exists — reported as a cross-lane
      // need rather than wired to a guess about which surface owns it.
      onSelectSuggestion={() => {}}
      onTapPlay={() => {
        void dispatch(startSessionThunk({ now: new Date() }))
      }}
      onTapPause={() => {
        void dispatch(pauseSessionThunk({ now: new Date() }))
      }}
      onTapResume={() => {
        void dispatch(resumeSessionThunk({ now: new Date() }))
      }}
      onTapFinishEarly={() => {
        void dispatch(finishSessionEarlyThunk({ now: new Date() }))
      }}
      onTapAbort={() => {
        void dispatch(abortSessionThunk({ now: new Date() }))
      }}
      onTapComplete={() => {
        void dispatch(markEndeavorCompleteFromSessionThunk({ now: new Date() }))
      }}
      onTapStartNew={onTapStartNew}
      onTapBreak={() => {
        void dispatch(startBreakThunk({ now: new Date() }))
      }}
      onTapEndBreak={() => {
        void dispatch(endBreakThunk({ now: new Date() }))
      }}
    />
  )

  // In the trailing pane the pane's glass IS the container: the content sits
  // directly on it, with no second surface in between.
  if (host === 'pane') {
    return (
      <section
        aria-label="Focus session"
        data-kro-session-surface="pane"
        className="relative"
      >
        {/* Canon's side-panel wash: the phase's hue, top-down into nothing —
            painted from the pane's own top edge, behind its header. */}
        <ToolbarSlot placement="detailPaneBackdrop">
          <div
            data-kro-session-panel-tint=""
            className="h-72"
            style={{
              background: `linear-gradient(${sessionPanelTint(phase)}, transparent)`,
            }}
          />
        </ToolbarSlot>
        <div className="relative">{content}</div>

        {/* The pane's header: the mode toggle as its navigation title… */}
        <ToolbarSlot placement="detailPaneTitle">
          <SessionModeControl
            mode={mode}
            density={density}
            isSessionInFlight={isSessionInFlight}
            isStopwatchAvailable={isStopwatchAvailable}
            onSelectMode={(next) => dispatch(userDidSelectMode(next))}
          />
        </ToolbarSlot>

        {/* …and canon's bolt "Show sessions" toolbar item, trailing. Shown
            only for a session with an endeavor to read the history of. */}
        {identity === null || identity.isAnonymous ? null : (
          <ToolbarSlot placement="detailPaneTrailing">
            <PanelToolbarButton
              label="Show sessions"
              data-kro-session-show-sessions=""
              onPress={() =>
                dispatch(
                  // A drill-in: the pane pushes Performance for this endeavor
                  // and its header offers Back to Session.
                  userDidDrillIntoDetailPane({
                    location: {
                      segment: 'performance',
                      endeavor: {
                        id: identity.endeavorId,
                        title: identity.title,
                      },
                    },
                  }),
                )
              }
            >
              <Zap
                aria-hidden="true"
                {...PANEL_TOOLBAR_GLYPH}
                fill="currentColor"
              />
            </PanelToolbarButton>
          </ToolbarSlot>
        )}
      </section>
    )
  }

  return (
    <SessionSurfaceFragment
      presentation={presentation}
      isOpen={isOpen}
      // The `destination` host has no close: it is a page. The union above is
      // what makes the fallback unreachable for `raised`, where a missing
      // handler would mean a surface with no way out.
      onRequestClose={onRequestClose ?? noClose}
      phase={phase}
    >
      {content}
    </SessionSurfaceFragment>
  )
}
