/**
 * The lens panel, in the states its render tests assert (`RC-11`).
 *
 * The "everything shown" and "something hidden" pair is the one that matters:
 * the panel stores `hidden…` and shows "shown", so seeing both states side by
 * side is how a reviewer checks the inversion was applied once rather than
 * twice.
 */
import { EndeavorComputedState, EndeavorHost, EndeavorKind } from '@kro/core'
import { BothSchemes, Stage } from '../../../design/endeavor/storyStage'
import { initialPlanVisibility } from '../PlanState'
import { PlanVisibilityPanelFragment } from './PlanVisibilityPanelFragment'

export default {
  title: 'Plan/Visibility panel',
  component: PlanVisibilityPanelFragment,
}

const panel = (visibility = initialPlanVisibility) => (
  <PlanVisibilityPanelFragment visibility={visibility} onToggle={() => {}} />
)

/** The vista's own defaults — nothing filtered, every switch on. */
export const NothingFiltered = {
  render: () => <Stage width={460}>{panel()}</Stage>,
}

/** One kind hidden — the row inverts, and only that row. */
export const OneKindHidden = {
  render: () => (
    <Stage width={460}>
      {panel({ ...initialPlanVisibility, hiddenKinds: [EndeavorKind.habit] })}
    </Stage>
  ),
}

/** A source and a state hidden together — two families at once. */
export const SourceAndStateHidden = {
  render: () => (
    <Stage width={460}>
      {panel({
        ...initialPlanVisibility,
        hiddenHosts: [EndeavorHost.googleCalendar],
        hiddenComputedStates: [EndeavorComputedState.completedToday],
      })}
    </Stage>
  ),
}

/** Every switch off — the extreme the eye's struck-through glyph reports. */
export const EverythingHidden = {
  render: () => (
    <Stage width={460}>
      {panel({
        ...initialPlanVisibility,
        hiddenKinds: [
          EndeavorKind.calendarEvent,
          EndeavorKind.task,
          EndeavorKind.habit,
          EndeavorKind.reminder,
        ],
        hiddenHosts: [
          EndeavorHost.supabase,
          EndeavorHost.local,
          EndeavorHost.googleCalendar,
        ],
        hiddenComputedStates: [
          EndeavorComputedState.expired,
          EndeavorComputedState.overdue,
          EndeavorComputedState.completedToday,
        ],
      })}
    </Stage>
  ),
}

/** Both schemes — the checked chip is the accent, which inverts with the page. */
export const BothSchemesNothingFiltered = {
  render: () => <BothSchemes>{panel()}</BothSchemes>,
}
