/**
 * The tab bar's render tests, mirroring `TabBarFragment.stories.tsx` (`RC-11`).
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { doSurfaceLayout } from '../DoSurfaceLayout'
import {
  MainMocks,
  allOpenGates,
  desktopSurface,
  handheldSurface,
  statusQuoGates,
} from '../MainMocks'
import { searchDestination, tabBarElements } from '../NavigationSections'
import { DestinationKind } from '../SidebarDestination'
import { TabBarFragment } from '../TabBarFragment'

afterEach(cleanup)

const renderTabBar = (
  overrides: Partial<Parameters<typeof TabBarFragment>[0]> = {},
) =>
  render(
    <TabBarFragment
      elements={tabBarElements(statusQuoGates)}
      selected={MainMocks.handheldLoaded.selected}
      layout={doSurfaceLayout(handheldSurface)}
      searchDestination={searchDestination}
      onSelectDestination={() => {}}
      {...overrides}
    />,
  )

describe('the shipping tab bar', () => {
  it("offers Search, Plan, Do and Earn — canon's iPhone set", () => {
    renderTabBar()

    expect(
      screen.getAllByRole('button').map((button) => button.textContent),
    ).toEqual(['Search', 'Plan', 'Do', 'Earn'])
  })

  it('labels the initial tab "Do", not "Today"', () => {
    renderTabBar()

    expect(screen.getByRole('button', { name: 'Do' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Today' })).toBeNull()
  })

  it('marks the selected tab as the current page', () => {
    renderTabBar()

    expect(
      screen.getByRole('button', { name: 'Do' }).getAttribute('aria-current'),
    ).toBe('page')
  })

  it('never grows a Priority Matrix tab, even with every flag open', () => {
    renderTabBar({ elements: tabBarElements(allOpenGates) })

    expect(screen.queryByRole('button', { name: 'Priority Matrix' })).toBeNull()
  })

  it('keeps Search out of the tab set proper — it is a role, not a tab', () => {
    renderTabBar({ elements: tabBarElements(allOpenGates) })

    // Present as chrome, absent from the model the tabs are built from.
    expect(screen.getByRole('button', { name: 'Search' })).toBeTruthy()
    expect(
      tabBarElements(allOpenGates).some(
        (element) => element.destination.kind === DestinationKind.search,
      ),
    ).toBe(false)
  })
})

describe('control sizing follows the decision table', () => {
  it('gives every tab a 44px touch target', () => {
    renderTabBar()

    for (const button of screen.getAllByRole('button')) {
      expect(button.style.minHeight).toBe('44px')
    }
  })

  it('would drop to 28px if the same bar were pointer-driven', () => {
    // Not a shipped combination — the tab bar is the handheld shell — but it
    // proves the sizing comes from the table rather than from a literal.
    renderTabBar({ layout: doSurfaceLayout(desktopSurface) })

    expect(screen.getByRole('button', { name: 'Do' }).style.minHeight).toBe(
      '28px',
    )
  })
})

describe('intent leaves as a callback (RC-15)', () => {
  it('reports the tab that was tapped', async () => {
    const onSelectDestination = vi.fn()
    renderTabBar({ onSelectDestination })

    await userEvent.click(screen.getByRole('button', { name: 'Earn' }))

    expect(onSelectDestination).toHaveBeenCalledWith({
      kind: DestinationKind.earn,
    })
  })

  it('reports Search through the same channel', async () => {
    const onSelectDestination = vi.fn()
    renderTabBar({ onSelectDestination })

    await userEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(onSelectDestination).toHaveBeenCalledWith(searchDestination)
  })
})
