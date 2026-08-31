'use client'

/**
 * The handheld tab bar — canon `MainScreen.ios26TabView` (`RC-15`).
 *
 * Canon's iPhone renders `TabView(selection:)` over
 * `phoneNavigationElements` — Plan · Do · Earn, the standalone Priority Matrix
 * filtered out — plus a leading `Tab(value: .search, role: .search)`, which is
 * a search *role*, not another ordinary tab. Both are ported: the tabs come
 * from `tabBarElements`, and Search is rendered beside them with its own
 * label, so it neither sorts nor highlights like a destination.
 *
 * Labels are canon's iOS strings (`destinationTabLabel`), which is why My Day
 * reads "Do" here and "Today" in the sidebar.
 *
 * The bar is KroGlass in its `bar` material — the same treatment canon's
 * `.toolbarBackground(.hidden)` + Liquid Glass tab bar gives it.
 */
import { type LucideIcon, Search } from 'lucide-react'
import { GlassSurface } from '../../design/system/glass/GlassSurface'
import { ICON_SIZE } from '../../design/system/icons/icons'
import { cn } from '../../design/system/utils/cn'
import type { DoSurfaceLayout } from './DoSurfaceLayout'
import type { NavigationElement } from './NavigationSections'
import {
  type SidebarDestination,
  destinationIcon,
  destinationId,
  destinationTabLabel,
  isSameDestination,
} from './SidebarDestination'

export interface TabBarFragmentProps {
  readonly elements: readonly NavigationElement[]
  readonly selected: SidebarDestination
  readonly layout: DoSurfaceLayout
  /** Canon's `Tab(role: .search)` — chrome, not a tab. */
  readonly searchDestination: SidebarDestination
  readonly onSelectDestination: (destination: SidebarDestination) => void
}

export function TabBarFragment(props: TabBarFragmentProps) {
  const { elements, selected, layout, searchDestination, onSelectDestination } =
    props

  return (
    <GlassSurface
      as="nav"
      material="bar"
      aria-label="Tabs"
      data-testid="shell-tab-bar"
      className="flex w-full items-stretch justify-around"
      style={{
        gap: `${layout.minimumControlSpacing}px`,
        paddingTop: `${layout.minimumControlSpacing}px`,
        paddingBottom: `${layout.minimumControlSpacing}px`,
      }}
    >
      <TabButton
        destination={searchDestination}
        label="Search"
        icon={Search}
        isSelected={isSameDestination(searchDestination, selected)}
        layout={layout}
        onSelect={onSelectDestination}
      />

      {elements.map((element) => (
        <TabButton
          key={destinationId(element.destination)}
          destination={element.destination}
          label={destinationTabLabel(element.destination)}
          icon={destinationIcon(element.destination)}
          isSelected={isSameDestination(element.destination, selected)}
          layout={layout}
          onSelect={onSelectDestination}
        />
      ))}
    </GlassSurface>
  )
}

function TabButton({
  destination,
  label,
  icon: Icon,
  isSelected,
  layout,
  onSelect,
}: {
  readonly destination: SidebarDestination
  readonly label: string
  readonly icon: LucideIcon
  readonly isSelected: boolean
  readonly layout: DoSurfaceLayout
  readonly onSelect: (destination: SidebarDestination) => void
}) {
  return (
    <button
      type="button"
      aria-current={isSelected ? 'page' : undefined}
      onClick={() => onSelect(destination)}
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-kro-tiny',
        'rounded-kro-small text-xs',
        isSelected
          ? 'font-semibold text-kro-accent'
          : 'text-kro-fore-secondary',
      )}
      style={{
        minWidth: `${layout.minimumControlSide}px`,
        minHeight: `${layout.minimumControlSide}px`,
      }}
    >
      <Icon size={ICON_SIZE.medium} />
      <span>{label}</span>
    </button>
  )
}
