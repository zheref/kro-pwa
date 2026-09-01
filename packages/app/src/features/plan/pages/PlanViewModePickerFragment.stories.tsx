/**
 * The rotary selector, in the states its render tests assert (`RC-11`).
 *
 * One story per destination, because the whole control is about *which* glyph
 * is in the lens: the tint only appears there, so a single story would show
 * one third of the component's visual contract. The gradient stage is not
 * decoration either — the capsule is glass, and glass on white is invisible.
 */
import { BothSchemes, Stage } from '../../../design/endeavor/storyStage'
import { PlanViewMode } from '../PlanNavigation'
import { PlanViewModePickerFragment } from './PlanViewModePickerFragment'

export default {
  title: 'Plan/View mode picker',
  component: PlanViewModePickerFragment,
}

const picker = (selection: PlanViewMode) => (
  <PlanViewModePickerFragment selection={selection} onSelect={() => {}} />
)

/** Day View in the lens — cyan, with List and the Matrix either side. */
export const DayView = {
  render: () => (
    <Stage gradient width={390}>
      {picker(PlanViewMode.timeline)}
    </Stage>
  ),
}

/** List View in the lens — emerald. */
export const ListView = {
  render: () => (
    <Stage gradient width={390}>
      {picker(PlanViewMode.list)}
    </Stage>
  ),
}

/** Priority Matrix in the lens — orange, and the wrap puts Day View beside it. */
export const PriorityMatrix = {
  render: () => (
    <Stage gradient width={390}>
      {picker(PlanViewMode.priorityMatrix)}
    </Stage>
  ),
}

/** All three at once, so the tint ramp is comparable in one glance. */
export const EveryDestination = {
  render: () => (
    <Stage gradient width={390}>
      {picker(PlanViewMode.timeline)}
      {picker(PlanViewMode.list)}
      {picker(PlanViewMode.priorityMatrix)}
    </Stage>
  ),
}

/** Both schemes — the control forces its own dark environment, as canon does. */
export const BothSchemesDayView = {
  render: () => (
    <BothSchemes gradient>{picker(PlanViewMode.timeline)}</BothSchemes>
  ),
}
