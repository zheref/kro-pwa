/**
 * The shell's render tests, mirroring `MainShellFragment.stories.tsx`
 * (`RC-11`) — and the place acceptance criterion 1 is checked end to end.
 *
 * The pair that matters most: at a narrow viewport the shell renders the tab
 * bar and no sidebar; at a wide one the sidebar, with Profile and Inbox in the
 * content toolbar. That is canon's ownership rule as a rendered fact.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
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
import type { MainState } from '../MainFeature'
import { type DetailPaneChrome, MainShellFragment } from '../MainShellFragment'
import { detailPaneTitle } from '../DetailPane'
import {
  searchDestination,
  sidebarSections,
  tabBarElements,
} from '../NavigationSections'
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

  it("carries Profile and Inbox on the shell's own bar, as canon's phone toolbar does", () => {
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
    const inbox = toolbar.querySelector('[aria-label="Inbox"]')
    expect(inbox).toBeTruthy()
    expect(inbox?.className).toContain('hover:bg-(--kro-glass-surface-hover)')
    expect(inbox?.className).toContain('rounded-kro-small')
    expect((inbox as HTMLElement).style.width).toBe('32px')
    expect(inbox?.querySelector('svg')?.getAttribute('width')).toBe('16')
  })

  it('keeps that ownership at a narrow width too — a sidebar shell has no tab chrome', () => {
    // Canon's exact reasoning for why ownership follows the container: if the
    // sidebar shell declined when narrow, the controls would fall back nowhere.
    expect(
      doSurfaceLayout({ idiom: 'tablet', width: 'compact' })
        .showsProfileControl,
    ).toBe(true)
  })

  it('does not repeat My Day in the content toolbar — LargeScreenTitle owns that', () => {
    renderShell(desktopSurface)

    const toolbar = screen.getByTestId('shell-content-toolbar')
    expect(toolbar.querySelector('h1')).toBeNull()
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()

    cleanup()
    renderShell(handheldSurface)
    expect(
      screen.getByTestId('shell-tab-bar-toolbar').querySelector('h1'),
    ).toBeNull()
  })

  it('still titles destinations that do not paint a LargeScreenTitle', () => {
    renderShell(desktopSurface, {
      selected: { kind: DestinationKind.inbox },
    })

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Inbox')
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
  it('paints the page field behind both shells so glass has something to refract', () => {
    renderShell(desktopSurface)
    expect(screen.getByTestId('detail-backdrop')).toBeTruthy()

    cleanup()
    renderShell(handheldSurface)
    expect(screen.getByTestId('detail-backdrop')).toBeTruthy()
  })

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

  it('leads with the sidebar toggle, visibility, refresh and inbox, and trails with the bell and profile', () => {
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
            <button type="button">Visibility</button>
            <button type="button">Refresh</button>
          </ToolbarSlot>
          <ToolbarSlot placement="primary">
            <button type="button">Notifications</button>
          </ToolbarSlot>
        </MainShellFragment>
      </ToolbarSlotsProvider>,
    )

    const toolbar = screen.getByTestId('shell-content-toolbar')
    const labels = Array.from(toolbar.querySelectorAll('button')).map(
      (button) => button.getAttribute('aria-label') ?? button.textContent,
    )

    expect(toolbar.className).toContain('pl-kro-small')
    expect(toolbar.className).toContain('z-20')
    expect(toolbar.className).not.toContain('px-kro-medium')
    expect(screen.getByRole('main').className).toContain('z-0')
    expect(
      screen.getByRole('button', { name: 'Profile' }).parentElement?.className,
    ).toContain('ml-kro-small')
    expect(
      screen.getByTestId('shell-sidebar-shape').getAttribute('data-kro-idiom'),
    ).toBe('desktop')
    expect(document.documentElement.getAttribute('data-kro-idiom')).toBe(
      'desktop',
    )
    expect(labels).toEqual([
      'Toggle Sidebar',
      'Visibility',
      'Refresh',
      'Inbox',
      'Notifications',
      'Profile',
    ])
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
    expect(shell.getAttribute('data-kro-idiom')).toBe('mobile')
    expect(document.documentElement.getAttribute('data-kro-idiom')).toBe(
      'mobile',
    )
    expect(shell.style.getPropertyValue(SHELL_BOTTOM_INSET_VAR)).toBe(
      `${tabBarReservedHeight(doSurfaceLayout(handheldSurface))}px`,
    )
  })

  it('derives it from the same numbers the bar lays itself out with', () => {
    const layout = doSurfaceLayout(handheldSurface)

    expect(tabBarReservedHeight(layout)).toBe(
      layout.minimumControlSide +
        2 * layout.minimumControlSpacing +
        8 /* TAB_DOCK_INSET */,
    )
  })

  it('reserves NOTHING on the sidebar shell — it has no bottom chrome', () => {
    renderShell(desktopSurface)

    const shell = screen.getByTestId('shell-sidebar-shape')
    expect(shell.style.getPropertyValue(SHELL_BOTTOM_INSET_VAR)).toBe('0px')
    expect(shellBottomInset('sidebar', doSurfaceLayout(desktopSurface))).toBe(0)
  })
})

describe('the content column reaches the window edge', () => {
  it('has no right gutter on a sidebar shell, so a title slab can', () => {
    renderShell(desktopSurface)

    const column = screen.getByTestId('shell-content-column')
    expect(column.className).not.toContain('pr-')
    expect(screen.queryByTestId('shell-large-title-slab')).toBeNull()
  })

  it('does not paint LargeScreenTitle on the column — that clip belongs to the header', () => {
    renderShell(desktopSurface)

    expect(screen.queryByTestId('shell-large-title-slab')).toBeNull()
    expect(screen.getByTestId('shell-content-column')).toBeTruthy()
  })

  it('still leaves the tab-bar shell without a column-tall slab', () => {
    renderShell(handheldSurface)

    expect(screen.queryByTestId('shell-large-title-slab')).toBeNull()
    expect(screen.getByTestId('shell-tab-bar')).toBeTruthy()
  })

  it('offers a window-origin host so the title slab can grow from the edges', () => {
    renderShell(desktopSurface)

    const host = screen.getByTestId('shell-title-slab-host')
    expect(host.hasAttribute('data-kro-title-slab-host')).toBe(true)
    expect(host.getAttribute('aria-hidden')).toBe('true')

    cleanup()
    renderShell(handheldSurface)
    expect(screen.getByTestId('shell-title-slab-host')).toBeTruthy()
  })

  it('insets the sidebar from the top the same way the chrome row already insets the bottom', () => {
    renderShell(desktopSurface)

    const chrome = screen.getByTestId('shell-sidebar').parentElement
    expect(chrome?.className).toContain('pb-kro-small')
    expect(chrome?.className).not.toContain('pt-kro-small')
    expect(screen.getByTestId('shell-sidebar').className).toContain(
      'mt-kro-small',
    )
  })

  it('drops the glass bar and the redundant title so the slab shows through', () => {
    renderShell(desktopSurface)

    const toolbar = screen.getByTestId('shell-content-toolbar')
    expect(toolbar.className).not.toContain('kro-glass')
    expect(toolbar.tagName).toBe('HEADER')
  })
})

/** The pane's chrome as the Page builds it — mirrors the stories' `paneFrom`. */
const paneFrom = (
  state: MainState,
  callbacks: Partial<DetailPaneChrome> = {},
): DetailPaneChrome => {
  const { segment, endeavor } = state.detailPane
  return {
    segment,
    title:
      segment === null
        ? null
        : detailPaneTitle(segment, endeavor?.title ?? null),
    subtitle: segment === null ? null : (endeavor?.title ?? null),
    onSelectSegment: noop,
    onDismiss: noop,
    ...callbacks,
  }
}

describe('the trailing detail pane — mirrors the DetailPane* stories', () => {
  it('shows the Session, Performance and Plan group with nothing pressed while hidden', () => {
    renderShell(desktopSurface, {
      detailPane: paneFrom(MainMocks.desktopDetailPaneReady),
    })
    const group = screen.getByTestId('detail-pane-segments')
    const buttons = Array.from(group.querySelectorAll('button'))
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Session',
      'Performance',
      'Plan',
    ])
    expect(
      buttons.every((b) => b.getAttribute('aria-pressed') === 'false'),
    ).toBe(true)
    expect(
      screen
        .getByTestId('trailing-detail-panel')
        .getAttribute('data-presented'),
    ).toBe('false')
  })

  it("presents Plan's Details with the endeavor's name and the slotted body", () => {
    render(
      <ToolbarSlotsProvider>
        <ToolbarSlot placement="detailPane">
          <p>detail body</p>
        </ToolbarSlot>
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
          detailPane={paneFrom(MainMocks.desktopDetailPanePlan)}
        />
      </ToolbarSlotsProvider>,
    )
    const panel = screen.getByTestId('trailing-detail-panel')
    expect(panel.getAttribute('data-presented')).toBe('true')
    expect(screen.getByText('Details')).toBeTruthy()
    expect(screen.getByText('Write the quarterly review')).toBeTruthy()
    expect(panel.textContent).toContain('detail body')
    expect(
      screen.getByRole('button', { name: 'Plan' }).getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('titles the whole-day Performance "Day Progress" with no subtitle', () => {
    renderShell(desktopSurface, {
      detailPane: paneFrom(MainMocks.desktopDetailPaneDayProgress),
    })
    expect(screen.getByText('Day Progress')).toBeTruthy()
    expect(
      screen
        .getByRole('button', { name: 'Performance' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('reports a segment click and a dismiss', async () => {
    const onSelectSegment = vi.fn()
    const onDismiss = vi.fn()
    renderShell(desktopSurface, {
      detailPane: paneFrom(MainMocks.desktopDetailPanePlan, {
        onSelectSegment,
        onDismiss,
      }),
    })
    await userEvent.click(screen.getByRole('button', { name: 'Session' }))
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onSelectSegment).toHaveBeenCalledWith('sessionSetup')
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('publishes the FAB offset only while the pane is showing', () => {
    const { container, unmount } = renderShell(desktopSurface, {
      detailPane: paneFrom(MainMocks.desktopDetailPanePlan),
    })
    const root = container.querySelector(
      '[data-shell-shape="sidebar"]',
    ) as HTMLElement
    expect(root.style.getPropertyValue('--kro-detail-panel-inset')).toContain(
      '12px',
    )
    unmount()
    const hidden = renderShell(desktopSurface, {
      detailPane: paneFrom(MainMocks.desktopDetailPaneReady),
    })
    const hiddenRoot = hidden.container.querySelector(
      '[data-shell-shape="sidebar"]',
    ) as HTMLElement
    expect(hiddenRoot.style.getPropertyValue('--kro-detail-panel-inset')).toBe(
      '0px',
    )
  })

  it('draws neither the group nor the pane without a pane, or on the tab-bar shell', () => {
    renderShell(desktopSurface)
    expect(screen.queryByTestId('detail-pane-segments')).toBeNull()
    expect(screen.queryByTestId('trailing-detail-panel')).toBeNull()
    cleanup()
    renderShell(handheldSurface, {
      detailPane: paneFrom(MainMocks.handheldDetailPaneOpen),
    })
    expect(screen.queryByTestId('detail-pane-segments')).toBeNull()
    expect(screen.queryByTestId('trailing-detail-panel')).toBeNull()
  })
})

describe('the pane starts below the large title', () => {
  const rect = (top: number, bottom: number) =>
    ({
      top,
      bottom,
      left: 0,
      right: 0,
      width: 0,
      height: bottom - top,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect

  it('places the pane the bottom margin below a page’s large title', async () => {
    const title = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        return this.hasAttribute('data-kro-large-title')
          ? rect(52, 172)
          : rect(0, 900)
      })
    renderShell(desktopSurface, {
      detailPane: paneFrom(MainMocks.desktopDetailPanePlan),
    })
    // A destination mounting its large title — the shell notices and re-measures.
    const header = document.createElement('header')
    header.setAttribute('data-kro-large-title', '')
    screen.getByRole('main').prepend(header)
    await waitFor(() => {
      expect(screen.getByTestId('trailing-detail-panel').style.top).toBe(
        '188px',
      )
    })
    title.mockRestore()
  })

  it("keeps canon's 96 on a page with no large title", async () => {
    renderShell(desktopSurface, {
      detailPane: paneFrom(MainMocks.desktopDetailPanePlan),
    })
    await new Promise((resolve) => requestAnimationFrame(resolve))
    expect(screen.getByTestId('trailing-detail-panel').style.top).toBe('96px')
  })

  it('measures nothing when the window hosts no pane', () => {
    renderShell(desktopSurface)
    expect(screen.queryByTestId('trailing-detail-panel')).toBeNull()
  })
})
