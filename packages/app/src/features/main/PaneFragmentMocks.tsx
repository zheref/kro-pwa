/**
 * The props the pane segment Fragments' stories and render tests share, so a
 * story and its mirroring test can never draw two different scenes (`RC-11`,
 * `RC-31`).
 */
import type { ReactNode } from 'react'
import type { PerformancePaneFragmentProps } from './PerformancePaneFragment'
import type { TimelinePaneFragmentProps } from './TimelinePaneFragment'
import { ToolbarOutlet, ToolbarSlotsProvider } from './ToolbarSlots'

const body = (label: string) => (
  <p data-testid="pane-reading-body" className="p-kro-medium">
    {label}
  </p>
)

export const PerformancePaneFragmentMocks = {
  dayProgress: { reading: 'dayProgress', children: body('Day Progress') },
  endeavorActivity: {
    reading: 'endeavorActivity',
    children: body('Endeavor Activity'),
  },
  hidden: { reading: null, children: body('Day Progress') },
} satisfies Record<string, PerformancePaneFragmentProps>

export const TimelinePaneFragmentMocks = {
  shown: { isShown: true, children: body('Today’s timeline') },
  emptyDay: { isShown: true, children: body('Nothing planned today') },
  hidden: { isShown: false, children: body('Today’s timeline') },
} satisfies Record<string, TimelinePaneFragmentProps>

/** The pane body outlet a segment Fragment portals into. */
export function PaneBody({ children }: { readonly children: ReactNode }) {
  return (
    <ToolbarSlotsProvider>
      <div data-testid="pane-body">
        <ToolbarOutlet placement="detailPane" className="flex flex-col" />
      </div>
      {children}
    </ToolbarSlotsProvider>
  )
}
