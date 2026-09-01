'use client'

/**
 * The shell — canon `MainScreen`'s `phoneBody` and `wideBody`, as one pure
 * Fragment that picks between them (`RC-15`: it dispatches nothing).
 *
 * ## Which controls the shell owns, and why the two answers differ
 *
 * Canon draws the line twice, in two different files, and both are ported:
 *
 * - **`DoSurfaceLayout.showsProfileControl`** answers for the *destination's
 *   own* toolbar. It is `false` on a handheld precisely because "the handheld
 *   installs Profile once at the tab's `NavigationStack`, so the Do surface
 *   must not add a second one". That is the cell a feature child reads
 *   (`selectDestinationOwnsProfileControls`); this shell never renders a
 *   destination's controls for it.
 * - **`MainScreen.mainScreenToolbar` / `macDoToolbar`** answer for the
 *   *container* — and the container is this shell, in canon's own order:
 *   the primary group is Inbox, then Refresh, then Visibility. So the tab-bar shell does
 *   carry Profile leading and Inbox trailing (canon's phone toolbar, with the
 *   Settings gear on tabs other than Plan and Do), and the sidebar shell
 *   carries the navigation group (Profile) and the primary group (Inbox) in
 *   its content toolbar at any width.
 *
 * The two are not in tension: they are the same ownership rule read from the
 * two ends. The headers a *feature* renders carry no Profile or Inbox on a
 * handheld; the shell's own chrome does.
 *
 * Everything canon puts in those toolbars that belongs to a *feature* —
 * Notifications, Refresh, Visibility, a per-tab preferences gear — is a
 * `ToolbarOutlet`, never hardcoded here.
 */
import { Inbox, PanelLeft, Settings, User } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { SHELL_BOTTOM_INSET_VAR } from '../../design/chrome/layout/chromeLayout'
import { GlassSurface } from '../../design/system/glass/GlassSurface'
import { DetailBackdrop } from '../../design/system/gradient/DetailBackdrop'
import { ICON_SIZE } from '../../design/system/icons/icons'
import { cn } from '../../design/system/utils/cn'
import {
  type DoSurfaceLayout,
  type ShellShape,
  shellBottomInset,
} from './DoSurfaceLayout'
import type { NavigationElement, NavigationSection } from './NavigationSections'
import {
  DestinationKind,
  type SidebarDestination,
  destinationHeading,
} from './SidebarDestination'
import { SidebarFragment, type SidebarFragmentProps } from './SidebarFragment'
import { TabBarFragment } from './TabBarFragment'
import { ToolbarOutlet, useToolbarSlotFilled } from './ToolbarSlots'

export interface MainShellFragmentProps
  extends Omit<SidebarFragmentProps, 'layout' | 'sections' | 'selected'> {
  readonly shape: ShellShape
  readonly layout: DoSurfaceLayout
  readonly selected: SidebarDestination
  readonly sections: readonly NavigationSection[]
  readonly tabs: readonly NavigationElement[]
  readonly searchDestination: SidebarDestination
  readonly isSidebarVisible: boolean
  readonly onToggleSidebar: () => void
  readonly onTapProfile: () => void
  readonly onTapInbox: () => void
  readonly onTapSettings: () => void
  readonly children?: ReactNode
}

export function MainShellFragment(props: MainShellFragmentProps) {
  const {
    shape,
    layout,
    selected,
    sections,
    tabs,
    searchDestination,
    isSidebarVisible,
    onToggleSidebar,
    onTapProfile,
    onTapInbox,
    onTapSettings,
    children,
    ...sidebar
  } = props

  /**
   * What the shell's own bottom chrome reserves, published for the design
   * system's bottom-anchored surfaces (the Active Toast today, the Session
   * Pill when `#22` lands) to clear.
   *
   * A custom property rather than a prop: the toast host is mounted by whoever
   * owns the overlay anchor, which is not this Fragment, and threading a
   * number through every surface in between would give four files a chance to
   * forget. The kit names the property and falls back to `0px`, so it never
   * learns that a shell exists.
   */
  const shellStyle = {
    [SHELL_BOTTOM_INSET_VAR]: `${shellBottomInset(shape, layout)}px`,
  } as CSSProperties

  return shape === 'sidebar' ? (
    <div
      data-testid="shell-sidebar-shape"
      data-shell-shape="sidebar"
      className="relative flex h-dvh w-full overflow-hidden overscroll-y-contain"
      style={shellStyle}
    >
      <DetailBackdrop />

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 gap-kro-small p-kro-small">
        {isSidebarVisible && (
          <SidebarFragment
            {...sidebar}
            sections={sections}
            selected={selected}
            layout={layout}
          />
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ContentToolbar
            layout={layout}
            selected={selected}
            onToggleSidebar={onToggleSidebar}
            onTapProfile={onTapProfile}
            onTapInbox={onTapInbox}
          />

          <main className="relative min-h-0 flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  ) : (
    <div
      data-testid="shell-tab-bar-shape"
      data-shell-shape="tabBar"
      className="relative flex h-dvh w-full flex-col overflow-hidden overscroll-y-contain"
      style={shellStyle}
    >
      <DetailBackdrop />

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col gap-kro-small p-kro-small">
        <TabBarToolbar
          layout={layout}
          selected={selected}
          onTapProfile={onTapProfile}
          onTapInbox={onTapInbox}
          onTapSettings={onTapSettings}
        />

        <main className="relative min-h-0 flex-1 overflow-y-auto">
          {children}
        </main>

        <TabBarFragment
          elements={tabs}
          selected={selected}
          layout={layout}
          searchDestination={searchDestination}
          onSelectDestination={sidebar.onSelectDestination}
        />
      </div>
    </div>
  )
}

/**
 * The sidebar shell's content toolbar — canon's `macDoToolbar`.
 *
 * `navigation` group: Profile (shell-owned) then whatever a feature slots
 * beside it, which is canon's Notifications bell.
 * `primary` group: Inbox (shell-owned) then the feature's Refresh and
 * Visibility.
 */
function ContentToolbar({
  layout,
  selected,
  onToggleSidebar,
  onTapProfile,
  onTapInbox,
}: {
  readonly layout: DoSurfaceLayout
  readonly selected: SidebarDestination
  readonly onToggleSidebar: () => void
  readonly onTapProfile: () => void
  readonly onTapInbox: () => void
}) {
  return (
    <GlassSurface
      as="header"
      material="surface"
      data-testid="shell-content-toolbar"
      className="relative z-10 flex shrink-0 items-center justify-between px-kro-medium"
      style={{
        gap: `${layout.minimumControlSpacing}px`,
        minHeight: `${layout.minimumControlSide + 16}px`,
      }}
    >
      <div
        className="flex items-center"
        style={{ gap: `${layout.minimumControlSpacing}px` }}
      >
        <ToolbarButton
          label="Toggle Sidebar"
          layout={layout}
          onClick={onToggleSidebar}
        >
          <PanelLeft size={ICON_SIZE.medium} aria-hidden="true" />
        </ToolbarButton>

        {layout.showsProfileControl && (
          <ProfileControl layout={layout} onTapProfile={onTapProfile} />
        )}

        <ToolbarOutlet
          placement="navigation"
          className="flex items-center gap-kro-small"
        />

        <h1
          className={cn(
            'font-semibold text-kro-fore',
            layout.usesExpandedDayTitle ? 'text-xl' : 'text-base',
          )}
        >
          {destinationHeading(selected)}
        </h1>
      </div>

      <div
        className="flex items-center"
        style={{ gap: `${layout.minimumControlSpacing}px` }}
      >
        {/*
          Inbox FIRST, then the feature's slot (KC-IS-#71 item 4).

          Canon's `macDoToolbar` builds its primary group as Inbox, Refresh,
          Visibility — the shell's own control leads and the destination's two
          follow. The outlet used to be rendered first, which put a Do surface's
          Refresh and Visibility to the left of Inbox and read as a different
          toolbar from the one KroApple ships.
        */}
        {layout.showsInboxControl && (
          <ToolbarButton label="Inbox" layout={layout} onClick={onTapInbox}>
            <Inbox size={ICON_SIZE.medium} aria-hidden="true" />
          </ToolbarButton>
        )}

        <ToolbarOutlet
          placement="primary"
          className="flex items-center gap-kro-small"
        />
      </div>
    </GlassSurface>
  )
}

/**
 * The tab-bar shell's top bar — canon's `mainScreenToolbar`.
 *
 * Canon's branch, ported exactly: Plan and Do get Profile alone on the
 * leading side; every other tab gets Profile plus the Settings gear. Inbox is
 * always trailing.
 */
function TabBarToolbar({
  layout,
  selected,
  onTapProfile,
  onTapInbox,
  onTapSettings,
}: {
  readonly layout: DoSurfaceLayout
  readonly selected: SidebarDestination
  readonly onTapProfile: () => void
  readonly onTapInbox: () => void
  readonly onTapSettings: () => void
}) {
  const isPrimaryTab =
    selected.kind === DestinationKind.myDay ||
    selected.kind === DestinationKind.plan

  return (
    <GlassSurface
      as="header"
      material="surface"
      data-testid="shell-tab-bar-toolbar"
      className="relative z-10 flex shrink-0 items-center justify-between px-kro-medium"
      style={{
        gap: `${layout.minimumControlSpacing}px`,
        minHeight: `${layout.minimumControlSide + 8}px`,
      }}
    >
      <div
        className="flex items-center"
        style={{ gap: `${layout.minimumControlSpacing}px` }}
      >
        <ProfileControl layout={layout} onTapProfile={onTapProfile} />

        {!isPrimaryTab && (
          <ToolbarButton
            label="Settings"
            layout={layout}
            onClick={onTapSettings}
          >
            <Settings size={ICON_SIZE.medium} aria-hidden="true" />
          </ToolbarButton>
        )}

        <ToolbarOutlet
          placement="leading"
          className="flex items-center gap-kro-small"
        />
      </div>

      <h1 className="truncate font-semibold text-base text-kro-fore">
        {destinationHeading(selected)}
      </h1>

      <div
        className="flex items-center"
        style={{ gap: `${layout.minimumControlSpacing}px` }}
      >
        <ToolbarOutlet
          placement="trailing"
          className="flex items-center gap-kro-small"
        />

        <ToolbarButton label="Inbox" layout={layout} onClick={onTapInbox}>
          <Inbox size={ICON_SIZE.medium} aria-hidden="true" />
        </ToolbarButton>
      </div>
    </GlassSurface>
  )
}

/**
 * The Profile control — the shell's placement, a feature's content.
 *
 * The outlet is always rendered, so a feature's `ToolbarSlot placement="profile"`
 * has somewhere to portal into. The shell's own button renders **only while no
 * feature has supplied one**, which is what keeps the flag-off path
 * byte-identical to what shipped: with nothing slotted this is the same
 * `ToolbarButton` calling the same `onTapProfile`, in the same position.
 *
 * The settings child (KC-IS-#32) fills the slot with canon's
 * `ProfilePopoverView` trigger; the comment in `MainShellPage` that said the
 * popover "belongs to the settings child" is the contract this implements.
 */
function ProfileControl({
  layout,
  onTapProfile,
}: {
  readonly layout: DoSurfaceLayout
  readonly onTapProfile: () => void
}) {
  const isSlotted = useToolbarSlotFilled('profile')

  return (
    <>
      <ToolbarOutlet placement="profile" className="flex items-center" />
      {isSlotted ? null : (
        <ToolbarButton label="Profile" layout={layout} onClick={onTapProfile}>
          <User size={ICON_SIZE.medium} aria-hidden="true" />
        </ToolbarButton>
      )}
    </>
  )
}

function ToolbarButton({
  label,
  layout,
  onClick,
  children,
}: {
  readonly label: string
  readonly layout: DoSurfaceLayout
  readonly onClick: () => void
  readonly children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex items-center justify-center rounded-kro-small text-kro-fore hover:text-kro-accent"
      style={{
        minWidth: `${layout.minimumControlSide}px`,
        minHeight: `${layout.minimumControlSide}px`,
      }}
    >
      {children}
    </button>
  )
}
