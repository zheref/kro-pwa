/**
 * Mirrors `PerformancePaneFragment.stories.tsx` scene for scene (`RC-11`).
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PaneBody, PerformancePaneFragmentMocks } from '../PaneFragmentMocks'
import { PerformancePaneFragment } from '../PerformancePaneFragment'

afterEach(cleanup)

describe('PerformancePaneFragment', () => {
  it('portals Day Progress into the pane body when the rings open the day', async () => {
    render(
      <PaneBody>
        <PerformancePaneFragment
          {...PerformancePaneFragmentMocks.dayProgress}
        />
      </PaneBody>,
    )
    const host = await screen.findByTestId('detail-pane-performance')
    expect(host.getAttribute('data-reading')).toBe('dayProgress')
    expect(screen.getByTestId('pane-body').contains(host)).toBe(true)
  })

  it('labels the reading as Endeavor Activity when pointed at an endeavor', async () => {
    render(
      <PaneBody>
        <PerformancePaneFragment
          {...PerformancePaneFragmentMocks.endeavorActivity}
        />
      </PaneBody>,
    )
    const host = await screen.findByTestId('detail-pane-performance')
    expect(host.getAttribute('data-reading')).toBe('endeavorActivity')
    expect(host.textContent).toContain('Endeavor Activity')
  })

  it('draws nothing while the pane is on another segment', () => {
    render(
      <PaneBody>
        <PerformancePaneFragment {...PerformancePaneFragmentMocks.hidden} />
      </PaneBody>,
    )
    expect(screen.queryByTestId('detail-pane-performance')).toBeNull()
  })
})
