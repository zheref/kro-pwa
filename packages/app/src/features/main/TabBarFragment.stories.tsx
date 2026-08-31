import type { ReactNode } from 'react'
import { doSurfaceLayout } from './DoSurfaceLayout'
import {
  MainMocks,
  allOpenGates,
  handheldSurface,
  statusQuoGates,
} from './MainMocks'
import { searchDestination, tabBarElements } from './NavigationSections'
import { DestinationKind } from './SidebarDestination'
import { TabBarFragment } from './TabBarFragment'

/**
 * The iPhone tab bar, ported: Plan · Do · Earn, with Search as a leading role
 * rather than a fourth tab, and the standalone Priority Matrix filtered out
 * even when its flag is open.
 */
export default {
  title: 'Shell/Tab bar',
  component: TabBarFragment,
  parameters: { layout: 'fullscreen' },
}

function Stage({
  theme = 'light',
  children,
}: {
  theme?: 'light' | 'dark'
  children: ReactNode
}) {
  return (
    <div
      data-theme={theme}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        width: 390,
        height: 260,
        background:
          'linear-gradient(160deg, var(--kro-color-header-gradient-indigo), var(--kro-color-header-gradient-grape))',
      }}
    >
      {children}
    </div>
  )
}

const props = (
  overrides: Partial<Parameters<typeof TabBarFragment>[0]> = {},
) => ({
  elements: tabBarElements(statusQuoGates),
  selected: MainMocks.handheldLoaded.selected,
  layout: doSurfaceLayout(handheldSurface),
  searchDestination,
  onSelectDestination: () => {},
  ...overrides,
})

/** The shipping bar, on the initial tab. */
export const OnDo = {
  render: () => (
    <Stage>
      <TabBarFragment {...props()} />
    </Stage>
  ),
}

/** Another tab selected — the highlight follows the slice, not the order. */
export const OnEarn = {
  render: () => (
    <Stage>
      <TabBarFragment
        {...props({ selected: { kind: DestinationKind.earn } })}
      />
    </Stage>
  ),
}

/** Every flag open, and still no Priority Matrix tab. */
export const AllFlagsOpen = {
  render: () => (
    <Stage>
      <TabBarFragment {...props({ elements: tabBarElements(allOpenGates) })} />
    </Stage>
  ),
}

/** Both schemes, over the gradient the bar actually sits on. */
export const BothSchemes = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      <Stage theme="light">
        <TabBarFragment {...props()} />
      </Stage>
      <Stage theme="dark">
        <TabBarFragment {...props()} />
      </Stage>
    </div>
  ),
}
