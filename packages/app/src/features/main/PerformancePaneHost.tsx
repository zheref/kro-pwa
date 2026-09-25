'use client'

/**
 * The trailing detail pane's Performance segment — canon #517's
 * `macPerformancePaneContent`, which mounts one of two readings:
 *
 * - pointed at an endeavor: that endeavor's recorded sessions (Endeavor
 *   Activity), reached from the toolbar or Session Setup's "Show sessions";
 * - pointed at the whole day: Day Progress, which the Do rings also open.
 *
 * A composition, not a feature: it reads which reading the shell's pane is on
 * and portals that feature's Page into the pane body. Mounted once by the
 * shell's Page, the same way `ProfileControlPage` is.
 */
import { DayProgressPage } from '../dayProgress'
import { EndeavorActivityPage } from '../endeavorActivity'
import { useAppSelector } from '../../library/hooks'
import {
  selectDetailPaneEndeavor,
  selectDetailPaneSegment,
} from './MainSelectors'
import { ToolbarSlot } from './ToolbarSlots'

export interface PerformancePaneHostProps {
  readonly locale?: string
}

export function PerformancePaneHost({ locale }: PerformancePaneHostProps) {
  const segment = useAppSelector(selectDetailPaneSegment)
  const endeavor = useAppSelector(selectDetailPaneEndeavor)

  if (segment !== 'performance') return null

  return (
    <ToolbarSlot placement="detailPane">
      <div
        data-testid="detail-pane-performance"
        data-reading={endeavor === null ? 'dayProgress' : 'endeavorActivity'}
        className="flex flex-col pb-kro-medium"
      >
        {endeavor === null ? (
          <DayProgressPage locale={locale} />
        ) : (
          <EndeavorActivityPage endeavorId={endeavor.id} locale={locale} />
        )}
      </div>
    </ToolbarSlot>
  )
}
