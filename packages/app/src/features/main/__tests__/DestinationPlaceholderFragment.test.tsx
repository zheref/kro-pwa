/**
 * The placeholder's render tests, mirroring its stories (`RC-11`).
 *
 * What is actually being checked is the naming port: the content shows canon's
 * `heading`, which differs from the sidebar's `title` for four destinations.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DestinationPlaceholderFragment } from '../DestinationPlaceholderFragment'
import { DestinationKind } from '../SidebarDestination'

afterEach(cleanup)

describe('DestinationPlaceholderFragment', () => {
  it('shows "My Day" for the destination whose row reads "Today"', () => {
    render(
      <DestinationPlaceholderFragment
        destination={{ kind: DestinationKind.myDay }}
      />,
    )

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('My Day')
  })

  it('shows "Inbox" for the destination whose row reads "Jot Down"', () => {
    render(
      <DestinationPlaceholderFragment
        destination={{ kind: DestinationKind.inbox }}
      />,
    )

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Inbox')
  })

  it('shows "Settings" for the destination whose row reads "Adjust"', () => {
    render(
      <DestinationPlaceholderFragment
        destination={{ kind: DestinationKind.settings }}
      />,
    )

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      'Settings',
    )
  })

  it('shows a project by its own name', () => {
    render(
      <DestinationPlaceholderFragment
        destination={{
          kind: DestinationKind.list,
          listId: 'p-1',
          listTitle: 'Home',
        }}
      />,
    )

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Home')
  })

  it('explains itself rather than showing an empty panel', () => {
    render(
      <DestinationPlaceholderFragment
        destination={{ kind: DestinationKind.earn }}
      />,
    )

    expect(screen.getByText('Rewards is not built yet.')).toBeTruthy()
  })

  it('takes the caller\'s copy when a feature has something better to say', () => {
    render(
      <DestinationPlaceholderFragment
        destination={{ kind: DestinationKind.board }}
        description="The board arrives with its own child."
      />,
    )

    expect(
      screen.getByText('The board arrives with its own child.'),
    ).toBeTruthy()
  })
})

