/**
 * The shell's render tests, mirroring `MainShellFragment.stories.tsx`
 * (`RC-11`) — and the place acceptance criterion 1 is checked end to end.
 *
 * The pair that matters most: at a narrow viewport the shell renders the tab
 * bar and no sidebar; at a wide one the sidebar, with Profile and Inbox in the
 * content toolbar. That is canon's ownership rule as a rendered fact.
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SHELL_BOTTOM_INSET_VAR } from '../../../design/chrome/layout/chromeLayout'
import {
  doSurfaceLayout,
  shellBottomInset,
  shellShapeFor,
  tabBarReservedHeight,
} from '../DoSurfaceLayout'
import {
  MainMocks,
  desktopSurface,
  handheldSurface,
  projectMocks,
  statusQuoGates,
  tabletSurface,
} from '../MainMocks'
import { MainShellFragment } from '../MainShellFragment'
import { searchDestination, sidebarSections, tabBarElements } from '../NavigationSections'
import { DestinationKind } from '../SidebarDestination'
import { ToolbarSlot, ToolbarSlotsProvider } from '../ToolbarSlots'

afterEach(cleanup)

const noop = () => {}

const renderShell = (
  surface = desktopSurface,
  overrides: Partial<Parameters<typeof MainShellFragment>[0]> = {},
) =>
  render(
    <ToolbarSlotsProvider>
      <MainShellFragment
        shape={shellShapeFor(surface)}
        layout={doSurfaceLayout(surface)}
        selected={MainMocks.desktopLoaded.selected}
        sections={sidebarSections({
          gates: statusQuoGates,
          isDevelopment: false,
          projects: [projectMocks.inbox],
          isAddingProject: false,
        })}
        tabs={tabBarElements(statusQuoGates)}
        searchDestination={searchDestination}
        searchQuery=""
        isAddingProject={false}
        draftProjectTitle=""
        canManageProjects
        isSidebarVisible
        onSelectDestination={noop}
        onChangeSearchQuery={noop}
        onSubmitSearch={noop}
        onTapAddProject={noop}
        onEditDraftProjectTitle={noop}
        onCommitDraftProject={noop}
        onCancelDraftProject={noop}
        onDeleteProject={noop}
        onToggleSidebar={noop}
        onTapProfile={noop}
        onTapInbox={noop}
        onTapSettings={noop}
        {...overrides}
      >
        <p>destination content</p>
      </MainShellFragment>
    </ToolbarSlotsProvider>,
  )

describe('acceptance criterion 1 — narrow', () => {
  it('renders the tab bar and no sidebar', () => {
    renderShell(handheldSurface)

    expect(screen.getByTestId('shell-tab-bar')).toBeTruthy()
    expect(screen.queryByTestId('shell-sidebar')).toBeNull()
  })

  it('carries Profile and Inbox on the shell\'s own bar, as canon\'s phone toolbar does', () => {
    renderShell(handheldSurface)

    const toolbar = screen.getByTestId('shell-tab-bar-toolbar')
    expect(toolbar.querySelector('[aria-label="Profile"]')).toBeTruthy()
    expect(toolbar.querySelector('[aria-label="Inbox"]')).toBeTruthy()
  })

  it('adds the Settings gear on tabs other than Plan and Do, and not on those two', () => {
    renderShell(handheldSurface)
    expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull()

    cleanup()
    renderShell(handheldSurface, {
      selected: { kind: DestinationKind.earn },
    })
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy()
  })

  it('tells a destination NOT to draw its own Profile control', () => {
    // The table cell a feature child reads: `showsProfileControl` is false on
    // a handheld precisely because the shell already carries it.
    expect(doSurfaceLayout(handheldSurface).showsProfileControl).toBe(false)
  })
})

describe('acceptance criterion 1 — wide', () => {
  it('renders the sidebar and no tab bar', () => {
    renderShell(desktopSurface)

    expect(screen.getByTestId('shell-sidebar')).toBeTruthy()
    expect(screen.queryByTestId('shell-tab-bar')).toBeNull()
  })

  it('owns Profile and Inbox in the content toolbar', () => {
    renderShell(desktopSurface)

    const toolbar = screen.getByTestId('shell-content-toolbar')
    expect(toolbar.querySelector('[aria-label="Profile"]')).toBeTruthy()
    expect(toolbar.querySelector('[aria-label="Inbox"]')).toBeTruthy()
  })

  it('keeps that ownership at a narrow width too — a sidebar shell has no tab chrome', () => {
    // Canon's exact reasoning for why ownership follows the container: if the
    // sidebar shell declined when narrow, the controls would fall back nowhere.
    expect(
      doSurfaceLayout({ idiom: 'tablet', width: 'compact' })
        .showsProfileControl,
    ).toBe(true)
  })

  it('shows the expanded heading on a wide surface and the plain one when narrow', () => {
    renderShell(desktopSurface)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('My Day')

    cleanup()
    renderShell(handheldSurface)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('My Day')
  })

  it('collapses the sidebar column on request', () => {
    renderShell(desktopSurface, { isSidebarVisible: false })

    expect(screen.queryByTestId('shell-sidebar')).toBeNull()
    expect(screen.getByTestId('shell-content-toolbar')).toBeTruthy()
  })

  it('gives a landscape tablet the sidebar with touch-sized controls', () => {
    renderShell(tabletSurface)

    expect(screen.getByTestId('shell-sidebar')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Profile' }).style.minHeight,
    ).toBe('44px')
  })
})

describe('the destination is rendered inside the shell', () => {
  it('renders its children in the sidebar shape', () => {
    renderShell(desktopSurface)
    expect(screen.getByText('destination content')).toBeTruthy()
  })

  it('renders them in the tab-bar shape too', () => {
    renderShell(handheldSurface)
    expect(screen.getByText('destination content')).toBeTruthy()
  })
})

describe('toolbar slots — the shell hardcodes no feature control', () => {
  it('lets a destination place a control in the desktop navigation group', () => {
    render(
      <ToolbarSlotsProvider>
        <MainShellFragment
          shape="sidebar"
          layout={doSurfaceLayout(desktopSurface)}
          selected={MainMocks.desktopLoaded.selected}
          sections={[]}
          tabs={[]}
          searchDestination={searchDestination}
          searchQuery=""
          isAddingProject={false}
          draftProjectTitle=""
          canManageProjects={false}
          isSidebarVisible={false}
          onSelectDestination={noop}
          onChangeSearchQuery={noop}
          onSubmitSearch={noop}
          onTapAddProject={noop}
          onEditDraftProjectTitle={noop}
          onCommitDraftProject={noop}
          onCancelDraftProject={noop}
          onDeleteProject={noop}
          onToggleSidebar={noop}
          onTapProfile={noop}
          onTapInbox={noop}
          onTapSettings={noop}
        >
          <ToolbarSlot placement="navigation">
            <button type="button">Notifications</button>
          </ToolbarSlot>
        </MainShellFragment>
      </ToolbarSlotsProvider>,
    )

    const toolbar = screen.getByTestId('shell-content-toolbar')
    expect(
      toolbar.querySelector('[data-toolbar-outlet="navigation"] button')
        ?.textContent,
    ).toBe('Notifications')
  })

  it('renders no feature controls of its own when nothing slots any', () => {
    renderShell(desktopSurface)

    const outlet = screen
      .getByTestId('shell-content-toolbar')
      .querySelector('[data-toolbar-outlet="primary"]')
    expect(outlet?.childElementCount).toBe(0)
  })
})

describe('shell-owned intents', () => {
  it('reports a Profile tap', async () => {
    const onTapProfile = vi.fn()
    renderShell(desktopSurface, { onTapProfile })

    await userEvent.click(screen.getByRole('button', { name: 'Profile' }))

    expect(onTapProfile).toHaveBeenCalledTimes(1)
  })

  it('reports an Inbox tap and a sidebar toggle', async () => {
    const onTapInbox = vi.fn()
    const onToggleSidebar = vi.fn()
    renderShell(desktopSurface, { onTapInbox, onToggleSidebar })

    await userEvent.click(screen.getByRole('button', { name: 'Inbox' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'Toggle Sidebar' }),
    )

    expect(onTapInbox).toHaveBeenCalledTimes(1)
    expect(onToggleSidebar).toHaveBeenCalledTimes(1)
  })
})

describe('the bottom inset the shell publishes for the design system', () => {
  it('reserves the tab bar’s own height on the handheld shell', () => {
    // Canon anchors the Active Toast 24pt off "the bottom" and means 24pt
    // above the tab bar, because on iOS a tab is a safe area that already
    // excludes it. Here the bar is an ordinary flex child, so the shell has to
    // say how much of the bottom edge it occupies or the toast lands under it.
    renderShell(handheldSurface)

    const shell = screen.getByTestId('shell-tab-bar-shape')
    expect(shell.style.getPropertyValue(SHELL_BOTTOM_INSET_VAR)).toBe(
      `${tabBarReservedHeight(doSurfaceLayout(handheldSurface))}px`,
    )
  })

  it('derives it from the same numbers the bar lays itself out with', () => {
    const layout = doSurfaceLayout(handheldSurface)

    expect(tabBarReservedHeight(layout)).toBe(
      layout.minimumControlSide + 2 * layout.minimumControlSpacing,
    )
  })

  it('reserves NOTHING on the sidebar shell — it has no bottom chrome', () => {
    renderShell(desktopSurface)

    const shell = screen.getByTestId('shell-sidebar-shape')
    expect(shell.style.getPropertyValue(SHELL_BOTTOM_INSET_VAR)).toBe('0px')
    expect(shellBottomInset('sidebar', doSurfaceLayout(desktopSurface))).toBe(0)
  })
})
