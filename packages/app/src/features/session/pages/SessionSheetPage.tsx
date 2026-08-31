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
  selectTomatoRow,
} from '../SessionSelectors'
import { DEFAULT_DURATION_PRESETS } from '../../../design/chrome/dial/DurationDial'
import { SessionSheetFragment } from './SessionSheetFragment'
import { SessionSurfaceFragment } from './SessionSurfaceFragment'
import {
  type SessionSuggestion,
  SessionSurfacePresentation,
} from './sessionSheetModel'

export interface SessionSheetPageProps {
  /**
   * `raised` — the surface is layered over whatever the user was reading (the
   * pill was tapped, or a countdown concluded). `destination` — the surface IS
   * the page, at `/execute`.
   */
  readonly host: 'raised' | 'destination'
  /** Ignored by the `destination` host, which is never closed. */
  readonly isOpen?: boolean
  readonly onRequestClose?: () => void
  /**
   * The parallel-task suggestions. Empty in the shipped build — the session
   * slice carries none and sourcing them is another child's lane — but a real
   * prop rather than a hardcoded `[]`, so the day they exist this Page passes
   * them through instead of being rewritten. See `SessionSheetFragment`'s note
   * on the reserved slot.
   */
  readonly suggestions?: readonly SessionSuggestion[]
}

const NO_SUGGESTIONS: readonly SessionSuggestion[] = []

export function SessionSheetPage({
  host,
  isOpen = true,
  onRequestClose,
  suggestions = NO_SUGGESTIONS,
}: SessionSheetPageProps) {
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
  const completedSessionsCount = useAppSelector(selectTomatoCount)
  const isStopwatchAvailable = useAppSelector(selectIsStopwatchAvailable)
  const areBreaksAvailable = useAppSelector(selectAreBreaksAvailable)

  const presentation =
    host === 'destination'
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

  return (
    <SessionSurfaceFragment
      presentation={presentation}
      isOpen={isOpen}
      onRequestClose={onRequestClose ?? (() => {})}
      phase={phase}
    >
      <SessionSheetFragment
        phase={phase}
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
        tomatoOverflowLabel={tomatoRow.overflowLabel}
        completedSessionsCount={completedSessionsCount}
        isStopwatchAvailable={isStopwatchAvailable}
        areBreaksAvailable={areBreaksAvailable}
        // `/execute` is a page: there is nothing to close, and canon's own
        // `dismissalHint` says so ("Close to dismiss" only where a close
        // exists). The header keeps the 36px slot reserved either way.
        onTapClose={host === 'destination' ? undefined : onRequestClose}
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
          void dispatch(
            markEndeavorCompleteFromSessionThunk({ now: new Date() }),
          )
        }}
        onTapStartNew={onTapStartNew}
        onTapBreak={() => {
          void dispatch(startBreakThunk({ now: new Date() }))
        }}
        onTapEndBreak={() => {
          void dispatch(endBreakThunk({ now: new Date() }))
        }}
      />
    </SessionSurfaceFragment>
  )
}
