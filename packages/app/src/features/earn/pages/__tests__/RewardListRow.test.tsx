/**
 * `RewardListRow` render tests — pure props, no store (`RC-56`-shaped: typical
 * / boundary / no-op, applied to a render component rather than a Shifter).
 *
 * NOTHING HERE MOUNTS AN OPEN POPPER PANEL. Mounting `PopoverContent` or
 * `DropdownMenuContent` under jsdom costs 5–12+ seconds of wall time per
 * mount and trips Vitest's own worker RPC watchdog
 * (`design/system/primitives/__tests__/radixEnvironment.tsx`'s measured
 * finding — `[vitest-worker]: Timeout calling "onTaskUpdate"`, reproduced by
 * this file's own first draft in CI). So, exactly like that file's sibling
 * suites (`popover.test.tsx`, `dropdown-menu.test.tsx`): this file asserts
 * the trigger's ARIA and the open/closed contract, never the panel's
 * content — the popover/menu CONTENT is covered by
 * `EarnFragment.stories.tsx`'s `ClaimConfirmationDesktop` story (a real
 * browser, where the mount is cheap) and by this PR's real-browser
 * screenshots (`## Screenshots`), never by an automated jsdom assertion.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { rewardMocks } from '@kro/core/mocks'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RewardListRow } from '../RewardListRow'

afterEach(cleanup)

const noop = () => {}

describe('RewardListRow', () => {
  it('shows the Claim button and no progress bar for a claimable reward', () => {
    render(
      <RewardListRow
        reward={rewardMocks.bobaTea}
        currentPoints={200}
        isClaimable
        isConfirmingClaim={false}
        presentation="sheet"
        onTapClaim={noop}
        onConfirmClaim={noop}
        onCancelClaim={noop}
        onDelete={noop}
      />,
    )

    expect(screen.getByRole('button', { name: 'Claim' })).toBeTruthy()
    expect(screen.queryByText(/to go/)).toBeNull()
  })

  it('shows "N to go" and the lock icon for a locked reward', () => {
    render(
      <RewardListRow
        reward={rewardMocks.plain}
        currentPoints={50}
        isClaimable={false}
        isConfirmingClaim={false}
        presentation="sheet"
        onTapClaim={noop}
        onConfirmClaim={noop}
        onCancelClaim={noop}
        onDelete={noop}
      />,
    )

    const remaining = Math.max(0, rewardMocks.plain.pointsRequired - 50)
    expect(screen.getByText(`${remaining} to go`)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Claim' })).toBeNull()
  })

  it('dispatches the claim tap with the reward id (sheet presentation)', () => {
    const onTapClaim = vi.fn()
    render(
      <RewardListRow
        reward={rewardMocks.bobaTea}
        currentPoints={200}
        isClaimable
        isConfirmingClaim={false}
        presentation="sheet"
        onTapClaim={onTapClaim}
        onConfirmClaim={noop}
        onCancelClaim={noop}
        onDelete={noop}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Claim' }))
    expect(onTapClaim).toHaveBeenCalledWith(rewardMocks.bobaTea.id)
  })

  it('dispatches the claim tap on the desktop idiom too, without opening the popover panel', () => {
    const onTapClaim = vi.fn()
    render(
      <RewardListRow
        reward={rewardMocks.bobaTea}
        currentPoints={200}
        isClaimable
        isConfirmingClaim={false}
        presentation="popover"
        onTapClaim={onTapClaim}
        onConfirmClaim={noop}
        onCancelClaim={noop}
        onDelete={noop}
      />,
    )

    const claimButton = screen.getByRole('button', { name: 'Claim' })
    expect(claimButton.getAttribute('aria-haspopup')).toBe('dialog')
    expect(claimButton.getAttribute('aria-expanded')).toBe('false')
    expect(document.querySelector('[data-slot="popover-content"]')).toBeNull()

    fireEvent.click(claimButton)
    expect(onTapClaim).toHaveBeenCalledWith(rewardMocks.bobaTea.id)
  })

  it('renders the delete affordance, labelled for the reward, with the menu closed', () => {
    render(
      <RewardListRow
        reward={rewardMocks.bobaTea}
        currentPoints={200}
        isClaimable
        isConfirmingClaim={false}
        presentation="sheet"
        onTapClaim={noop}
        onConfirmClaim={noop}
        onCancelClaim={noop}
        onDelete={noop}
      />,
    )

    const trigger = screen.getByRole('button', {
      name: `Actions for ${rewardMocks.bobaTea.title}`,
    })
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(
      document.querySelector('[data-slot="dropdown-menu-content"]'),
    ).toBeNull()
  })
})

// The native `contextmenu` → open-the-menu → click "Remove from list" →
// `onDelete` round trip is real coverage, deliberately not exercised here:
// opening the menu is exactly the panel-mount this file's header explains
// jsdom cannot afford. It is proven instead by `EarnFragment.stories.tsx`
// (a row embedded in a real story) and by this PR's real-browser
// screenshots, per the same split `dropdown-menu.test.tsx` already draws.
