/**
 * Mirrors `TimelinePaneFragment.stories.tsx` scene for scene (`RC-11`).
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PaneBody, TimelinePaneFragmentMocks } from '../PaneFragmentMocks'
import { TimelinePaneFragment } from '../TimelinePaneFragment'

afterEach(cleanup)

describe('TimelinePaneFragment', () => {
  it('portals the timeline into the pane body when Plan has nothing selected', async () => {
    render(
      <PaneBody>
        <TimelinePaneFragment {...TimelinePaneFragmentMocks.shown} />
      </PaneBody>,
    )
    const host = await screen.findByTestId('detail-pane-timeline')
    expect(screen.getByTestId('pane-body').contains(host)).toBe(true)
  })

  it('still frames an empty day rather than hiding the segment', async () => {
    render(
      <PaneBody>
        <TimelinePaneFragment {...TimelinePaneFragmentMocks.emptyDay} />
      </PaneBody>,
    )
    const host = await screen.findByTestId('detail-pane-timeline')
    expect(host.textContent).toContain('Nothing planned today')
  })

  it('steps aside when the pane is elsewhere or on an endeavor', () => {
    render(
      <PaneBody>
        <TimelinePaneFragment {...TimelinePaneFragmentMocks.hidden} />
      </PaneBody>,
    )
    expect(screen.queryByTestId('detail-pane-timeline')).toBeNull()
  })
})
