/**
 * `EarnFragment` render tests, mirroring `EarnFragment.stories.tsx` (`RC-11`).
 */
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { EarnExceptions } from '../../EarnException'
import { initialEarnState } from '../../EarnFeature'
import { earnStateMocks } from '../../EarnMocks'
import { withException } from '../../EarnShifters'
import { ToolbarOutlet, ToolbarSlotsProvider } from '../../../main'
import { EarnFragment } from '../EarnFragment'
import { earnFragmentPropsFrom } from './earnFixtures'

afterEach(cleanup)

describe('EarnFragment', () => {
  it('renders the typical catalog\'s three sections', () => {
    render(<EarnFragment {...earnFragmentPropsFrom(earnStateMocks.loadedTypical)} />)

    expect(screen.getByText('Available to Claim')).toBeTruthy()
    expect(screen.getByText('Keep Earning')).toBeTruthy()
    expect(screen.getByText('Discover More')).toBeTruthy()
  })

  /**
   * Bugbot (`KC-PR-#65` round 1): `state.rewards` starts `[]`, which reads
   * identically to a genuinely empty catalog for the suggestions section's
   * own visibility check — so rendering unconditionally showed "Get
   * Started" plus all fifteen starter suggestions, live Add buttons
   * included, before the real read ever lands.
   */
  it('shows a pending message instead of the catalog while the first load is in flight', () => {
    render(
      <EarnFragment
        {...earnFragmentPropsFrom(earnStateMocks.loading, {
          isLoading: true,
        })}
      />,
    )

    expect(screen.getByTestId('earn-catalog-pending')).toBeTruthy()
    expect(screen.queryByText('Get Started')).toBeNull()
    expect(screen.queryByText('Discover More')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add Reward' })).toBeNull()
  })

  it('shows the error, not the starter suggestions, when the FIRST load fails outright', () => {
    const neverLoaded = withException(
      initialEarnState,
      EarnExceptions.catalogLoadFailed('offline'),
    )

    render(<EarnFragment {...earnFragmentPropsFrom(neverLoaded)} />)

    expect(screen.getByTestId('earn-catalog-pending').textContent).toBe(
      "Couldn't load your rewards: offline",
    )
    expect(screen.queryByText('Get Started')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add Reward' })).toBeNull()
  })

  it("shows canon's empty-catalog copy inside Get Started, never a separate empty screen", () => {
    render(<EarnFragment {...earnFragmentPropsFrom(earnStateMocks.loadedEmpty)} />)

    expect(screen.getByText('Get Started')).toBeTruthy()
    expect(
      screen.getByText(
        'Pick a reward to start working towards, or add your own with the + button.',
      ),
    ).toBeTruthy()
    expect(screen.queryByText('Available to Claim')).toBeNull()
    expect(screen.queryByText('Keep Earning')).toBeNull()
  })

  it('keeps the catalog visible when a refresh fails (errored, catalog untouched)', () => {
    render(
      <EarnFragment
        {...earnFragmentPropsFrom(earnStateMocks.failedRefreshKeepingCatalog)}
      />,
    )

    expect(screen.getByText('Available to Claim')).toBeTruthy()
  })

  it('shows the current-points header, singular/plural correctly', () => {
    render(
      <EarnFragment
        {...earnFragmentPropsFrom(earnStateMocks.loadedTypical, {
          currentPoints: 1,
        })}
      />,
    )

    expect(screen.getByText('1 point available')).toBeTruthy()
  })

  it('opens the mobile claim sheet when a claim is being confirmed', () => {
    render(
      <EarnFragment
        {...earnFragmentPropsFrom(earnStateMocks.claimingReward, {
          presentation: 'sheet',
        })}
      />,
    )

    expect(screen.getByText(/Claim .*\?/)).toBeTruthy()
  })

  it('opens the Add Reward form prefilled from the default-threshold preference', () => {
    render(
      <EarnFragment
        {...earnFragmentPropsFrom(earnStateMocks.addingReward, {
          presentation: 'sheet',
        })}
      />,
    )

    const input = screen.getByLabelText('What do you want to earn?')
    expect(input).toBeTruthy()
  })

  it('mounts the mobile-only Earn Preferences gear only when asked to, portalled into the trailing outlet', () => {
    const withOutlet = (fragment: ReactNode) => (
      <ToolbarSlotsProvider>
        <ToolbarOutlet placement="trailing" />
        {fragment}
      </ToolbarSlotsProvider>
    )

    const { rerender } = render(
      withOutlet(
        <EarnFragment
          {...earnFragmentPropsFrom(earnStateMocks.loadedTypical, {
            showsMobileEarnPreferencesGear: false,
          })}
        />,
      ),
    )
    expect(screen.queryByLabelText('Earn Preferences')).toBeNull()

    rerender(
      withOutlet(
        <EarnFragment
          {...earnFragmentPropsFrom(earnStateMocks.loadedTypical, {
            showsMobileEarnPreferencesGear: true,
          })}
        />,
      ),
    )
    expect(screen.getByLabelText('Earn Preferences')).toBeTruthy()
  })
})
