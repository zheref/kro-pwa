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
import {
  CalendarClock,
  ChartNoAxesColumn,
  Inbox,
  PanelLeft,
  Settings,
  Timer,
  User,
} from 'lucide-react'
import {
  type CSSProperties,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { SHELL_BOTTOM_INSET_VAR } from '../../design/chrome/layout/chromeLayout'
import {
  DETAIL_PANEL_ACCESSORY_INSET_VAR,
  DETAIL_PANEL_GEOMETRY,
  LARGE_TITLE_SELECTOR,
  TrailingDetailPanel,
  detailPanelAccessoryInset,
} from '../../design/chrome/panel/TrailingDetailPanel'
import { DetailBackdrop } from '../../design/system/gradient/DetailBackdrop'
import { ICON_SIZE } from '../../design/system/icons/icons'
import {
  TOOLBAR_GLYPH_BUTTON,
  TOOLBAR_GLYPH_BUTTON_PX,
} from '../../design/system/rowHighlight'
import { cn } from '../../design/system/utils/cn'
import {
  type DoSurfaceLayout,
  type ShellShape,
  shellBottomInset,
} from './DoSurfaceLayout'
import {
  DETAIL_PANE_SEGMENTS,
  type DetailPaneSegment,
  detailPaneSegmentLabel,
} from './DetailPane'
import type { NavigationElement, NavigationSection } from './NavigationSections'
import {
  DestinationKind,
  type SidebarDestination,
  destinationHeading,
} from './SidebarDestination'
import { SidebarFragment, type SidebarFragmentProps } from './SidebarFragment'
import { TabBarFragment } from './TabBarFragment'
import { CapsuleSegmentGroup } from '../../design/hig/selection/CapsuleSegmentGroup'
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
  /** The trailing detail pane — `null` where this window does not host one. */
  readonly detailPane?: DetailPaneChrome | null
  readonly children?: ReactNode
}

/**
 * What the shell draws for the trailing detail pane: the toolbar's segment
 * group and the glass surface. The body is not here — it portals into the
 * surface through the `detailPane` outlet, from whichever feature fills it.
 */
export interface DetailPaneChrome {
  readonly segment: DetailPaneSegment | null
  readonly title: string | null
  readonly subtitle: string | null
  readonly onSelectSegment: (segment: DetailPaneSegment) => void
  readonly onDismiss: () => void
  /** Present while drilled in: the header's leading control is Back. */
  readonly onBack?: (() => void) | null
  /** The drill-in depth, and a key for the reading shown. */
  readonly navigationDepth?: number
  readonly navigationKey?: string
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
    detailPane = null,
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
  const isDetailPanePresented =
    shape === 'sidebar' && detailPane !== null && detailPane.segment !== null

  const shellStyle = {
    [SHELL_BOTTOM_INSET_VAR]: `${shellBottomInset(shape, layout)}px`,
    // Canon moves the bottom-trailing accessory (the FAB) aside by the
    // pane's width plus 12 while the pane shows; every FAB reads this.
    [DETAIL_PANEL_ACCESSORY_INSET_VAR]: detailPanelAccessoryInset(
      isDetailPanePresented,
    ),
  } as CSSProperties

  /*
    Portaled panels (Inbox, a Radix popover) render on `document.body`, outside
    this shell, so a `data-kro-idiom` on the shell alone would not reach them.
    The document element is the one ancestor they still have. Default buttons
    read it to pick the menu-row corner or a pill.
  */
  useLayoutEffect(() => {
    const root = document.documentElement
    const idiom = shape === 'sidebar' ? 'desktop' : 'mobile'
    root.setAttribute('data-kro-idiom', idiom)
    return () => {
      if (root.getAttribute('data-kro-idiom') === idiom) {
        root.removeAttribute('data-kro-idiom')
      }
    }
  }, [shape])

  const shellRef = useRef<HTMLDivElement>(null)
  // A feature slotting a title control (the session's mode toggle) replaces
  // the pane's title text with it, centred.
  const isPaneTitleSlotted = useToolbarSlotFilled('detailPaneTitle')
  // A reading's own sub-screen Back takes the header's leading seat.
  const isPaneLeadingSlotted = useToolbarSlotFilled('detailPaneLeading')
  const panelTop = useLargeTitleBottom(
    shellRef,
    shape === 'sidebar' && detailPane !== null,
  )

  return shape === 'sidebar' ? (
    <div
      ref={shellRef}
      data-testid="shell-sidebar-shape"
      data-shell-shape="sidebar"
      data-kro-idiom="desktop"
      className="relative flex h-dvh w-full overflow-hidden overscroll-y-contain"
      style={shellStyle}
    >
      <DetailBackdrop />
      <div
        data-kro-title-slab-host=""
        data-testid="shell-title-slab-host"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1]"
      />

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 gap-kro-small pb-kro-small pl-kro-small">
        {isSidebarVisible && (
          <SidebarFragment
            {...sidebar}
            sections={sections}
            selected={selected}
            layout={layout}
          />
        )}

        <ContentColumn>
          <ContentToolbar
            layout={layout}
            selected={selected}
            onToggleSidebar={onToggleSidebar}
            onTapProfile={onTapProfile}
            onTapInbox={onTapInbox}
            detailPane={detailPane}
          />

          <main className="relative z-0 min-h-0 flex-1 overflow-x-clip overflow-y-auto">
            {children}
          </main>
        </ContentColumn>
      </div>

      {detailPane === null ? null : (
        <TrailingDetailPanel
          isPresented={isDetailPanePresented}
          title={detailPane.title ?? ''}
          subtitle={detailPane.subtitle}
          onDismiss={detailPane.onDismiss}
          onBack={detailPane.onBack ?? null}
          navigationDepth={detailPane.navigationDepth ?? 0}
          navigationKey={detailPane.navigationKey}
          topInset={panelTop ?? undefined}
          titleContent={
            isPaneTitleSlotted ? (
              <ToolbarOutlet
                placement="detailPaneTitle"
                className="flex items-center"
              />
            ) : null
          }
          backdrop={<ToolbarOutlet placement="detailPaneBackdrop" />}
          leadingAccessory={
            isPaneLeadingSlotted ? (
              <ToolbarOutlet
                placement="detailPaneLeading"
                className="flex items-center"
              />
            ) : undefined
          }
          trailingAccessory={
            <ToolbarOutlet
              placement="detailPaneTrailing"
              className="flex items-center"
            />
          }
        >
          <ToolbarOutlet
            placement="detailPane"
            className="flex flex-1 flex-col"
          />
        </TrailingDetailPanel>
      )}
    </div>
  ) : (
    <div
      data-testid="shell-tab-bar-shape"
      data-shell-shape="tabBar"
      data-kro-idiom="mobile"
      className="relative flex h-dvh w-full flex-col overflow-hidden overscroll-y-contain"
      style={shellStyle}
    >
      <DetailBackdrop />
      <div
        data-kro-title-slab-host=""
        data-testid="shell-title-slab-host"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1]"
      />

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col gap-kro-small pb-kro-small">
        <TabBarToolbar
          layout={layout}
          selected={selected}
          onTapProfile={onTapProfile}
          onTapInbox={onTapInbox}
          onTapSettings={onTapSettings}
        />

        <ContentColumn>
          <main className="relative z-0 min-h-0 flex-1 overflow-x-clip overflow-y-auto">
            {children}
          </main>
        </ContentColumn>

        <div className="relative z-10 px-kro-small">
          <TabBarFragment
            elements={tabs}
            selected={selected}
            layout={layout}
            searchDestination={searchDestination}
            onSelectDestination={sidebar.onSelectDestination}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * The content column reaches the window's trailing edge so a destination's
 * own LargeScreenTitle slab can too.
 *
 * The diagonal indigo→grape clip is **the title component's background**, not
 * this column's — canon anchors a 1000pt ramp at the title's bottom edge so
 * extra height reaches *up* through the toolbar, never *down* through
 * Suggestions. The toolbar is transparent so that slab shows through; the
 * slab itself portals into `data-kro-title-slab-host` to start at the
 * window origin.
 */
function ContentColumn({ children }: { readonly children: ReactNode }) {
  return (
    <div
      data-testid="shell-content-column"
      className="relative flex min-h-0 min-w-0 flex-1 flex-col"
    >
      {children}
    </div>
  )
}

/**
 * The sidebar shell's content toolbar — canon's `macDoToolbar`.
 *
 * Transparent on purpose: LargeScreenTitle's slab grows from the window's
 * origin and passes *under* these controls. The destination heading lives on
 * that title (My Day, Plan); every other destination still prints one here.
 *
 * `navigation` group, on the leading side after the sidebar toggle: Visibility,
 * then Refresh, then the shell's Inbox.
 * Trailing side: the detail pane's reading group, then the `primary` group
 * (the Notifications bell), then Profile.
 */
function ContentToolbar({
  layout,
  selected,
  onToggleSidebar,
  onTapProfile,
  onTapInbox,
  detailPane,
}: {
  readonly layout: DoSurfaceLayout
  readonly selected: SidebarDestination
  readonly onToggleSidebar: () => void
  readonly onTapProfile: () => void
  readonly onTapInbox: () => void
  readonly detailPane: DetailPaneChrome | null
}) {
  const paintsLargeTitle = destinationPaintsLargeTitle(selected)

  return (
    // Above the content column's main (`z-0`). An anchored panel (Visibility,
    // Notifications) hangs out of this bar; if main is a later sibling at the
    // same level, the title and the page paint over that panel.
    <header
      data-testid="shell-content-toolbar"
      className="relative z-20 flex shrink-0 items-center justify-between pr-kro-medium pl-kro-small"
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
          <PanelLeft size={headerGlyph(layout)} aria-hidden="true" />
        </ToolbarButton>

        <ToolbarOutlet
          placement="navigation"
          className="flex items-center gap-kro-small"
        />

        {layout.showsInboxControl && (
          <ToolbarButton label="Inbox" layout={layout} onClick={onTapInbox}>
            <Inbox size={headerGlyph(layout)} aria-hidden="true" />
          </ToolbarButton>
        )}

        {paintsLargeTitle ? null : (
          <h1
            className={cn(
              'font-semibold kro-on-gradient',
              layout.usesExpandedDayTitle ? 'text-xl' : 'text-base',
            )}
          >
            {destinationHeading(selected)}
          </h1>
        )}
      </div>

      <div
        className="flex items-center"
        style={{ gap: `${layout.minimumControlSpacing}px` }}
      >
        {detailPane === null ? null : (
          <DetailPaneSegmentGroup layout={layout} detailPane={detailPane} />
        )}

        <ToolbarOutlet
          placement="primary"
          className="flex items-center gap-kro-small"
        />

        {layout.showsProfileControl && (
          <div className="ml-kro-small">
            <ProfileControl layout={layout} onTapProfile={onTapProfile} />
          </div>
        )}
      </div>
    </header>
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
  const paintsLargeTitle = destinationPaintsLargeTitle(selected)

  return (
    <header
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
            <Settings size={headerGlyph(layout)} aria-hidden="true" />
          </ToolbarButton>
        )}

        <ToolbarOutlet
          placement="leading"
          className="flex items-center gap-kro-small"
        />
      </div>

      {paintsLargeTitle ? null : (
        <h1 className="truncate font-semibold text-base kro-on-gradient">
          {destinationHeading(selected)}
        </h1>
      )}

      <div
        className="flex items-center"
        style={{ gap: `${layout.minimumControlSpacing}px` }}
      >
        <ToolbarOutlet
          placement="trailing"
          className="flex items-center gap-kro-small"
        />

        <ToolbarButton label="Inbox" layout={layout} onClick={onTapInbox}>
          <Inbox size={headerGlyph(layout)} aria-hidden="true" />
        </ToolbarButton>
      </div>
    </header>
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
          <User size={headerGlyph(layout)} aria-hidden="true" />
        </ToolbarButton>
      )}
    </>
  )
}

/**
 * Where the trailing pane starts: the bottom of the page's large title (My
 * Day's and Plan's header), plus the pane's own bottom margin as breathing
 * room — so the glass never covers the title. `null` where the page has no
 * large title; the panel then keeps canon's 96.
 *
 * Measured, not a constant: the title's height moves with its content (the
 * expanded day title, a wrapped subtitle, the rings). It is read at the
 * page's scroll origin, so scrolling the page does not move the pane.
 */
function useLargeTitleBottom(
  shellRef: { readonly current: HTMLElement | null },
  isActive: boolean,
): number | null {
  const [bottom, setBottom] = useState<number | null>(null)

  useLayoutEffect(() => {
    const shell = shellRef.current
    if (!isActive || shell === null) return

    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const title = shell.querySelector(LARGE_TITLE_SELECTOR)
        if (title === null) {
          setBottom(null)
          return
        }
        const scroller = title.closest('main')
        const offset =
          title.getBoundingClientRect().bottom -
          shell.getBoundingClientRect().top +
          (scroller?.scrollTop ?? 0)
        setBottom(Math.round(offset) + DETAIL_PANEL_GEOMETRY.bottomMargin)
      })
    }

    measure()
    // `ResizeObserver` where the platform has one; a window resize otherwise.
    const resize =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    resize?.observe(shell)
    if (resize === null) window.addEventListener('resize', measure)
    const mutation = new MutationObserver(measure)
    mutation.observe(shell, { childList: true, subtree: true })
    return () => {
      cancelAnimationFrame(frame)
      resize?.disconnect()
      window.removeEventListener('resize', measure)
      mutation.disconnect()
    }
  }, [shellRef, isActive])

  return bottom
}

/**
 * Canon's `macDetailPaneToolbarGroup`: one icon-only button per segment, the
 * selected one filled. Selecting the segment already showing hides the pane.
 */
function DetailPaneSegmentGroup({
  layout,
  detailPane,
}: {
  readonly layout: DoSurfaceLayout
  readonly detailPane: DetailPaneChrome
}) {
  return (
    <CapsuleSegmentGroup
      label="Detail pane"
      testId="detail-pane-segments"
      options={DETAIL_PANE_SEGMENTS.map((segment) => {
        const Glyph = DETAIL_PANE_GLYPH[segment]
        return {
          value: segment,
          label: detailPaneSegmentLabel(segment),
          icon: (isSelected: boolean) => (
            <Glyph
              size={headerGlyph(layout)}
              strokeWidth={isSelected ? 2.5 : 2}
              aria-hidden="true"
            />
          ),
        }
      })}
      value={detailPane.segment}
      onSelect={detailPane.onSelectSegment}
    />
  )
}

/** Canon's `systemImage`s: timer, chart.bar.fill, calendar.day.timeline.left. */
const DETAIL_PANE_GLYPH = {
  sessionSetup: Timer,
  performance: ChartNoAxesColumn,
  plan: CalendarClock,
} as const satisfies Record<DetailPaneSegment, unknown>

function headerGlyph(layout: DoSurfaceLayout): number {
  return layout.isTouchPrimary ? ICON_SIZE.medium : ICON_SIZE.small
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
      className={cn(TOOLBAR_GLYPH_BUTTON, 'kro-on-gradient')}
      style={
        layout.isTouchPrimary
          ? {
              minWidth: layout.minimumControlSide,
              minHeight: layout.minimumControlSide,
            }
          : {
              width: TOOLBAR_GLYPH_BUTTON_PX,
              height: TOOLBAR_GLYPH_BUTTON_PX,
            }
      }
    >
      {children}
    </button>
  )
}

function destinationPaintsLargeTitle(destination: SidebarDestination): boolean {
  return (
    destination.kind === DestinationKind.myDay ||
    destination.kind === DestinationKind.plan
  )
}
