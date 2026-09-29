'use client'

/**
 * The capture prompt's stateful container (`RC-37`).
 *
 * Selects, dispatches, renders one Fragment and owns no markup of its own.
 * Every value it forwards comes from a named Selector; the two "is this picker
 * open" flags are derived from the slice's own snapshots
 * (`prompt.startEdit` / `prompt.endEdit`) rather than held here, because the
 * snapshot IS the evidence an edit is in flight — see `withTimeEditBegun`.
 *
 * The prompt is mounted globally by `CaptureOverlays` and renders nothing while
 * `capture.prompt` is `null`, so any surface can open it by dispatching
 * `userDidRequestCapture` without owning a sheet of its own — which is what
 * lets the Plan timeline's press-to-create (KC-IS-#19) reuse it unchanged.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { useAppDispatch, useAppSelector } from '../../../library/hooks'
import { selectLayout } from '../../main/MainSelectors'
import type {
  CapturePromptPanel,
  CaptureTimeEditOutcome,
  CaptureTimeField,
} from '../CaptureFeature'
import {
  userDidBeginTimeEdit,
  userDidClearDate,
  userDidDiscardCapture,
  userDidEditTitle,
  userDidEndTimeEdit,
  userDidPickDate,
  userDidPickDuration,
  userDidPickEmoji,
  userDidPickRecurrence,
  userDidPickRewards,
  userDidPickTime,
  userDidPickSuggestion,
  userDidPickValue,
  userDidToggleSuggestion,
  userDidSelectDestination,
  userDidSelectKind,
  userDidSetPanel,
} from '../CaptureFeature'
import {
  addSuggestionsThunk,
  setSuggestionsShownThunk,
  submitCaptureThunk,
} from '../CaptureProducer'
import type {
  CaptureDestination,
  CaptureKind,
  CaptureRecurrence,
} from '../CaptureRules'
import {
  selectCanSubmitCapture,
  selectCaptureBlocker,
  selectCaptureStatusReason,
  selectCanShowCaptureSuggestions,
  selectCaptureSuggestions,
  selectIsCaptureSuggestionsShown,
  selectSelectedSuggestionIds,
  selectSuggestionsToAdd,
  selectCaptureDestinationsForKind,
  selectCaptureDraft,
  selectCaptureResolvedSymbol,
  selectIsCaptureValueRequired,
  selectAreCaptureKeyboardAcceleratorsEnabled,
  selectCaptureKindCapabilities,
  selectCaptureOpenPanel,
  selectIsAddingCaptureSuggestions,
  selectIsEditingCaptureEndTime,
  selectIsEditingCaptureStartTime,
} from '../CaptureSelectors'
import {
  CapturePromptFragment,
  type CapturePromptFragmentProps,
} from './CapturePromptFragment'
import { capturePromptPresentation } from './capturePresentation'

/** Past the 270ms trailing exit, before anyone would notice a lingering layer. */
const EXIT_FALLBACK_MS = 400

export function CapturePromptPage() {
  const dispatch = useAppDispatch()

  const draft = useAppSelector(selectCaptureDraft)
  const canSubmit = useAppSelector(selectCanSubmitCapture)
  // The status line: a multi-add's tally while it stands, else the blocker.
  const blockedReason = useAppSelector(selectCaptureStatusReason)
  const suggestions = useAppSelector(selectCaptureSuggestions)
  const canToggleSuggestions = useAppSelector(selectCanShowCaptureSuggestions)
  const isSuggestionsShown = useAppSelector(selectIsCaptureSuggestionsShown)
  const selectedSuggestionIds = useAppSelector(selectSelectedSuggestionIds)
  const suggestionsToAdd = useAppSelector(selectSuggestionsToAdd)
  const blocker = useAppSelector(selectCaptureBlocker)
  const availableDestinations = useAppSelector(selectCaptureDestinationsForKind)
  const resolvedSymbol = useAppSelector(selectCaptureResolvedSymbol)
  const isValueRequired = useAppSelector(selectIsCaptureValueRequired)
  const layout = useAppSelector(selectLayout)

  // The one exclusive editor (`UZF-9`), read through its named Selectors.
  const openPanel = useAppSelector(selectCaptureOpenPanel)
  const isEditingStartTime = useAppSelector(selectIsEditingCaptureStartTime)
  const isEditingEndTime = useAppSelector(selectIsEditingCaptureEndTime)
  const capabilities = useAppSelector(selectCaptureKindCapabilities)
  const isAddingSuggestions = useAppSelector(selectIsAddingCaptureSuggestions)
  const keyboardAccelerators = useAppSelector(
    selectAreCaptureKeyboardAcceleratorsEnabled,
  )

  /**
   * The instant the date chip is read against.
   *
   * The slice already parks one — `clockAnchor`, re-stamped by every event that
   * carries a `now`, including `userDidRequestCapture` — so the view reads that
   * rather than the wall clock. A `new Date()` in the render body would be a
   * different instant on every keystroke, which is both a clock read in a
   * render (the thing this feature's whole logic tier is built to avoid) and a
   * fresh object that defeats every memo below it.
   *
   * The `useRef` covers the one window where the anchor is still `null` — the
   * first paint of a store nothing has been asked of yet. Same shape, and same
   * reasoning, as `useInboxSurface`.
   */
  const mountedAt = useRef(new Date())
  const anchoredAt = useAppSelector((state) => state.capture.clockAnchor)
  const now = anchoredAt ?? mountedAt.current

  /**
   * One capture per press.
   *
   * The write is asynchronous and `submitCaptureThunk` deliberately has no
   * `.pending` arm — the slice keeps the prompt exactly as the user left it so
   * a failed capture can be retried without re-typing — so Add stays enabled
   * while the first write is in flight and a second press would mint a second
   * id and persist a duplicate row. A ref rather than state because this is not
   * feature state (`RC-4`): it is one press's own lifetime, it must not paint,
   * and it is cleared when the write settles either way so a retry after a
   * failure still works.
   */
  const isSubmitting = useRef(false)

  const onSubmit = useCallback(() => {
    if (draft === null || isSubmitting.current) return
    isSubmitting.current = true
    void dispatch(
      submitCaptureThunk({
        draft,
        // Identity is the composition root's to supply, never the Producer's —
        // the rule `CaptureProducer`'s header states, and the one
        // `MainShellPage` already follows for a new project.
        id: crypto.randomUUID(),
        now: new Date(),
      }),
    ).finally(() => {
      isSubmitting.current = false
    })
  }, [dispatch, draft])

  /**
   * One multi-add at a time. The in-flight write is the slice's
   * (`isAddingSuggestions`, `RC-24`), and the thunk's own `condition` refuses a
   * second press synchronously — so this handler holds no ref of its own.
   */
  const onAddSuggestions = useCallback(() => {
    if (suggestionsToAdd.length === 0) return
    void dispatch(
      addSuggestionsThunk({
        items: suggestionsToAdd.map((item) => ({
          ...item,
          // Identity is the composition root's to supply (`CaptureProducer`).
          id: crypto.randomUUID(),
        })),
        now: new Date(),
      }),
    )
  }, [dispatch, suggestionsToAdd])

  const isOpen =
    draft !== null && resolvedSymbol !== null && capabilities !== null
  const props: CapturePromptFragmentProps | null = !isOpen
    ? null
    : {
        isOpen: true,
        draft,
        isEditingStartTime,
        isEditingEndTime,
        openPanel,
        onSetPanel: (panel: CapturePromptPanel | null) =>
          dispatch(userDidSetPanel({ panel })),
        capabilities,
        keyboardAccelerators,
        availableDestinations,
        resolvedSymbol,
        isValueRequired,
        canSubmit,
        blockedReason,
        blocker,
        presentation: capturePromptPresentation(layout),
        now,
        onEditTitle: (title: string) => dispatch(userDidEditTitle({ title })),
        onSelectKind: (kind: CaptureKind) =>
          dispatch(userDidSelectKind({ kind })),
        onPickDate: (date: Date) => dispatch(userDidPickDate({ date })),
        onClearDate: () => dispatch(userDidClearDate()),
        onBeginTimeEdit: (field: CaptureTimeField) =>
          dispatch(userDidBeginTimeEdit({ field })),
        onPickTime: (field: CaptureTimeField, time: Date) =>
          dispatch(userDidPickTime({ field, time })),
        onEndTimeEdit: (
          field: CaptureTimeField,
          outcome: CaptureTimeEditOutcome,
        ) => dispatch(userDidEndTimeEdit({ field, outcome })),
        onPickRewards: (points: number) =>
          dispatch(userDidPickRewards({ points })),
        onPickValue: (value: number | null) =>
          dispatch(userDidPickValue({ value })),
        onPickDuration: (seconds: number | null) =>
          dispatch(userDidPickDuration({ seconds })),
        onPickEmoji: (emoji: string) => dispatch(userDidPickEmoji({ emoji })),
        suggestions,
        selectedSuggestionIds,
        suggestionAddCount: suggestionsToAdd.length,
        isAddingSuggestions,
        onPickSuggestion: (suggestionId: string) =>
          dispatch(userDidPickSuggestion({ suggestionId, now: new Date() })),
        onToggleSuggestion: (suggestionId: string) =>
          dispatch(userDidToggleSuggestion({ suggestionId })),
        onAddSuggestions,
        canToggleSuggestions,
        isSuggestionsShown,
        onToggleSuggestions: () =>
          void dispatch(
            setSuggestionsShownThunk({ shown: !isSuggestionsShown }),
          ),
        onPickRecurrence: (recurrence: CaptureRecurrence) =>
          dispatch(userDidPickRecurrence({ recurrence })),
        onSelectDestination: (destination: CaptureDestination) =>
          dispatch(userDidSelectDestination({ destination })),
        onDiscard: () => dispatch(userDidDiscardCapture()),
        onSubmit,
      }

  /**
   * The exit snapshot. Every close path (Discard, Escape, the overlay, Add,
   * multi-add) sets `capture.prompt` to `null` — so if this Page stopped
   * rendering, the Dialog would unmount on the same commit and Radix's Presence
   * would never get to play `kro-trailing-out`. Instead the last open props are
   * kept (the way the suggestions pane keeps its last list) and rendered with
   * `isOpen={false}`: the content stays mounted with `data-state="closed"`
   * until its exit animation ends, then Presence removes it.
   *
   * Kept in a layout effect, never written during render, and kept INERT: every
   * callback is swapped for a no-op, so a click that lands on the leaving
   * prompt during its 270ms exit cannot submit, discard or edit a draft that is
   * already gone. The snapshot is view plumbing, not feature state (`RC-4`).
   */
  const lastOpenProps = useRef<CapturePromptFragmentProps | null>(null)
  useLayoutEffect(() => {
    if (props !== null) lastOpenProps.current = inertPromptProps(props)
  })
  // Presence unmounts on `animationend`, which a hidden tab never delivers. So
  // the snapshot is also dropped shortly after the 270ms exit — the same
  // fallback the suggestions pane keeps — and the Dialog unmounts with it.
  const [, setExitSettled] = useState(0)
  useEffect(() => {
    if (isOpen || lastOpenProps.current === null) return
    const fallback = setTimeout(() => {
      lastOpenProps.current = null
      setExitSettled((settled) => settled + 1)
    }, EXIT_FALLBACK_MS)
    return () => clearTimeout(fallback)
  }, [isOpen])

  if (props === null) {
    const frozen = lastOpenProps.current
    return frozen === null ? null : (
      <CapturePromptFragment {...frozen} isOpen={false} />
    )
  }
  return <CapturePromptFragment {...props} />
}

const noop = () => {}

/**
 * A leaving prompt's props: the same values, every callback a no-op. What the
 * user sees during the exit is the last frame; nothing on it acts any more.
 */
export function inertPromptProps(
  props: CapturePromptFragmentProps,
): CapturePromptFragmentProps {
  return Object.fromEntries(
    Object.entries(props).map(([key, value]) => [
      key,
      typeof value === 'function' ? noop : value,
    ]),
  ) as unknown as CapturePromptFragmentProps
}
