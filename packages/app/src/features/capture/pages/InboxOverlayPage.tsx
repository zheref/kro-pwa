'use client'

/**
 * The Inbox overlay's stateful container (`RC-37`) — the sheet on a handheld,
 * the 560 x 620 popover on a desktop-shaped surface.
 *
 * Mounted globally by `CaptureOverlays`, so a capture routed to the Inbox
 * (`withRouteDelivered`) presents it over whatever the user was looking at,
 * which is canon's behaviour: *"everything else opens the Inbox and never
 * auto-navigates"*.
 *
 * ## It also owns the Undo window
 *
 * Add for Today is confirmed from an Inbox row, so this Page is where the
 * scheduling's ~8 s Undo lives. Two things happen when the window arms:
 *
 *   1. the toast goes up through the chrome kit's host — canon's
 *      `ActionToastModel(message:…, icon: "calendar.badge.plus", iconColor:
 *      .green, iconSize: 16, actionTitle: "Undo", duration: 8)`, field for
 *      field; and
 *   2. a single timer dispatches `onUndoWindowTicked` at the deadline the slice
 *      already computed.
 *
 * The timer is a *view* concern in exactly the sense `MainShellPage`'s routing
 * delay is: the **decision** (when the window closes) is state, computed by
 * `withUndoWindowChecked` against an injected instant, and this only tells the
 * slice that the instant has arrived. Nothing here decides anything, which is
 * why "undo at 7.999 s works, at 8.001 s does not" stays a plain unit test one
 * tier down.
 */

import { useEffect } from 'react'
import { useActiveToasts } from '../../../design/chrome/toast/ActiveToastHost'
import { useAppDispatch, useAppSelector } from '../../../library/hooks'
import { selectSurface } from '../../main/MainSelectors'
import { PresentationSurface, presentationFor } from '../../main/MainPresentation'
import { onUndoWindowTicked } from '../CaptureFeature'
import {
  loadCaptureContextThunk,
  undoScheduleForTodayThunk,
} from '../CaptureProducer'
import {
  selectSchedulingUndo,
  selectUndoSnapshot,
} from '../CaptureSelectors'
import { InboxFragment } from './InboxFragment'
import { schedulingToastMessage } from './capturePresentation'
import { useInboxSurface } from './useInboxSurface'

export function InboxOverlayPage() {
  const dispatch = useAppDispatch()
  const inbox = useInboxSurface()
  const surface = useAppSelector(selectSurface)
  const undo = useAppSelector(selectSchedulingUndo)
  const snapshot = useAppSelector(selectUndoSnapshot)

  const { enqueue, dismiss } = useActiveToasts()

  // The pool every Inbox read sits on. Mounted once with the shell, so the
  // rows are already there the moment a capture routes into the sheet.
  useEffect(() => {
    const effect = dispatch(loadCaptureContextThunk({ now: new Date() }))
    return () => effect.abort()
  }, [dispatch])

  const undoTitle = undo?.title ?? null
  const undoScheduledAtMs = undo?.scheduledAt.getTime() ?? null
  const undoExpiresAtMs = undo?.expiresAt.getTime() ?? null

  useEffect(() => {
    if (
      snapshot === null ||
      undoTitle === null ||
      undoScheduledAtMs === null ||
      undoExpiresAtMs === null
    ) {
      return
    }

    const id = enqueue({
      message: schedulingToastMessage(undoTitle, new Date(undoScheduledAtMs)),
      // Canon draws `calendar.badge.plus`. `ActiveToastInput.icon` is typed to
      // the design system's own `SfSymbolName`, which does not carry that row
      // yet — the endeavor kit's extension map does, and the toast host cannot
      // see it. `calendar` is the nearest symbol both files agree on; folding
      // `calendar.badge.plus` into `design/system/icons/icons.ts` (one line,
      // that lane's) restores canon's glyph with no change here.
      icon: 'calendar',
      iconColor: 'green',
      iconSize: 16,
      // The host clamps into its documented 3–12 s reading window; 8 is canon's
      // `duration: 8` and sits inside it, so the two agree without a cast.
      duration: (undoExpiresAtMs - Date.now()) / 1000,
      primaryAction: {
        title: 'Undo',
        onSelect: () => {
          void dispatch(
            undoScheduleForTodayThunk({ snapshot, now: new Date() }),
          )
          dismiss(id)
        },
      },
    })

    const timer = setTimeout(
      () => dispatch(onUndoWindowTicked({ now: new Date() })),
      Math.max(0, undoExpiresAtMs - Date.now()),
    )

    return () => {
      clearTimeout(timer)
      dismiss(id)
    }
  }, [
    dispatch,
    enqueue,
    dismiss,
    snapshot,
    undoTitle,
    undoScheduledAtMs,
    undoExpiresAtMs,
  ])

  return (
    <InboxFragment
      {...inbox}
      presentation={
        presentationFor(PresentationSurface.inbox, surface).kind === 'popover'
          ? 'popover'
          : 'sheet'
      }
    />
  )
}
