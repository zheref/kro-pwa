/**
 * Mirrors `InboxPaneFragment.stories.tsx` scene for scene (`RC-11`).
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { InboxPaneFragment } from '../InboxPaneFragment'
import { InboxPaneFragmentMocks, PaneBody } from '../PaneFragmentMocks'

afterEach(cleanup)

describe('InboxPaneFragment', () => {
  it('portals the Inbox into the pane body when the segment shows', async () => {
    render(
      <PaneBody>
        <InboxPaneFragment {...InboxPaneFragmentMocks.shown} />
      </PaneBody>,
    )
    const host = await screen.findByTestId('detail-pane-inbox')
    expect(screen.getByTestId('pane-body').contains(host)).toBe(true)
    expect(host.textContent).toContain('Just Created')
  })

  it('portals an empty Inbox just the same — the Inbox draws its own empty state', async () => {
    render(
      <PaneBody>
        <InboxPaneFragment {...InboxPaneFragmentMocks.empty} />
      </PaneBody>,
    )
    expect(
      (await screen.findByTestId('detail-pane-inbox')).textContent,
    ).toContain('Nothing to triage')
  })

  it('draws nothing while the pane is on another segment', () => {
    render(
      <PaneBody>
        <InboxPaneFragment {...InboxPaneFragmentMocks.hidden} />
      </PaneBody>,
    )
    expect(screen.queryByTestId('detail-pane-inbox')).toBeNull()
  })
})
