/**
 * Fragment props for a canned state, derived through the real Selectors so
 * stories and render tests show exactly what the Page would hand down
 * (`RC-31`).
 */
import type { TimelineHourBand } from '../../../plan/TimelineSlots'
import type { DayTimelineState } from '../../DayTimelineFeature'
import {
  selectDayTimelineDay,
  selectDayTimelineFailureCopy,
  selectDayTimelineNow,
  selectDayTimelinePlacements,
} from '../../DayTimelineSelectors'
import type { DayTimelineFragmentProps } from '../DayTimelineFragment'

export const DAY_TIMELINE_FULL_BAND: TimelineHourBand = {
  start: 0,
  endExclusive: 24,
}

export const fragmentPropsFor = (
  state: DayTimelineState,
  band: TimelineHourBand = DAY_TIMELINE_FULL_BAND,
): DayTimelineFragmentProps => {
  const root = { dayTimeline: state }
  return {
    day: selectDayTimelineDay(root),
    now: selectDayTimelineNow(root),
    band,
    placements: selectDayTimelinePlacements(root, band),
    failureCopy: selectDayTimelineFailureCopy(root),
  }
}
