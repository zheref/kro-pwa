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

import { useCallback, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '../../../library/hooks'
import { selectLayout } from '../../main/MainSelectors'
import type {
  CaptureTimeEditOutcome,
  CaptureTimeField,
} from '../CaptureFeature'
import {
  userDidBeginTimeEdit,
  userDidDiscardCapture,
  userDidEditTitle,
  userDidEndTimeEdit,
  userDidPickDate,
  userDidPickRecurrence,
  userDidPickRewards,
  userDidPickTime,
  userDidSelectDestination,
  userDidSelectKind,
} from '../CaptureFeature'
import { submitCaptureThunk } from '../CaptureProducer'
import type {
  CaptureDestination,
  CaptureKind,
  CaptureRecurrence,
} from '../CaptureRules'
import {
  selectAvailableCaptureDestinations,
  selectCanSubmitCapture,
  selectCaptureBlockedReason,
  selectCaptureDraft,
} from '../CaptureSelectors'
import { CapturePromptFragment } from './CapturePromptFragment'
import { capturePromptPresentation } from './capturePresentation'

export function CapturePromptPage() {
  const dispatch = useAppDispatch()

  const draft = useAppSelector(selectCaptureDraft)
  const canSubmit = useAppSelector(selectCanSubmitCapture)
  const blockedReason = useAppSelector(selectCaptureBlockedReason)
  const availableDestinations = useAppSelector(
    selectAvailableCaptureDestinations,
  )
  const layout = useAppSelector(selectLayout)

  // O(1) field reads (`RC-5`): the snapshot objects themselves, never a boolean
  // assembled inside the callback. The null check is done here, in the Page.
  const startEdit = useAppSelector((state) => state.capture.prompt?.startEdit)
  const endEdit = useAppSelector((state) => state.capture.prompt?.endEdit)

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

  if (draft === null) return null

  return (
    <CapturePromptFragment
      isOpen
      draft={draft}
      isEditingStartTime={startEdit != null}
      isEditingEndTime={endEdit != null}
      availableDestinations={availableDestinations}
      canSubmit={canSubmit}
      blockedReason={blockedReason}
      presentation={capturePromptPresentation(layout)}
      now={now}
      onEditTitle={(title: string) => dispatch(userDidEditTitle({ title }))}
      onSelectKind={(kind: CaptureKind) =>
        dispatch(userDidSelectKind({ kind }))
      }
      onPickDate={(date: Date) => dispatch(userDidPickDate({ date }))}
      onBeginTimeEdit={(field: CaptureTimeField) =>
        dispatch(userDidBeginTimeEdit({ field }))
      }
      onPickTime={(field: CaptureTimeField, time: Date) =>
        dispatch(userDidPickTime({ field, time }))
      }
      onEndTimeEdit={(
        field: CaptureTimeField,
        outcome: CaptureTimeEditOutcome,
      ) => dispatch(userDidEndTimeEdit({ field, outcome }))}
      onPickRewards={(points: number) =>
        dispatch(userDidPickRewards({ points }))
      }
      onPickRecurrence={(recurrence: CaptureRecurrence) =>
        dispatch(userDidPickRecurrence({ recurrence }))
      }
      onSelectDestination={(destination: CaptureDestination) =>
        dispatch(userDidSelectDestination({ destination }))
      }
      onDiscard={() => dispatch(userDidDiscardCapture())}
      onSubmit={onSubmit}
    />
  )
}
