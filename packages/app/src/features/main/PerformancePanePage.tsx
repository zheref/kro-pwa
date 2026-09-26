'use client'

/**
 * The Performance segment's stateful half (`RC-37`) — canon #517's
 * `macPerformancePaneContent`, which mounts one of two readings:
 *
 * - pointed at an endeavor: that endeavor's recorded sessions (Endeavor
 *   Activity), reached from the toolbar or Session Setup's "Show sessions";
 * - pointed at the whole day: Day Progress, which the Do rings also open.
 *
 * Reads which reading the pane is on and hands it to its Fragment. Mounted
 * once by the shell's Page.
 */
import { DayProgressPage } from '../dayProgress'
import { EndeavorActivityPage } from '../endeavorActivity'
import { useAppSelector } from '../../library/hooks'
import {
  selectDetailPaneEndeavor,
  selectDetailPaneSegment,
} from './MainSelectors'
import { PerformancePaneFragment } from './PerformancePaneFragment'

export interface PerformancePanePageProps {
  readonly locale?: string
}

export function PerformancePanePage({ locale }: PerformancePanePageProps) {
  const segment = useAppSelector(selectDetailPaneSegment)
  const endeavor = useAppSelector(selectDetailPaneEndeavor)
  const reading =
    segment !== 'performance'
      ? null
      : endeavor === null
        ? 'dayProgress'
        : 'endeavorActivity'

  return (
    <PerformancePaneFragment reading={reading}>
      {/* Mounted only while its reading shows: each Page starts its own
          clock and storage read, which must not run behind another reading. */}
      {reading === 'dayProgress' ? (
        <DayProgressPage locale={locale} />
      ) : reading === 'endeavorActivity' && endeavor !== null ? (
        <EndeavorActivityPage endeavorId={endeavor.id} locale={locale} />
      ) : null}
    </PerformancePaneFragment>
  )
}
