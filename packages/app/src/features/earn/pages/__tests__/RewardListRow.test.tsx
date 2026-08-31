/**
 * `RewardListRow` render tests — pure props, no store (`RC-56`-shaped: typical
 * / boundary / no-op, applied to a render component rather than a Shifter).
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

  it('opens its own popover confirmation on the desktop idiom, anchored to Claim', () => {
    render(
      <RewardListRow
        reward={rewardMocks.bobaTea}
        currentPoints={200}
        isClaimable
        isConfirmingClaim
        presentation="popover"
        onTapClaim={noop}
        onConfirmClaim={noop}
        onCancelClaim={noop}
        onDelete={noop}
      />,
    )

    expect(screen.getByText(`Claim ${rewardMocks.bobaTea.title}?`)).toBeTruthy()
  })

  it('opens the delete menu on a native context-menu and dispatches delete', () => {
    const onDelete = vi.fn()
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
        onDelete={onDelete}
      />,
    )

    fireEvent.contextMenu(screen.getByTestId(`reward-row-${rewardMocks.bobaTea.id}`))
    fireEvent.click(screen.getByText('Remove from list'))
    expect(onDelete).toHaveBeenCalledWith(rewardMocks.bobaTea.id)
  })
})
