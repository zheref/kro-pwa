import { EndeavorKind } from '@kro/core'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { initialDoVisibility } from '../../DoRules'
import {
  DoToolbarFragment,
  type DoToolbarFragmentProps,
} from '../DoToolbarFragment'
import {
  DO_SURFACE_MOCK_LOCALE,
  DO_SURFACE_MOCK_NOW,
  desktopDoLayout,
  desktopShellShape,
  doSurfaceMocks,
  doSurfaceProps,
  handheldDoLayout,
  handheldShellShape,
} from '../doSurfaceMocks'

afterEach(cleanup)

const day = doSurfaceProps(doSurfaceMocks.typicalDay)
const noop = () => {}

/**
 * Rendered with no shell around it, so `useToolbarOutletPresent` answers false
 * and the controls fall back to in-content chrome — the sanctioned story/test
 * path the shell child documented on that hook.
 */
const toolbar = (overrides: Partial<DoToolbarFragmentProps> = {}) => (
  <DoToolbarFragment
    shape={desktopShellShape}
    layout={desktopDoLayout}
    isInMarkCompleteMode={false}
    isLoading={false}
    overdue={day.lanes.overdue}
    expired={day.lanes.expired}
    visibility={initialDoVisibility}
    now={DO_SURFACE_MOCK_NOW}
    locale={DO_SURFACE_MOCK_LOCALE}
    onToggleMarkCompleteMode={noop}
    onTapNotifications={noop}
    onRefresh={noop}
    onChangeVisibility={noop}
    {...overrides}
  />
)

describe("canon's desktop toolbar table", () => {
  it('puts the bell in the navigation group and refresh + visibility in primary', () => {
    render(toolbar())

    const navigation = screen.getByTestId('do-toolbar-navigation')
    const primary = screen.getByTestId('do-toolbar-primary')

    expect(
      navigation.querySelector('[aria-label="Notifications"]'),
    ).not.toBeNull()
    expect(primary.querySelector('[aria-label="Refresh"]')).not.toBeNull()
    expect(
      primary.querySelector('[aria-label="Visibility Filters"]'),
    ).not.toBeNull()
  })

  it('replaces the whole trailing group with Done in mark-complete mode', () => {
    render(toolbar({ isInMarkCompleteMode: true }))

    expect(screen.getByTestId('do-done-control').textContent).toBe('Done')
    expect(screen.queryByLabelText('Refresh')).toBeNull()
    expect(screen.queryByLabelText('Notifications')).toBeNull()
  })

  it("keeps refresh's footprint while loading and renames it to sync status", () => {
    render(toolbar({ isLoading: true }))

    expect(screen.getByLabelText('Show sync status')).toBeTruthy()
    expect(screen.getByTestId('do-refresh-spinner')).toBeTruthy()
    expect(screen.queryByLabelText('Refresh')).toBeNull()
  })
})

describe("canon's compact toolbar table", () => {
  it('puts the bell leading and the trailing pair in the tab-bar slots', () => {
    render(toolbar({ shape: handheldShellShape, layout: handheldDoLayout }))

    expect(
      screen
        .getByTestId('do-toolbar-leading')
        .querySelector('[aria-label="Notifications"]'),
    ).not.toBeNull()
    expect(
      screen
        .getByTestId('do-toolbar-trailing')
        .querySelector('[aria-label="Refresh"]'),
    ).not.toBeNull()
  })

  it('sizes every control for a fingertip rather than a pointer', () => {
    render(toolbar({ shape: handheldShellShape, layout: handheldDoLayout }))
    const bell = screen.getByLabelText('Notifications')
    expect(bell.style.minHeight).toBe(
      `${handheldDoLayout.minimumControlSide}px`,
    )
    expect(handheldDoLayout.minimumControlSide).toBe(44)
  })
})

describe('the notifications split', () => {
  it('raises the scroll intent on a narrow surface, and opens no panel', async () => {
    const onTapNotifications = vi.fn()
    render(
      toolbar({
        shape: handheldShellShape,
        layout: handheldDoLayout,
        onTapNotifications,
      }),
    )

    await userEvent.click(screen.getByLabelText('Notifications'))

    expect(onTapNotifications).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('do-notifications-panel')).toBeNull()
  })

  it('opens the panel in place on a wide surface, and raises no scroll intent', async () => {
    const onTapNotifications = vi.fn()
    render(toolbar({ onTapNotifications }))

    await userEvent.click(screen.getByLabelText('Notifications'))

    expect(onTapNotifications).not.toHaveBeenCalled()
    expect(screen.getByTestId('do-notifications-panel')).toBeTruthy()
  })

  it('closes the panel on a second tap of the same bell', async () => {
    render(toolbar())
    const bell = screen.getByLabelText('Notifications')

    await userEvent.click(bell)
    expect(screen.getByTestId('do-notifications-panel')).toBeTruthy()

    await userEvent.click(bell)
    expect(screen.queryByTestId('do-notifications-panel')).toBeNull()
  })

  it('never opens an empty panel', async () => {
    render(toolbar({ overdue: [], expired: [] }))

    await userEvent.click(screen.getByLabelText('Notifications'))
    expect(screen.queryByTestId('do-notifications-panel')).toBeNull()
  })

  it('badges the bell only while something needs attention', () => {
    const { unmount } = render(toolbar())
    expect(screen.getByTestId('do-bell-badged')).toBeTruthy()
    unmount()

    render(toolbar({ overdue: [], expired: [] }))
    expect(screen.queryByTestId('do-bell-badged')).toBeNull()
  })
})

describe('visibility', () => {
  it('shows the open eye while nothing is hidden', () => {
    render(toolbar())
    expect(screen.queryByTestId('do-visibility-filtered')).toBeNull()
  })

  it('strikes the eye through once a kind is hidden', () => {
    render(
      toolbar({
        visibility: {
          ...initialDoVisibility,
          hiddenKinds: [EndeavorKind.task],
        },
      }),
    )
    expect(screen.getByTestId('do-visibility-filtered')).toBeTruthy()
  })

  it('hands the toggled selection back for the slice to install', async () => {
    const onChangeVisibility = vi.fn()
    render(toolbar({ onChangeVisibility }))

    await userEvent.click(screen.getByLabelText('Visibility Filters'))
    const panel = screen.getByTestId('do-visibility-panel')
    const kinds = panel.querySelector<HTMLElement>('[aria-label="Kinds"]')
    const firstChip = kinds?.querySelector<HTMLButtonElement>('button')
    if (!firstChip) throw new Error('the Kinds group rendered no toggle')
    await userEvent.click(firstChip)

    expect(onChangeVisibility).toHaveBeenCalledTimes(1)
    const next = onChangeVisibility.mock.calls[0]?.[0]
    expect(next.hiddenKinds.length).toBe(1)
  })
})
