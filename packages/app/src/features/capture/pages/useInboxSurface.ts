'use client'

/**
 * The Inbox's stateful wrapper (`UZF-4`) — the headless hook both Inbox Pages
 * sit on.
 *
 * Two Pages render this surface: the overlay (`InboxOverlayPage`, the sheet or
 * the 560 x 620 popover a capture routes into) and the destination
 * (`InboxDestinationPage`, the sidebar's "Jot Down" page). They differ only in
 * their chrome, so the selection and the intent wiring live here once rather
 * than being copied and then drifting the first time one of them is edited.
 *
 * It holds **no `useState`** (`RC-4`): every value is read through a named
 * Selector and every intent is a dispatch. The one non-reactive value it keeps
 * is a mount-time instant, and only as a fallback — see `now` below.
 */

import type { EndeavorOperation } from '@kro/core'
import { useCallback, useMemo, useRef } from 'react'
import {
  type EndeavorCardModel,
  endeavorCardModelFrom,
} from '../../../design/endeavor/endeavorCardModel'
import { useAppDispatch, useAppSelector } from '../../../library/hooks'
import { selectLayout } from '../../main/MainSelectors'
import {
  userDidCancelAddForToday,
  userDidDismissInbox,
  userDidRequestAddForToday,
  userDidTapTriage,
  userDidAdjustAddForTodayTime,
} from '../CaptureFeature'
import type { CaptureAddForTodayState } from '../CaptureFeature'
import {
  applyInboxOperationThunk,
  scheduleForTodayThunk,
} from '../CaptureProducer'
import {
  selectAddForToday,
  selectInboxTotalCount,
  selectInboxVista,
  selectIsInboxEmpty,
  selectIsInboxOpen,
  selectJustCreatedEndeavor,
  selectPendingTriageEndeavors,
} from '../CaptureSelectors'
import { type InboxRowLayout, inboxRowLayoutFor } from './capturePresentation'

export interface InboxSurfaceViewModel {
  readonly isOpen: boolean
  readonly justCreated: EndeavorCardModel | null
  readonly pendingTriage: readonly EndeavorCardModel[]
  readonly totalCount: number
  readonly isEmpty: boolean
  readonly capabilities: ReturnType<typeof selectInboxVista>['capabilities']
  readonly rowLayout: InboxRowLayout
  readonly addForToday: CaptureAddForTodayState | null
  readonly now: Date

  readonly onDismiss: () => void
  readonly onTapTriage: (endeavorId: string) => void
  readonly onRequestAddForToday: (endeavorId: string) => void
  readonly onAdjustAddForTodayTime: (time: Date) => void
  readonly onCancelAddForToday: () => void
  readonly onConfirmAddForToday: () => void
  readonly onOperation: (
    operation: EndeavorOperation,
    endeavorId: string,
  ) => void
}

export function useInboxSurface(): InboxSurfaceViewModel {
  const dispatch = useAppDispatch()

  const isOpen = useAppSelector(selectIsInboxOpen)
  const justCreatedEndeavor = useAppSelector(selectJustCreatedEndeavor)
  const pendingTriageEndeavors = useAppSelector(selectPendingTriageEndeavors)
  const totalCount = useAppSelector(selectInboxTotalCount)
  const isEmpty = useAppSelector(selectIsInboxEmpty)
  const vista = useAppSelector(selectInboxVista)
  const addForToday = useAppSelector(selectAddForToday)
  const layout = useAppSelector(selectLayout)

  /**
   * The instant the rows are classified against.
   *
   * The slice already parks one — `clockAnchor`, re-stamped by every event that
   * carries a `now` — so the view reads that rather than a clock, exactly as
   * `CaptureSelectors`' header describes. An O(1) field read is all `RC-5`
   * allows in a `useAppSelector` callback, and all this needs.
   *
   * The `useRef` is the fallback for the one window where the anchor is still
   * `null`: the first paint, before the context load lands. A ref rather than
   * state because it must not trigger a render, and never a bare `new Date()`
   * in the render body — that would make every re-render a different `now` and
   * every memoized card model a fresh object.
   */
  const mountedAt = useRef(new Date())
  const anchoredAt = useAppSelector((state) => state.capture.clockAnchor)
  const now = anchoredAt ?? mountedAt.current

  const nowMs = now.getTime()

  const justCreated = useMemo(
    () =>
      justCreatedEndeavor === null
        ? null
        : endeavorCardModelFrom(justCreatedEndeavor, new Date(nowMs)),
    [justCreatedEndeavor, nowMs],
  )

  const pendingTriage = useMemo(
    () =>
      pendingTriageEndeavors.map((endeavor) =>
        endeavorCardModelFrom(endeavor, new Date(nowMs)),
      ),
    [pendingTriageEndeavors, nowMs],
  )

  const onDismiss = useCallback(() => {
    dispatch(userDidDismissInbox())
  }, [dispatch])

  const onTapTriage = useCallback(
    (endeavorId: string) => {
      // `now` is read here, at the moment of the tap: canon seeds the Triage
      // form with `nextFreeSlotToday` computed against today's events **as they
      // stand right then**, which a render-time instant could not give.
      dispatch(userDidTapTriage({ endeavorId, now: new Date() }))
    },
    [dispatch],
  )

  const onRequestAddForToday = useCallback(
    (endeavorId: string) => {
      dispatch(userDidRequestAddForToday({ endeavorId, now: new Date() }))
    },
    [dispatch],
  )

  const onAdjustAddForTodayTime = useCallback(
    (time: Date) => {
      dispatch(userDidAdjustAddForTodayTime({ time }))
    },
    [dispatch],
  )

  const onCancelAddForToday = useCallback(() => {
    dispatch(userDidCancelAddForToday())
  }, [dispatch])

  const onConfirmAddForToday = useCallback(() => {
    if (addForToday === null) return
    void dispatch(
      scheduleForTodayThunk({
        endeavorId: addForToday.endeavorId,
        scheduledAt: addForToday.pickedTime,
        now: new Date(),
      }),
    )
  }, [dispatch, addForToday])

  const onOperation = useCallback(
    (operation: EndeavorOperation, endeavorId: string) => {
      void dispatch(
        applyInboxOperationThunk({ operation, endeavorId, now: new Date() }),
      )
    },
    [dispatch],
  )

  return {
    isOpen,
    justCreated,
    pendingTriage,
    totalCount,
    isEmpty,
    capabilities: vista.capabilities,
    rowLayout: inboxRowLayoutFor(layout),
    addForToday,
    now,
    onDismiss,
    onTapTriage,
    onRequestAddForToday,
    onAdjustAddForTodayTime,
    onCancelAddForToday,
    onConfirmAddForToday,
    onOperation,
  }
}
