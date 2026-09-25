'use client'

/**
 * The trailing detail pane's Plan segment when it is pointed at no endeavor —
 * canon #517's `macReadOnlyTimeline`: today's timeline, the same canvas the
 * Plan tab draws, with no way to edit it.
 *
 * With an endeavor, Plan shows that endeavor's details instead; those are
 * hosted by Endeavor Detail's own overlay, so this host steps aside.
 *
 * Its canvas previews a session started now; Start drills into Session
 * Setup for a new task, and Back returns to the timeline.
 *
 * A composition, not a feature: mounted once by the shell's Page, the same
 * way `PerformancePaneHost` is.
 */
import { DayTimelinePage } from '../dayTimeline'
import { useAppDispatch, useAppSelector } from '../../library/hooks'
import { userDidDrillIntoDetailPane } from './MainFeature'
import {
  selectDetailPaneEndeavor,
  selectDetailPaneSegment,
} from './MainSelectors'
import { ToolbarSlot } from './ToolbarSlots'

export interface TimelinePaneHostProps {
  readonly locale?: string
}

export function TimelinePaneHost({ locale }: TimelinePaneHostProps) {
  const dispatch = useAppDispatch()
  const segment = useAppSelector(selectDetailPaneSegment)
  const endeavor = useAppSelector(selectDetailPaneEndeavor)

  if (segment !== 'plan' || endeavor !== null) return null

  return (
    <ToolbarSlot placement="detailPane">
      <div
        data-testid="detail-pane-timeline"
        className="flex flex-col pb-kro-medium"
      >
        <DayTimelinePage
          locale={locale}
          // The previewed session is a new, arbitrary task. Start drills into
          // Session Setup for it, so Back returns to the timeline.
          onStartSession={() =>
            dispatch(
              userDidDrillIntoDetailPane({
                location: { segment: 'sessionSetup', endeavor: null },
              }),
            )
          }
        />
      </div>
    </ToolbarSlot>
  )
}
