/**
 * The default quick action's render tests, mirroring its stories (`RC-11`).
 *
 * The rule under test is canon's own `switch store.selectedElement?.type` plus
 * `isQuickActionAvailable`: three tabs own their own FAB, Search hides it, and
 * everything else gets this disc.
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CHROME_LAYOUT } from '../../../../design/chrome/layout/chromeLayout'
import {
  ALL_SIMPLE_DESTINATIONS,
  DestinationKind,
} from '../../../main/SidebarDestination'
import {
  CaptureQuickActionFragment,
  captureQuickActionShows,
} from '../CaptureQuickActionFragment'

afterEach(cleanup)

describe('captureQuickActionShows — canon\'s default: branch', () => {
  it('stands down on the three tabs that own their own FAB', () => {
    expect(captureQuickActionShows({ kind: DestinationKind.plan })).toBe(false)
    expect(captureQuickActionShows({ kind: DestinationKind.myDay })).toBe(false)
    expect(captureQuickActionShows({ kind: DestinationKind.earn })).toBe(false)
  })

  it('hides on Search, which canon\'s isQuickActionAvailable excludes outright', () => {
    expect(captureQuickActionShows({ kind: DestinationKind.search })).toBe(false)
  })

  it('shows on every other destination, including a project list', () => {
    expect(captureQuickActionShows({ kind: DestinationKind.allTasks })).toBe(true)
    expect(captureQuickActionShows({ kind: DestinationKind.inbox })).toBe(true)
    expect(
      captureQuickActionShows({
        kind: DestinationKind.list,
        listId: 'work',
        listTitle: 'Work',
      }),
    ).toBe(true)
  })

  it('answers for every destination the shell can select, with no gaps', () => {
    const answered = ALL_SIMPLE_DESTINATIONS.filter(
      (destination) => typeof captureQuickActionShows(destination) === 'boolean',
    )
    expect(answered.length).toBe(ALL_SIMPLE_DESTINATIONS.length)
  })
})

describe('the disc itself', () => {
  it('draws a named plus, never a bare glyph', () => {
    render(<CaptureQuickActionFragment isVisible onPress={() => {}} />)

    expect(screen.getByRole('button', { name: 'Quick add' })).toBeTruthy()
  })

  it('sits at canon\'s own trailing and bottom insets', () => {
    render(<CaptureQuickActionFragment isVisible onPress={() => {}} />)

    const anchor = screen.getByTestId('capture-quick-action')
    expect(anchor.style.right).toBe(`${CHROME_LAYOUT.fabTrailingPadding}px`)
    expect(anchor.style.bottom).toContain(`${CHROME_LAYOUT.fabBottomPadding}px`)
  })

  it('renders nothing at all where the destination owns its own FAB', () => {
    render(<CaptureQuickActionFragment isVisible={false} onPress={() => {}} />)

    expect(screen.queryByTestId('capture-quick-action')).toBeNull()
  })

  it('raises the intent rather than acting on it (RC-15)', async () => {
    const onPress = vi.fn()
    render(<CaptureQuickActionFragment isVisible onPress={onPress} />)

    await userEvent.click(screen.getByRole('button', { name: 'Quick add' }))

    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
