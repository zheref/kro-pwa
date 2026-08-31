import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { rewardMocks } from '@kro/core/mocks'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ClaimConfirmationBody,
  ClaimRewardSheetDialog,
} from '../ClaimConfirmation'

afterEach(cleanup)

describe('ClaimConfirmationBody', () => {
  it("shows the reward's glyph, title and cost", () => {
    render(
      <ClaimConfirmationBody
        reward={rewardMocks.bobaTea}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    expect(
      screen.getByText(`Claim ${rewardMocks.bobaTea.title}?`),
    ).toBeTruthy()
    expect(
      screen.getByText(`${rewardMocks.bobaTea.pointsRequired} points`),
    ).toBeTruthy()
  })

  it('confirms and cancels through their own buttons', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <ClaimConfirmationBody
        reward={rewardMocks.bobaTea}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Claim' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

describe('ClaimRewardSheetDialog', () => {
  it('renders nothing when no reward is being confirmed', () => {
    render(
      <ClaimRewardSheetDialog
        reward={null}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    expect(screen.queryByText(/Claim .*\?/)).toBeNull()
  })

  it('shows the confirmation body for the reward being confirmed', () => {
    render(
      <ClaimRewardSheetDialog
        reward={rewardMocks.plain}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    expect(screen.getByText(`Claim ${rewardMocks.plain.title}?`)).toBeTruthy()
  })
})
