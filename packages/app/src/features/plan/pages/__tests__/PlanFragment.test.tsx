/**
 * The Plan surface's render tests, mirroring `PlanFragment.stories` (`RC-11`).
 *
 * What this suite is for, beyond "it renders": the three rules that are
 * *decisions* rather than markup — the FAB standing down over the matrix, the
 * one activity signal, and the destination seam KC-IS-#20 plugs into.
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FABMenuEntry } from '../../../../design/chrome'
import { ToolbarOutlet, ToolbarSlotsProvider } from '../../../main/ToolbarSlots'
import { PLAN_REFERENCE_DAY } from '../../PlanMocks'
import { startOfPlanDay } from '../../PlanCalendar'
import { PlanViewMode } from '../../PlanNavigation'
import { initialPlanVisibility } from '../../PlanState'
import { PlanFragment } from '../PlanFragment'

afterEach(cleanup)

const selectedDate = startOfPlanDay(PLAN_REFERENCE_DAY)

const fabItems: readonly FABMenuEntry[] = [
  { id: 'task', label: 'Task', glyph: 'checkmark', onSelect: () => {} },
  { id: 'event', label: 'Event', glyph: 'calendar', onSelect: () => {} },
]

const mount = (
  overrides: Partial<Parameters<typeof PlanFragment>[0]> = {},
  wrap: (node: React.ReactNode) => React.ReactNode = (node) => node,
) =>
  render(
    <>
      {wrap(
        <PlanFragment
          selectedDate={selectedDate}
          eventCount={3}
          viewMode={PlanViewMode.timeline}
          onSelectViewMode={() => {}}
          destinations={{ timeline: <p data-testid="timeline-slot">canvas</p> }}
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
        />,
      )}
    </>,
  )

describe('PlanFragment', () => {
  it('titles the day the way canon does, with the visible event count under it', () => {
    mount()

    expect(screen.getByText(/Jun 18/)).toBeTruthy()
    expect(screen.getByTestId('plan-subtitle').textContent).toBe('3 events')
  })

  it('renders the timeline destination it was handed', () => {
    mount()

    expect(screen.getByTestId('timeline-slot')).toBeTruthy()
    expect(screen.queryByTestId('plan-mode-placeholder')).toBeNull()
  })

  it('renders an HONEST placeholder for a destination KC-IS-#20 has not filled', () => {
    mount({ viewMode: PlanViewMode.list })

    const placeholder = screen.getByTestId('plan-mode-placeholder')
    expect(placeholder.dataset.mode).toBe(PlanViewMode.list)
    expect(placeholder.textContent).toContain('KC-IS-#20')
    expect(screen.queryByTestId('timeline-slot')).toBeNull()
  })

  it('renders a slot the moment KC-IS-#20 supplies one — no timeline file moves', () => {
    mount({
      viewMode: PlanViewMode.list,
      destinations: {
        timeline: <p data-testid="timeline-slot">canvas</p>,
        list: <p data-testid="list-slot">rows</p>,
      },
    })

    expect(screen.getByTestId('list-slot')).toBeTruthy()
    expect(screen.queryByTestId('plan-mode-placeholder')).toBeNull()
  })

  it('records which side a mode swap travels from, taking the short way round', () => {
    const { rerender } = render(
      <PlanFragment
        selectedDate={selectedDate}
        eventCount={0}
        viewMode={PlanViewMode.timeline}
        onSelectViewMode={() => {}}
        destinations={{ timeline: <p>canvas</p> }}
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
      />,
    )

    const read = () => screen.getByTestId('plan-destination').dataset.entryEdge

    rerender(
      <PlanFragment
        selectedDate={selectedDate}
        eventCount={0}
        viewMode={PlanViewMode.list}
        onSelectViewMode={() => {}}
        destinations={{ timeline: <p>canvas</p> }}
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
      />,
    )
    expect(read()).toBe('trailing')

    rerender(
      <PlanFragment
        selectedDate={selectedDate}
        eventCount={0}
        viewMode={PlanViewMode.timeline}
        onSelectViewMode={() => {}}
        destinations={{ timeline: <p>canvas</p> }}
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
      />,
    )
    expect(read()).toBe('leading')
  })

  it('shows the quick-action button with its glow on the timeline', () => {
    mount()

    expect(screen.getByTestId('plan-fab')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add' })).toBeTruthy()
    expect(
      screen.getByTestId('plan-fab').querySelector('[data-kro-glow="active"]'),
    ).toBeTruthy()
  })

  it('stands the FAB down over the matrix — each quadrant carries its own add', () => {
    mount({
      viewMode: PlanViewMode.priorityMatrix,
      isFabAvailable: false,
      isFabGlowActive: false,
    })

    expect(screen.queryByTestId('plan-fab')).toBeNull()
  })

  it('unfurls the kind menu, one row per capture kind', async () => {
    const onSelect = vi.fn()
    mount({
      fabItems: [
        { id: 'event', label: 'Event', glyph: 'calendar', onSelect },
      ],
    })

    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    await userEvent.click(screen.getByRole('button', { name: 'Event' }))

    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('shows ONE activity signal — a spinner in place of the refresh glyph', () => {
    mount({ isActivityIndicated: true })

    const refresh = screen.getByTestId('plan-refresh')
    expect(refresh.dataset.busy).toBe('true')
    expect(refresh.getAttribute('aria-busy')).toBe('true')
    expect(refresh.getAttribute('aria-label')).toBe('Syncing')
  })

  it('refreshes on demand while nothing is in flight', async () => {
    const onTapRefresh = vi.fn()
    mount({ onTapRefresh })

    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(onTapRefresh).toHaveBeenCalledTimes(1)
  })

  it('draws an open eye with nothing filtered and a struck one otherwise', () => {
    const { rerender } = mount()
    expect(screen.getByTestId('plan-visibility-toggle').dataset.filtered).toBe(
      'false',
    )

    rerender(
      <PlanFragment
        selectedDate={selectedDate}
        eventCount={0}
        viewMode={PlanViewMode.timeline}
        onSelectViewMode={() => {}}
        destinations={{ timeline: <p>canvas</p> }}
        staleSyncLabel={null}
        needsReconnect={false}
        onTapReconnect={() => {}}
        isActivityIndicated={false}
        onTapRefresh={() => {}}
        visibility={{ ...initialPlanVisibility, hiddenKinds: ['habit'] }}
        isVisibilityOpen={false}
        onToggleVisibilityPanel={() => {}}
        isFabAvailable
        isFabGlowActive
        fabItems={fabItems}
      />,
    )
    expect(screen.getByTestId('plan-visibility-toggle').dataset.filtered).toBe(
      'true',
    )
  })

  it('opens the lens panel only once asked, and renders the panel it was given', () => {
    mount({
      isVisibilityOpen: true,
      visibilityPanel: <p data-testid="lens-panel">lens</p>,
    })

    expect(screen.getByTestId('lens-panel')).toBeTruthy()
  })

  it('portals its toolbar controls into the shell outlets when a shell is present', () => {
    mount({}, (node) => (
      <ToolbarSlotsProvider>
        <ToolbarOutlet placement="leading" />
        <ToolbarOutlet placement="trailing" />
        {node}
      </ToolbarSlotsProvider>
    ))

    const leading = document.querySelector('[data-toolbar-outlet="leading"]')
    const trailing = document.querySelector('[data-toolbar-outlet="trailing"]')
    expect(leading?.querySelector('[data-testid="plan-refresh"]')).toBeTruthy()
    expect(
      trailing?.querySelector('[data-testid="plan-visibility-toggle"]'),
    ).toBeTruthy()
  })

  it('draws those controls in place when there is no shell, so they are never lost', () => {
    mount()

    const refresh = screen.getByTestId('plan-refresh-slot')
    expect(refresh).toBeTruthy()
    expect(screen.getByTestId('plan-visibility-slot')).toBeTruthy()
    // The fallback row is visible, because it is carrying them.
    expect(refresh.parentElement?.classList.contains('hidden')).toBe(false)
  })

  it('collapses the fallback row explicitly once BOTH controls have portalled', () => {
    // Not left to `:empty`: a portalled slot renders nothing here, but one
    // stray text node would keep the row occupying layout while looking empty.
    // The row asks the same question its children ask.
    mount({}, (node) => (
      <ToolbarSlotsProvider>
        <ToolbarOutlet placement="leading" />
        <ToolbarOutlet placement="trailing" />
        {node}
      </ToolbarSlotsProvider>
    ))

    const row = screen
      .getByTestId('plan-surface')
      .querySelector('.justify-end.px-kro-medium')
    expect(row).not.toBeNull()
    // `classList` rather than a substring: `empty:hidden` also *contains*
    // "hidden", so a substring assertion would pass against the brittle form
    // this replaced.
    expect(row?.classList.contains('hidden')).toBe(true)
    expect(row?.classList.contains('empty:hidden')).toBe(false)
  })

  it('stacks the two status banners above the destination when both apply', () => {
    mount({
      staleSyncLabel: 'Rate limit hit. Last synced 3 min ago',
      needsReconnect: true,
    })

    expect(screen.getByTestId('plan-stale-sync-banner')).toBeTruthy()
    expect(screen.getByTestId('plan-reconnect-banner')).toBeTruthy()
  })
})
