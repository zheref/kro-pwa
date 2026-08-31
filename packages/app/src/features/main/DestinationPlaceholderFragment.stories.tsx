import type { ReactNode } from 'react'
import { DestinationPlaceholderFragment } from './DestinationPlaceholderFragment'
import { DestinationKind } from './SidebarDestination'

/**
 * What every destination renders until its feature child lands.
 *
 * The stories double as the naming check a reviewer can do by eye: the
 * content reads "My Day", "Inbox" and "Settings" while the sidebar rows for
 * the same destinations read "Today", "Jot Down" and "Adjust".
 */
export default {
  title: 'Shell/Destination placeholder',
  component: DestinationPlaceholderFragment,
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
        height: 360,
        background: 'var(--kro-color-back)',
        color: 'var(--kro-color-fore)',
      }}
    >
      {children}
    </div>
  )
}

export const MyDay = {
  render: () => (
    <Stage>
      <DestinationPlaceholderFragment
        destination={{ kind: DestinationKind.myDay }}
      />
    </Stage>
  ),
}

export const Inbox = {
  render: () => (
    <Stage>
      <DestinationPlaceholderFragment
        destination={{ kind: DestinationKind.inbox }}
      />
    </Stage>
  ),
}

export const AProjectList = {
  render: () => (
    <Stage>
      <DestinationPlaceholderFragment
        destination={{
          kind: DestinationKind.list,
          listId: 'p-1',
          listTitle: 'Home',
        }}
      />
    </Stage>
  ),
}

export const BothSchemes = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      <Stage theme="light">
        <DestinationPlaceholderFragment
          destination={{ kind: DestinationKind.earn }}
        />
      </Stage>
      <Stage theme="dark">
        <DestinationPlaceholderFragment
          destination={{ kind: DestinationKind.earn }}
        />
      </Stage>
    </div>
  ),
}
