/**
 * The pane's reopen-by-id reading — pure (`RC-56`): one snapshot in, the
 * endeavor Detail should reopen on (or `null`) out.
 */
import { describe, expect, it } from 'vitest'
import {
  type DetailPaneHostingSnapshot,
  detailPaneReopenRequest,
} from '../detailPaneHosting'

const reselected: DetailPaneHostingSnapshot = {
  isHost: true,
  isDetailOpen: false,
  paneSegment: 'plan',
  paneEndeavorId: 'e-1',
}

describe('detailPaneReopenRequest', () => {
  it('asks for the kept endeavor when the user reselects Plan with Detail closed', () => {
    expect(detailPaneReopenRequest(reselected)).toBe('e-1')
  })

  it('asks for nothing while Detail already shows on Plan', () => {
    expect(
      detailPaneReopenRequest({ ...reselected, isDetailOpen: true }),
    ).toBeNull()
  })

  it('asks for nothing on the endeavor-free Plan — that is the day timeline', () => {
    expect(
      detailPaneReopenRequest({ ...reselected, paneEndeavorId: null }),
    ).toBeNull()
  })

  it('asks for nothing while the pane shows another segment or is hidden', () => {
    expect(
      detailPaneReopenRequest({ ...reselected, paneSegment: 'performance' }),
    ).toBeNull()
    expect(
      detailPaneReopenRequest({ ...reselected, paneSegment: null }),
    ).toBeNull()
  })

  it('asks for nothing on the tab-bar shell, which has no pane', () => {
    expect(detailPaneReopenRequest({ ...reselected, isHost: false })).toBeNull()
  })
})
