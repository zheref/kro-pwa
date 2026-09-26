'use client'

/**
 * The Day Progress stateful container (`RC-37`). Stamps "today" on mount and
 * ticks the clock every minute after, loads today (again whenever the clock
 * crosses midnight), aborts the read on unmount — cancellation is the one
 * silent exit — reads everything through named Selectors, and renders the one
 * Fragment. Not mounted by any route: the shell portals it into the detail
 * pane.
 */
import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../library/hooks'
import {
  onDayProgressClockTicked,
  onDayProgressRequested,
  userDidSelectDay,
  userDidTapNextWeek,
  userDidTapPreviousWeek,
} from '../DayProgressFeature'
import { loadDayProgressThunk } from '../DayProgressProducer'
import {
  selectCanPageToNextWeek,
  selectCanPageToPreviousWeek,
  selectDayProgressException,
  selectIsDayProgressLoading,
  selectSelectedDay,
  selectSelectedDayActivity,
  selectSelectedDayRelation,
  selectSelectedDayRings,
  selectWeekCells,
} from '../DayProgressSelectors'
import { DayProgressFragment } from './DayProgressFragment'

/** How often an open pane checks whether the day rolled over. */
export const DAY_PROGRESS_TICK_MS = 60_000

export interface DayProgressPageProps {
  /** BCP 47 locale for dates and times; defaults to `en-US`. */
  readonly locale?: string
}

export function DayProgressPage({ locale }: DayProgressPageProps) {
  const dispatch = useAppDispatch()
  const selectedDay = useAppSelector(selectSelectedDay)
  const relation = useAppSelector(selectSelectedDayRelation)
  const weekCells = useAppSelector(selectWeekCells)
  const canPageToPreviousWeek = useAppSelector(selectCanPageToPreviousWeek)
  const canPageToNextWeek = useAppSelector(selectCanPageToNextWeek)
  const rings = useAppSelector(selectSelectedDayRings)
  const activity = useAppSelector(selectSelectedDayActivity)
  const isLoading = useAppSelector(selectIsDayProgressLoading)
  const exception = useAppSelector(selectDayProgressException)

  // An O(1) field read; the Shifters keep the same Date until midnight.
  const today = useAppSelector((state) => state.dayProgress.today)

  useEffect(() => {
    dispatch(onDayProgressRequested({ today: new Date() }))
    const timer = setInterval(() => {
      dispatch(onDayProgressClockTicked({ now: new Date() }))
    }, DAY_PROGRESS_TICK_MS)
    return () => clearInterval(timer)
  }, [dispatch])

  // Keyed on `today`, so this runs on open and again only when an open pane
  // rolls over at midnight — never on an ordinary tick.
  useEffect(() => {
    if (today === null) return
    const effect = dispatch(loadDayProgressThunk({ now: new Date() }))
    return () => effect.abort()
  }, [dispatch, today])

  const onSelectDay = useCallback(
    (day: Date) => dispatch(userDidSelectDay({ day })),
    [dispatch],
  )
  const onPreviousWeek = useCallback(
    () => dispatch(userDidTapPreviousWeek()),
    [dispatch],
  )
  const onNextWeek = useCallback(
    () => dispatch(userDidTapNextWeek()),
    [dispatch],
  )

  return (
    <DayProgressFragment
      locale={locale}
      selectedDay={selectedDay}
      relation={relation}
      weekCells={weekCells}
      canPageToPreviousWeek={canPageToPreviousWeek}
      canPageToNextWeek={canPageToNextWeek}
      rings={rings}
      activity={activity}
      isLoading={isLoading}
      exception={exception}
      onSelectDay={onSelectDay}
      onPreviousWeek={onPreviousWeek}
      onNextWeek={onNextWeek}
    />
  )
}
