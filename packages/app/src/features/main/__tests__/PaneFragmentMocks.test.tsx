/** The shared pane-fragment scenes every story and render test reads. */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  PaneBody,
  PerformancePaneFragmentMocks,
  TimelinePaneFragmentMocks,
} from '../PaneFragmentMocks'

afterEach(cleanup)

describe('pane fragment mocks', () => {
  it('names one Performance scene per reading, plus hidden', () => {
    expect(PerformancePaneFragmentMocks.dayProgress.reading).toBe('dayProgress')
    expect(PerformancePaneFragmentMocks.endeavorActivity.reading).toBe(
      'endeavorActivity',
    )
    expect(PerformancePaneFragmentMocks.hidden.reading).toBeNull()
  })

  it('offers the timeline both shown and hidden', () => {
    expect(TimelinePaneFragmentMocks.shown.isShown).toBe(true)
    expect(TimelinePaneFragmentMocks.hidden.isShown).toBe(false)
  })

  it('renders a pane body that its children fill', () => {
    render(
      <PaneBody>
        <p>inside</p>
      </PaneBody>,
    )
    expect(screen.getByText('inside')).toBeTruthy()
  })
})
