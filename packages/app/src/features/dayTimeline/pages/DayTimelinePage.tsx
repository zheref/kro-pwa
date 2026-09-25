'use client'

/**
 * The Day Timeline stateful container (`RC-37`). Stamps the clock on mount
 * and every minute after, loads today (again whenever the clock crosses
 * midnight), aborts the read on unmount — cancellation is the one silent
 * exit — and renders the one Fragment.
 *
 * The hour band is Plan's `selectPlanHourBand` (a Page may compose root
 * Selectors), so the pane honours the same day-range preference as the Plan
 * tab. Not mounted by any route: the shell hosts it in the detail pane.
 *
 * There is no scroll-to-now: Plan's canvas has no such mechanism to reuse.
 */
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../library/hooks'
import { selectPlanHourBand } from '../../plan/PlanSelectors'
import { selectBlankSessionTargetDuration } from '../../session/SessionSelectors'
import { onClockTicked, onViewLoaded } from '../DayTimelineFeature'
import { loadDayTimelineThunk } from '../DayTimelineProducer'
import {
  selectDayTimelineDay,
  selectDayTimelineFailureCopy,
  selectDayTimelineNow,
  selectDayTimelinePlacements,
} from '../DayTimelineSelectors'
import { DayTimelineFragment } from './DayTimelineFragment'

/** How often the now line moves — canon's one-minute timeline tick. */
export const DAY_TIMELINE_TICK_MS = 60_000

export interface DayTimelinePageProps {
  /** BCP 47 locale; reserved for parity with the sibling pane pages. */
  readonly locale?: string
  /**
   * Start the previewed session — the host opens Session Setup. Without it
   * the timeline previews nothing.
   */
  readonly onStartSession?: () => void
}

export function DayTimelinePage({
  locale,
  onStartSession,
}: DayTimelinePageProps = {}) {
  const dispatch = useAppDispatch()
  const band = useAppSelector(selectPlanHourBand)
  const now = useAppSelector(selectDayTimelineNow)
  const day = useAppSelector(selectDayTimelineDay)
  const placements = useAppSelector((state) =>
    selectDayTimelinePlacements(state, band),
  )
  const failureCopy = useAppSelector(selectDayTimelineFailureCopy)
  const sessionPreviewSeconds = useAppSelector(selectBlankSessionTargetDuration)

  useEffect(() => {
    dispatch(onViewLoaded({ now: new Date() }))
    const timer = setInterval(() => {
      dispatch(onClockTicked({ now: new Date() }))
    }, DAY_TIMELINE_TICK_MS)
    return () => clearInterval(timer)
  }, [dispatch])

  // `day` is memoised per calendar day, so this reruns only at midnight.
  useEffect(() => {
    if (day === null) return
    const effect = dispatch(loadDayTimelineThunk({ day }))
    return () => effect.abort()
  }, [dispatch, day])

  return (
    <DayTimelineFragment
      day={day}
      now={now}
      band={band}
      placements={placements}
      failureCopy={failureCopy}
      sessionPreviewSeconds={sessionPreviewSeconds}
      onStartSession={onStartSession}
      locale={locale}
    />
  )
}
