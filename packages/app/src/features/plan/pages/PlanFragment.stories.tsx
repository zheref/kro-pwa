/**
 * The whole Plan surface, in the states its render tests assert (`RC-11`).
 *
 * These stories take a rendered canvas as a slot rather than the real
 * `TimelineFragment`, so what is on trial here is the *surface* — the title,
 * the selector, the banner column, the destination container and the FAB —
 * rather than the canvas, which has its own story set.
 */
import type { ReactNode } from 'react'
import type { FABMenuEntry } from '../../../design/chrome'
import { BothSchemes, Stage } from '../../../design/endeavor/storyStage'
import { startOfPlanDay } from '../PlanCalendar'
import { PLAN_REFERENCE_DAY } from '../PlanMocks'
import { PlanViewMode } from '../PlanNavigation'
import { initialPlanVisibility } from '../PlanState'
import { PlanFragment } from './PlanFragment'

export default {
  title: 'Plan/Surface',
  component: PlanFragment,
  parameters: { layout: 'fullscreen' },
}

const selectedDate = startOfPlanDay(PLAN_REFERENCE_DAY)

const fabItems: readonly FABMenuEntry[] = [
  { id: 'task', label: 'Task', glyph: 'checkmark', onSelect: () => {} },
  { id: 'event', label: 'Event', glyph: 'calendar', onSelect: () => {} },
  { id: 'reminder', label: 'Reminder', glyph: 'bell', onSelect: () => {} },
  { id: 'habit', label: 'Habit', glyph: 'repeat', onSelect: () => {} },
]

/** A stand-in canvas: the real one is on trial in `TimelineFragment.stories`. */
const CanvasSlot = (
  <div
    style={{
      flex: 1,
      display: 'grid',
      placeItems: 'center',
      background:
        'repeating-linear-gradient(0deg, transparent 0 59px, var(--kro-color-hairline) 59px 60px)',
      color: 'var(--kro-color-fore-secondary)',
      fontSize: 13,
    }}
  >
    the hour grid
  </div>
)

function Viewport({ children }: { readonly children: ReactNode }) {
  return <div style={{ height: 620, display: 'flex' }}>{children}</div>
}

const surface = (
  overrides: Partial<Parameters<typeof PlanFragment>[0]> = {},
) => (
  <Viewport>
    <PlanFragment
      selectedDate={selectedDate}
      eventCount={3}
      viewMode={PlanViewMode.timeline}
      onSelectViewMode={() => {}}
      destinations={{ timeline: CanvasSlot }}
      staleSyncLabel={null}
      needsReconnect={false}
      onTapReconnect={() => {}}
      isActivityIndicated={false}
      onTapRefresh={() => {}}
      visibility={initialPlanVisibility}
      isVisibilityOpen={false}
      onToggleVisibilityPanel={() => {}}
      isFabAvailable
      isFabGlowActive
      fabItems={fabItems}
      {...overrides}
    />
  </Viewport>
)

/** The ordinary day: title, selector, canvas, and the glowing quick-action. */
export const TimelineDestination = {
  render: () => <Stage width={390}>{surface()}</Stage>,
}

/** Something is in flight — the ONE activity signal replaces the refresh glyph. */
export const Syncing = {
  render: () => <Stage width={390}>{surface({ isActivityIndicated: true })}</Stage>,
}

/** Both status banners, above the canvas rather than over it. */
export const WithStatusBanners = {
  render: () => (
    <Stage width={390}>
      {surface({
        staleSyncLabel: 'Rate limit hit. Last synced 3 min ago',
        needsReconnect: true,
      })}
    </Stage>
  ),
}

/** LIST — the honest placeholder KC-IS-#20 replaces with two props. */
export const ListPlaceholder = {
  render: () => <Stage width={390}>{surface({ viewMode: PlanViewMode.list })}</Stage>,
}

/** MATRIX — the placeholder, AND the FAB standing down as canon requires. */
export const MatrixPlaceholderNoFab = {
  render: () => (
    <Stage width={390}>
      {surface({
        viewMode: PlanViewMode.priorityMatrix,
        isFabAvailable: false,
        isFabGlowActive: false,
      })}
    </Stage>
  ),
}

/** A filtered day — the eye reports it without opening the panel. */
export const FiltersApplied = {
  render: () => (
    <Stage width={390}>
      {surface({
        visibility: { ...initialPlanVisibility, hiddenKinds: ['habit'] },
      })}
    </Stage>
  ),
}

/** Desktop width: the same surface with room to breathe. */
export const DesktopWidth = {
  render: () => <Stage width={900}>{surface()}</Stage>,
}

/** Both schemes, side by side. */
export const BothSchemesTimeline = {
  render: () => <BothSchemes>{surface()}</BothSchemes>,
}
