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

import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../../../library/hooks'
import { selectLayout } from '../../main/MainSelectors'
import type { CaptureTimeEditOutcome, CaptureTimeField } from '../CaptureFeature'
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

  const onSubmit = useCallback(() => {
    if (draft === null) return
    void dispatch(
      submitCaptureThunk({
        draft,
        // Identity is the composition root's to supply, never the Producer's —
        // the rule `CaptureProducer`'s header states, and the one
        // `MainShellPage` already follows for a new project.
        id: crypto.randomUUID(),
        now: new Date(),
      }),
    )
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
      // The instant "Today" is measured against. Read at render because the
      // prompt is short-lived and always freshly opened; the draft's own
      // committed instants come from the slice, which stamped them with the
      // `now` the opening event carried.
      now={new Date()}
      onEditTitle={(title: string) => dispatch(userDidEditTitle({ title }))}
      onSelectKind={(kind: CaptureKind) => dispatch(userDidSelectKind({ kind }))}
      onPickDate={(date: Date) => dispatch(userDidPickDate({ date }))}
      onBeginTimeEdit={(field: CaptureTimeField) =>
        dispatch(userDidBeginTimeEdit({ field }))
      }
      onPickTime={(field: CaptureTimeField, time: Date) =>
        dispatch(userDidPickTime({ field, time }))
      }
      onEndTimeEdit={(field: CaptureTimeField, outcome: CaptureTimeEditOutcome) =>
        dispatch(userDidEndTimeEdit({ field, outcome }))
      }
      onPickRewards={(points: number) => dispatch(userDidPickRewards({ points }))}
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
