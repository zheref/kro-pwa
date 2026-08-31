/**
 * The five-day picker, in the states its render tests assert (`RC-11`).
 *
 * The four-way contrast rule is the reason there are this many: the selected
 * fill, today crimson, and the two together are three different answers, and
 * the only way to see all three at once is three chips in one batch.
 */
import { BothSchemes, Stage } from '../../../design/endeavor/storyStage'
import { addingPlanDays, startOfPlanDay } from '../PlanCalendar'
import { PLAN_REFERENCE_DAY, PLAN_REFERENCE_NOW } from '../PlanMocks'
import { planDayPickerDates } from '../PlanNavigation'
import { PlanDayPickerFragment } from './PlanDayPickerFragment'

export default {
  title: 'Plan/Day picker',
  component: PlanDayPickerFragment,
}

const today = startOfPlanDay(PLAN_REFERENCE_DAY)
const dates = planDayPickerDates(today)

const picker = (selectedDate: Date) => (
  <PlanDayPickerFragment
    dates={dates}
    selectedDate={selectedDate}
    now={PLAN_REFERENCE_NOW}
    onSelectDate={() => {}}
    onStepDay={() => {}}
  />
)

/** Today selected — the case where crimson and the inverted fill collide. */
export const TodaySelected = {
  render: () => <Stage width={390}>{picker(today)}</Stage>,
}

/** Today visible but NOT selected — crimson at full strength. */
export const TodayUnselected = {
  render: () => <Stage width={390}>{picker(addingPlanDays(today, 2))}</Stage>,
}

/** A past day selected, so the selection sits at the batch leading edge. */
export const PastDaySelected = {
  render: () => <Stage width={390}>{picker(addingPlanDays(today, -2))}</Stage>,
}

/** Both schemes: the fill inverts, and both crimsons have to survive it. */
export const BothSchemesTodaySelected = {
  render: () => <BothSchemes>{picker(today)}</BothSchemes>,
}

/** At desktop width the seven columns stretch — the chips must not stretch with them. */
export const DesktopWidth = {
  render: () => <Stage width={720}>{picker(today)}</Stage>,
}
