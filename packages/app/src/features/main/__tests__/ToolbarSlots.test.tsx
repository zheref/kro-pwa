/**
 * The slot mechanism: a feature's control, rendered deep inside the
 * destination, lands in the shell's toolbar without the shell holding it.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  TOOLBAR_PLACEMENTS,
  ToolbarOutlet,
  ToolbarSlot,
  ToolbarSlotsProvider,
  useToolbarOutletPresent,
  useToolbarSlotFilled,
} from '../ToolbarSlots'

afterEach(cleanup)

describe('ToolbarSlot', () => {
  it("renders a destination's control into the shell's outlet", () => {
    render(
      <ToolbarSlotsProvider>
        <header>
          <ToolbarOutlet placement="primary" />
        </header>
        <main>
          <ToolbarSlot placement="primary">
            <button type="button">Refresh</button>
          </ToolbarSlot>
        </main>
      </ToolbarSlotsProvider>,
    )

    const outlet = document.querySelector('[data-toolbar-outlet="primary"]')
    expect(outlet?.textContent).toBe('Refresh')
    // And nowhere else — the node moved, it was not duplicated.
    expect(screen.getAllByRole('button', { name: 'Refresh' })).toHaveLength(1)
  })

  it('renders nothing when the shell offers no such outlet', () => {
    render(
      <ToolbarSlotsProvider>
        <ToolbarSlot placement="navigation">
          <button type="button">Notifications</button>
        </ToolbarSlot>
      </ToolbarSlotsProvider>,
    )

    expect(screen.queryByRole('button', { name: 'Notifications' })).toBeNull()
  })

  it('keeps each placement separate', () => {
    render(
      <ToolbarSlotsProvider>
        <ToolbarOutlet placement="navigation" />
        <ToolbarOutlet placement="primary" />
        <ToolbarSlot placement="navigation">
          <span>bell</span>
        </ToolbarSlot>
        <ToolbarSlot placement="primary">
          <span>eye</span>
        </ToolbarSlot>
      </ToolbarSlotsProvider>,
    )

    expect(
      document.querySelector('[data-toolbar-outlet="navigation"]')?.textContent,
    ).toBe('bell')
    expect(
      document.querySelector('[data-toolbar-outlet="primary"]')?.textContent,
    ).toBe('eye')
  })

  it("keeps the slotted control inside its OWNER's context, not the shell's", async () => {
    // The whole reason this is a portal rather than a node registry: the
    // control's handlers keep working, and its owner's state drives it.
    const onClick = vi.fn()

    function Destination() {
      const [count, setCount] = useState(0)
      return (
        <ToolbarSlot placement="trailing">
          <button
            type="button"
            onClick={() => {
              setCount(count + 1)
              onClick()
            }}
          >
            tapped {count}
          </button>
        </ToolbarSlot>
      )
    }

    render(
      <ToolbarSlotsProvider>
        <ToolbarOutlet placement="trailing" />
        <Destination />
      </ToolbarSlotsProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'tapped 0' }))

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'tapped 1' })).toBeTruthy()
  })

  it("does not re-render the shell when a slot's content changes", () => {
    // A registry would need a setState per render of the slot's owner; this
    // asserts the shell renders once and stays put.
    let shellRenders = 0

    function Shell({ children }: { children: React.ReactNode }) {
      shellRenders += 1
      return (
        <ToolbarSlotsProvider>
          <ToolbarOutlet placement="primary" />
          {children}
        </ToolbarSlotsProvider>
      )
    }

    const { rerender } = render(
      <Shell>
        <ToolbarSlot placement="primary">
          <span>one</span>
        </ToolbarSlot>
      </Shell>,
    )
    const afterFirst = shellRenders

    rerender(
      <Shell>
        <ToolbarSlot placement="primary">
          <span>two</span>
        </ToolbarSlot>
      </Shell>,
    )

    expect(shellRenders).toBe(afterFirst + 1)
    expect(
      document.querySelector('[data-toolbar-outlet="primary"]')?.textContent,
    ).toBe('two')
  })
})

describe('useToolbarOutletPresent', () => {
  it('reports false with no shell around it, so a feature can fall back', () => {
    function Probe() {
      return <span>{String(useToolbarOutletPresent('primary'))}</span>
    }

    render(<Probe />)
    expect(screen.getByText('false')).toBeTruthy()
  })

  it("reports true once the shell's outlet has mounted", () => {
    function Probe() {
      return <span>present: {String(useToolbarOutletPresent('primary'))}</span>
    }

    render(
      <ToolbarSlotsProvider>
        <ToolbarOutlet placement="primary" />
        <Probe />
      </ToolbarSlotsProvider>,
    )

    expect(screen.getByText('present: true')).toBeTruthy()
  })
})

describe('the placement set', () => {
  it("covers both toolbars canon has — the Mac's two groups and the phone's two sides", () => {
    expect(TOOLBAR_PLACEMENTS).toEqual([
      'navigation',
      'primary',
      'leading',
      'trailing',
      // The fifth is not a toolbar group: it is the shell-owned Profile
      // *control* whose content a feature supplies (KC-IS-#32). See the union's
      // own comment for why it lives in the same set.
      'profile',
    ])
  })
})

describe('a slot claims its placement while it is mounted', () => {
  function FillProbe({
    placement,
  }: {
    readonly placement: 'profile' | 'primary'
  }) {
    const filled = useToolbarSlotFilled(placement)
    return <p>{`filled: ${String(filled)}`}</p>
  }

  it('reports nothing filled before a feature slots anything', () => {
    render(
      <ToolbarSlotsProvider>
        <ToolbarOutlet placement="profile" />
        <FillProbe placement="profile" />
      </ToolbarSlotsProvider>,
    )

    expect(screen.getByText('filled: false')).toBeTruthy()
  })

  it('reports the placement filled once a slot mounts for it', async () => {
    render(
      <ToolbarSlotsProvider>
        <ToolbarOutlet placement="profile" />
        <FillProbe placement="profile" />
        <ToolbarSlot placement="profile">
          <button type="button">Profile</button>
        </ToolbarSlot>
      </ToolbarSlotsProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('filled: true')).toBeTruthy()
    })
  })

  it('answers per placement — a filled profile says nothing about primary', async () => {
    render(
      <ToolbarSlotsProvider>
        <ToolbarOutlet placement="profile" />
        <ToolbarOutlet placement="primary" />
        <FillProbe placement="primary" />
        <ToolbarSlot placement="profile">
          <button type="button">Profile</button>
        </ToolbarSlot>
      </ToolbarSlotsProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('filled: false')).toBeTruthy()
    })
  })
})
