'use client'

/**
 * The Plan segment's stateful half when the pane is pointed at no endeavor
 * (`RC-37`) — canon #517's `macReadOnlyTimeline`: today's timeline, the same
 * canvas the Plan tab draws, with no way to edit it.
 *
 * With an endeavor, Plan shows that endeavor's details instead; those are
 * hosted by Endeavor Detail's own overlay, so this Page steps aside.
 *
 * Its canvas previews a session started now; Start drills into Session Setup
 * for a new task, and Back returns to the timeline. Mounted once by the
 * shell's Page.
 */
import { DayTimelinePage } from '../dayTimeline'
import { useAppDispatch, useAppSelector } from '../../library/hooks'
import { userDidDrillIntoDetailPane } from './MainFeature'
import {
  selectDetailPaneEndeavor,
  selectDetailPaneSegment,
} from './MainSelectors'
import { TimelinePaneFragment } from './TimelinePaneFragment'

export interface TimelinePanePageProps {
  readonly locale?: string
}

export function TimelinePanePage({ locale }: TimelinePanePageProps) {
  const dispatch = useAppDispatch()
  const segment = useAppSelector(selectDetailPaneSegment)
  const endeavor = useAppSelector(selectDetailPaneEndeavor)

  return (
    <TimelinePaneFragment isShown={segment === 'plan' && endeavor === null}>
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
    </TimelinePaneFragment>
  )
}
