/**
 * The Plan LIST canvas, in the states its render tests assert (`RC-11`).
 *
 * Every scene is built by running `planListSections` over the lane's own
 * fixtures, so a story cannot show a grouping the Selectors could not produce
 * (`RC-31`). The pairs are deliberate: the temporal scene is what the default
 * preference shows, the two grouped scenes are what the preference changes to,
 * and the touch/pointer pair is the one acceptance criterion a screenshot can
 * actually carry — the same bindings, two grammars.
 */
import { PlanListGrouping, PlanListSort } from '@kro/core'
import type { ReactNode } from 'react'
import { Stage } from '../../../../design/endeavor/storyStage'
import { planListSections } from './planListModel'
import { PlanListFragment } from './PlanListFragment'
import {
  PLAN_LIST_NOW,
  planListCapabilitiesFixture,
  planListMixedDay,
  planListProjectDay,
  planListTimeOfDayDay,
} from './planListMocks'

export default {
  title: 'Plan/List canvas',
  component: PlanListFragment,
  parameters: { layout: 'fullscreen' },
}

/** A window tall enough to scroll in, so the canvas is judged as a canvas. */
function Viewport({ children }: { readonly children: ReactNode }) {
  return (
    <div style={{ height: 620, display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  )
}

const canvas = (
  overrides: Partial<Parameters<typeof PlanListFragment>[0]> = {},
) => (
  <Viewport>
    <PlanListFragment
      sections={planListSections({
        endeavors: planListMixedDay,
        grouping: PlanListGrouping.none,
        now: PLAN_LIST_NOW,
      })}
      capabilities={planListCapabilitiesFixture}
      grouping={PlanListGrouping.none}
      sort={PlanListSort.time}
      now={PLAN_LIST_NOW}
      input="touch"
      topInsetPx={16}
      bottomInsetPx={102}
      onSelectGrouping={() => {}}
      onSelectSort={() => {}}
      onOperation={() => {}}
      onOpenDetail={() => {}}
      {...overrides}
    />
  </Viewport>
)

/** The default preference: four temporal buckets, one of them live. */
export const UngroupedDay = {
  render: () => <Stage>{canvas()}</Stage>,
}

/** The same day, dark. */
export const UngroupedDayDark = {
  render: () => <Stage theme="dark">{canvas()}</Stage>,
}

/** `plan.listGrouping = project` — the same rows, regrouped by project id. */
export const GroupedByProject = {
  render: () => (
    <Stage>
      {canvas({
        grouping: PlanListGrouping.project,
        sections: planListSections({
          endeavors: planListProjectDay,
          grouping: PlanListGrouping.project,
          now: PLAN_LIST_NOW,
        }),
      })}
    </Stage>
  ),
}

/** `plan.listGrouping = timeOfDay` — morning, afternoon, evening. */
export const GroupedByTimeOfDay = {
  render: () => (
    <Stage>
      {canvas({
        grouping: PlanListGrouping.timeOfDay,
        sections: planListSections({
          endeavors: planListTimeOfDayDay,
          grouping: PlanListGrouping.timeOfDay,
          now: PLAN_LIST_NOW,
        }),
      })}
    </Stage>
  ),
}

/**
 * The desktop grammar: the same vista bindings, drawn as a hover strip and a
 * right-click menu instead of swipe surfaces.
 */
export const PointerRows = {
  render: () => <Stage>{canvas({ input: 'pointer' })}</Stage>,
}

/** A day with nothing on it — the honest empty state, not four empty headers. */
export const EmptyDay = {
  render: () => <Stage>{canvas({ sections: [] })}</Stage>,
}
