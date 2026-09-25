'use client'

/**
 * The Day Progress stateful container (`RC-37`). Stamps "today" and starts
 * the load on mount (aborting on unmount — cancellation is the one silent
 * exit), reads everything through named Selectors, and renders the one
 * Fragment. Not mounted by any route: the shell portals it into the detail
 * pane.
 */
import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../library/hooks'
import {
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

  useEffect(() => {
    const now = new Date()
    dispatch(onDayProgressRequested({ today: now }))
    const effect = dispatch(loadDayProgressThunk({ now }))
    return () => effect.abort()
  }, [dispatch])

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
