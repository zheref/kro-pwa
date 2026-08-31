/**
 * The add-existing picker, in the states its render tests assert (`RC-11`).
 *
 * The scene that carries the acceptance criterion is `SelectionAtTheCap`: it
 * is the only one that shows what a user actually sees when the seventh task is
 * chosen — the notice, and the rows that stop responding.
 */
import { PlanListGrouping } from '@kro/core'
import type { ReactNode } from 'react'
import { Stage } from '../../../../design/endeavor/storyStage'
import { PickEndeavorFragment } from './PickEndeavorFragment'
import { PLAN_PICKER_NOW, planPickerPool } from './planPickerMocks'

export default {
  title: 'Plan/Add existing picker',
  component: PickEndeavorFragment,
  parameters: { layout: 'fullscreen' },
}

/** The panel is a sheet or a popover in production; both are a bounded box. */
function Panel({ children }: { readonly children: ReactNode }) {
  return (
    <div style={{ width: 460, height: 620, display: 'flex' }}>{children}</div>
  )
}

const picker = (
  overrides: Partial<Parameters<typeof PickEndeavorFragment>[0]> = {},
) => (
  <Panel>
    <PickEndeavorFragment
      quadrant="prioritize"
      endeavors={planPickerPool}
      grouping={PlanListGrouping.none}
      now={PLAN_PICKER_NOW}
      onConfirm={() => {}}
      onDismiss={() => {}}
      onViewDetail={() => {}}
      {...overrides}
    />
  </Panel>
)

/** Nothing chosen yet: Confirm is disabled and says what blocks it. */
export const NothingSelected = {
  render: () => <Stage>{picker()}</Stage>,
}

/** The same panel, dark. */
export const NothingSelectedDark = {
  render: () => <Stage theme="dark">{picker()}</Stage>,
}

/**
 * The cap, reached.
 *
 * Storybook's play function is what puts the panel in this state at capture
 * time — the selection is the Fragment own, so a story cannot fake it by
 * passing a prop, which is the point: the screenshot shows the real rule.
 */
export const SelectionAtTheCap = {
  render: () => <Stage>{picker()}</Stage>,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const rows = canvasElement.querySelectorAll<HTMLButtonElement>(
      '[data-testid="pick-endeavor-toggle"]',
    )
    for (let index = 0; index < 7; index += 1) rows[index]?.click()
  },
}

/** Grouped inside each band, which is what the Project preference does here. */
export const GroupedByProject = {
  render: () => <Stage>{picker({ grouping: PlanListGrouping.project })}</Stage>,
}

/** Nothing to pick at all — canon own "No tasks available" state. */
export const EmptyPool = {
  render: () => <Stage>{picker({ endeavors: [] })}</Stage>,
}
