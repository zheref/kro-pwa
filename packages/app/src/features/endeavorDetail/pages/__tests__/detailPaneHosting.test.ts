/**
 * The Detail ↔ pane reconciliation decision — pure (`RC-56`): a previous and
 * a current reading go in, at most one action comes out.
 */
import { describe, expect, it } from 'vitest'
import {
  type DetailPaneHostingSnapshot,
  detailPaneHostingAction,
} from '../detailPaneHosting'

const review = { id: 'e-1', title: 'Write the quarterly review' }
const walk = { id: 'e-9', title: 'Evening walk' }

const hidden: DetailPaneHostingSnapshot = {
  isHost: true,
  detail: null,
  paneSegment: null,
  paneEndeavorId: null,
}
const onPlan: DetailPaneHostingSnapshot = {
  isHost: true,
  detail: review,
  paneSegment: 'plan',
  paneEndeavorId: review.id,
}

describe('opening Detail points the pane', () => {
  it('points a hidden pane at the endeavor a card asked Detail for', () => {
    expect(
      detailPaneHostingAction(hidden, { ...hidden, detail: review }),
    ).toEqual({ kind: 'pointPane', endeavor: review })
  })

  it('repoints an open pane when Detail moves to another endeavor', () => {
    expect(
      detailPaneHostingAction(onPlan, { ...onPlan, detail: walk }),
    ).toEqual({ kind: 'pointPane', endeavor: walk })
  })

  it('does nothing once the pane already shows that endeavor', () => {
    expect(detailPaneHostingAction(onPlan, onPlan)).toBeNull()
  })
})

describe('leaving Plan releases Detail', () => {
  it('releases Detail when the user switches to Performance', () => {
    expect(
      detailPaneHostingAction(onPlan, {
        ...onPlan,
        paneSegment: 'performance',
      }),
    ).toEqual({ kind: 'dismissDetail' })
  })

  it('releases Detail when the pane is dismissed', () => {
    expect(
      detailPaneHostingAction(onPlan, { ...onPlan, paneSegment: null }),
    ).toEqual({ kind: 'dismissDetail' })
  })

  it('does not release Detail that just opened before the pane caught up', () => {
    const opening = {
      ...hidden,
      detail: review,
      paneSegment: 'performance' as const,
    }
    expect(
      detailPaneHostingAction({ ...opening, detail: review }, opening),
    ).toBeNull()
  })
})

describe('closing Detail from inside hides the pane', () => {
  it('hides the pane when Detail closes on its own (a delete)', () => {
    expect(
      detailPaneHostingAction(onPlan, { ...onPlan, detail: null }),
    ).toEqual({
      kind: 'dismissPane',
    })
  })

  it('leaves the pane alone when it had already moved to another segment', () => {
    const moved = { ...onPlan, paneSegment: 'performance' as const }
    expect(
      detailPaneHostingAction(moved, { ...moved, detail: null }),
    ).toBeNull()
  })

  it('leaves the pane alone when it was pointed at a different endeavor', () => {
    expect(
      detailPaneHostingAction(onPlan, {
        ...onPlan,
        detail: null,
        paneEndeavorId: walk.id,
      }),
    ).toBeNull()
  })
})

describe('reselecting Plan reopens the remembered Detail', () => {
  const dismissed = { ...onPlan, detail: null, paneSegment: null }

  it('reopens Detail when Plan is clicked on a remembered endeavor', () => {
    expect(
      detailPaneHostingAction(dismissed, { ...dismissed, paneSegment: 'plan' }),
    ).toEqual({ kind: 'reopenDetail', endeavorId: review.id })
  })

  it('does not reopen anything for the endeavor-free Timeline', () => {
    const dayOnly = { ...hidden }
    expect(
      detailPaneHostingAction(dayOnly, { ...dayOnly, paneSegment: 'plan' }),
    ).toBeNull()
  })

  it('does not reopen while Plan was already showing', () => {
    const planNoDetail = { ...dismissed, paneSegment: 'plan' as const }
    expect(
      detailPaneHostingAction(
        { ...planNoDetail, paneEndeavorId: walk.id },
        planNoDetail,
      ),
    ).toBeNull()
  })
})

describe('outside the pane host', () => {
  it('does nothing on the tab-bar shell', () => {
    expect(
      detailPaneHostingAction(hidden, {
        ...hidden,
        isHost: false,
        detail: review,
      }),
    ).toBeNull()
  })

  it('does nothing with the flag off, even as Detail closes', () => {
    const off = { ...onPlan, isHost: false }
    expect(detailPaneHostingAction(off, { ...off, detail: null })).toBeNull()
  })

  it('does nothing when neither side moved', () => {
    expect(detailPaneHostingAction(hidden, hidden)).toBeNull()
  })
})
