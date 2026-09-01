import type { ReactNode } from 'react'
import { DestinationPlaceholderFragment } from './DestinationPlaceholderFragment'
import {
  type DoSurface,
  doSurfaceLayout,
  shellShapeFor,
} from './DoSurfaceLayout'
import {
  MainMocks,
  desktopSurface,
  handheldSurface,
  projectMocks,
  statusQuoGates,
  tabletSurface,
} from './MainMocks'
import { MainShellFragment } from './MainShellFragment'
import {
  searchDestination,
  sidebarSections,
  tabBarElements,
} from './NavigationSections'
import { DestinationKind } from './SidebarDestination'
import { ToolbarSlot, ToolbarSlotsProvider } from './ToolbarSlots'

/**
 * The whole shell, at both widths and in both schemes.
 *
 * These are the stories the acceptance criteria are read against: the narrow
 * ones must show a tab bar and no sidebar, the wide ones a sidebar with
 * Profile and Inbox in the content toolbar. Every one is built from
 * `MainMocks` plus the navigation model, so a story cannot show a shell the
 * slice could not produce.
 */
export default {
  title: 'Shell/App shell',
  component: MainShellFragment,
  parameters: { layout: 'fullscreen' },
}

const noop = () => {}

function Stage({
  theme = 'light',
  width,
  children,
}: {
  theme?: 'light' | 'dark'
  width: number
  children: ReactNode
}) {
  return (
    <div
      data-theme={theme}
      style={{
        width,
        height: 560,
        overflow: 'hidden',
        border: '1px solid var(--kro-color-hairline)',
      }}
    >
      {children}
    </div>
  )
}

const shell = (
  surface: DoSurface,
  overrides: Partial<Parameters<typeof MainShellFragment>[0]> = {},
) => (
  <ToolbarSlotsProvider>
    <MainShellFragment
      shape={shellShapeFor(surface)}
      layout={doSurfaceLayout(surface)}
      selected={MainMocks.desktopLoaded.selected}
      sections={sidebarSections({
        gates: statusQuoGates,
        isDevelopment: false,
        projects: [projectMocks.inbox, projectMocks.work],
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
      <DestinationPlaceholderFragment
        destination={overrides.selected ?? { kind: DestinationKind.myDay }}
      />
    </MainShellFragment>
  </ToolbarSlotsProvider>
)

/** Wide: the macOS parity shell. */
export const DesktopSidebar = {
  render: () => <Stage width={1100}>{shell(desktopSurface)}</Stage>,
}

/** Narrow: the iPhone parity shell. */
export const HandheldTabBar = {
  render: () => <Stage width={390}>{shell(handheldSurface)}</Stage>,
}

/**
 * A landscape tablet: the sidebar shell, but every control sized for a
 * fingertip. This is the row the web would lose if the ported table dropped
 * canon's `tablet` idiom.
 */
export const TabletSidebar = {
  render: () => <Stage width={900}>{shell(tabletSurface)}</Stage>,
}

/** The same selection, both shells, side by side — acceptance criterion 2. */
export const BothWidths = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      <Stage width={860}>
        {shell(desktopSurface, {
          selected: { kind: DestinationKind.earn },
        })}
      </Stage>
      <Stage width={390}>
        {shell(handheldSurface, {
          selected: { kind: DestinationKind.earn },
        })}
      </Stage>
    </div>
  ),
}

/** Both schemes at the wide width. */
export const BothSchemes = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      <Stage theme="light" width={860}>
        {shell(desktopSurface)}
      </Stage>
      <Stage theme="dark" width={860}>
        {shell(desktopSurface)}
      </Stage>
    </div>
  ),
}

/** Both schemes at the narrow width. */
export const BothSchemesNarrow = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      <Stage theme="light" width={390}>
        {shell(handheldSurface)}
      </Stage>
      <Stage theme="dark" width={390}>
        {shell(handheldSurface)}
      </Stage>
    </div>
  ),
}

/** The sidebar collapsed — canon's `splitVisibility`. */
export const SidebarCollapsed = {
  render: () => (
    <Stage width={1100}>
      {shell(desktopSurface, { isSidebarVisible: false })}
    </Stage>
  ),
}

/**
 * A feature filling the shell's slots — the Notifications bell in the
 * navigation group, Refresh and Visibility in the primary group. The shell
 * renders none of these; they arrive from the destination.
 */
export const WithFeatureToolbarControls = {
  render: () => (
    <Stage width={1100}>
      <ToolbarSlotsProvider>
        <MainShellFragment
          shape="sidebar"
          layout={doSurfaceLayout(desktopSurface)}
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
        >
          <ToolbarSlot placement="navigation">
            <button type="button" aria-label="Notifications">
              🔔
            </button>
          </ToolbarSlot>
          <ToolbarSlot placement="primary">
            <button type="button" aria-label="Refresh">
              ↻
            </button>
          </ToolbarSlot>
          <ToolbarSlot placement="primary">
            <button type="button" aria-label="Visibility Filters">
              👁
            </button>
          </ToolbarSlot>
          <DestinationPlaceholderFragment
            destination={{ kind: DestinationKind.myDay }}
          />
        </MainShellFragment>
      </ToolbarSlotsProvider>
    </Stage>
  ),
}
