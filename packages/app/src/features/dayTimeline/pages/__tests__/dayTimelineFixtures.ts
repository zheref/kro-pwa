/**
 * Fragment props for a canned state, derived through the real Selectors so
 * stories and render tests show exactly what the Page would hand down
 * (`RC-31`). The root is a real store's, so the hour band is Plan's default
 * (the full day) exactly as the Page reads it.
 */
import { makeStore, stubbedThunkExtra } from '../../../../library/store'
import { selectPlanHourBand } from '../../../plan/PlanSelectors'
import type { DayTimelineState } from '../../DayTimelineFeature'
import {
  selectDayTimelineDay,
  selectDayTimelineFailureCopy,
  selectDayTimelineNow,
  selectTodayTimelinePlacements,
} from '../../DayTimelineSelectors'
import type { DayTimelineFragmentProps } from '../DayTimelineFragment'

export const fragmentPropsFor = (
  state: DayTimelineState,
): DayTimelineFragmentProps => {
  const root = {
    ...makeStore(stubbedThunkExtra).getState(),
    dayTimeline: state,
  }
  return {
    day: selectDayTimelineDay(root),
    now: selectDayTimelineNow(root),
    band: selectPlanHourBand(root),
    placements: selectTodayTimelinePlacements(root),
    failureCopy: selectDayTimelineFailureCopy(root),
  }
}
