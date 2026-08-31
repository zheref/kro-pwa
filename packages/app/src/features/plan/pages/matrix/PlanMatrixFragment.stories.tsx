/**
 * The priority matrix, in the states its render tests assert (`RC-11`).
 *
 * Every scene runs #18's own `planMatrixItems` over #18's own fixture list, so
 * a story cannot show a card the admission rule would refuse (`RC-31`) — which
 * is exactly what makes the "one card in each of the four quadrants" scene
 * evidence rather than decoration.
 */
import type { ReactNode } from 'react'
import { Stage } from '../../../../design/endeavor/storyStage'
import { planMatrixItems } from '../../PlanMatrix'
import { PLAN_REFERENCE_NOW, planMatrixFixtureList } from '../../PlanMocks'
import { PlanMatrixFragment } from './PlanMatrixFragment'

export default {
  title: 'Plan/Priority matrix',
  component: PlanMatrixFragment,
  parameters: { layout: 'fullscreen' },
}

const admitted = planMatrixItems(planMatrixFixtureList, {
  now: PLAN_REFERENCE_NOW,
})

/** A box the board can fill, since it is non-scrolling by contract. */
function Viewport({ children }: { readonly children: ReactNode }) {
  return <div style={{ height: 560, display: 'flex' }}>{children}</div>
}

const board = (
  overrides: Partial<Parameters<typeof PlanMatrixFragment>[0]> = {},
) => (
  <Viewport>
    <PlanMatrixFragment
      items={admitted}
      onAddNew={() => {}}
      onAddExisting={() => {}}
      onTapItem={() => {}}
      {...overrides}
    />
  </Viewport>
)

/** The shipped board: a card in every quadrant, drawn from the admitted set. */
export const AllFourQuadrants = {
  render: () => <Stage>{board()}</Stage>,
}

/** The same board, dark. */
export const AllFourQuadrantsDark = {
  render: () => <Stage theme="dark">{board()}</Stage>,
}

/** Nothing triaged yet — every quadrant offers its own two ways in. */
export const EmptyBoard = {
  render: () => <Stage>{board({ items: [] })}</Stage>,
}

/** One crowded quadrant: the 2-column square grid scrolls, the board does not. */
export const CrowdedQuadrant = {
  render: () => (
    <Stage>
      {board({
        items: Array.from({ length: 9 }, (_unused, index) => ({
          id: `crowd-${index}`,
          title: `📋 Endeavor ${index}`,
          quadrant: 'prioritize' as const,
        })),
      })}
    </Stage>
  ),
}
