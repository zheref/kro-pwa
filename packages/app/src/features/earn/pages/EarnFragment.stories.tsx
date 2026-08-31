import type { ReactNode } from 'react'
import { earnStateMocks } from '../EarnMocks'
import { EarnFragment } from './EarnFragment'
import { earnFragmentPropsFrom } from './__tests__/earnFixtures'

/**
 * `EarnFragment` stories — pure props, no store, no `Provider`
 * (`05-page-and-screen.md`'s "a Fragment's story needs no Provider at all —
 * that gap is itself the proof the split holds").
 *
 * Mirrors the reducer's principal states: loaded/typical, loaded/empty and
 * errored (the RC-11 minimum), plus the two flows the issue names by name —
 * an open claim confirmation and an open Add-Reward form — on both the
 * mobile (sheet) and desktop (popover) idioms.
 */
export default {
  title: 'Earn/EarnFragment',
  component: EarnFragment,
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
        height: 640,
        background: 'var(--kro-color-back)',
        color: 'var(--kro-color-fore)',
      }}
    >
      {children}
    </div>
  )
}

export const LoadedTypical = {
  render: () => (
    <Stage>
      <EarnFragment {...earnFragmentPropsFrom(earnStateMocks.loadedTypical)} />
    </Stage>
  ),
}

export const Loading = {
  render: () => (
    <Stage>
      <EarnFragment
        {...earnFragmentPropsFrom(earnStateMocks.loading, { isLoading: true })}
      />
    </Stage>
  ),
}

export const LoadedEmpty = {
  render: () => (
    <Stage>
      <EarnFragment {...earnFragmentPropsFrom(earnStateMocks.loadedEmpty)} />
    </Stage>
  ),
}

export const Errored = {
  render: () => (
    <Stage>
      <EarnFragment
        {...earnFragmentPropsFrom(earnStateMocks.failedRefreshKeepingCatalog)}
      />
    </Stage>
  ),
}

export const ClaimConfirmationMobile = {
  render: () => (
    <Stage>
      <EarnFragment
        {...earnFragmentPropsFrom(earnStateMocks.claimingReward, {
          presentation: 'sheet',
        })}
      />
    </Stage>
  ),
}

export const ClaimConfirmationDesktop = {
  render: () => (
    <Stage>
      <EarnFragment
        {...earnFragmentPropsFrom(earnStateMocks.claimingReward, {
          presentation: 'popover',
        })}
      />
    </Stage>
  ),
}

export const AddRewardMobile = {
  render: () => (
    <Stage>
      <EarnFragment
        {...earnFragmentPropsFrom(earnStateMocks.addingReward, {
          presentation: 'sheet',
        })}
      />
    </Stage>
  ),
}

export const AddRewardDesktop = {
  render: () => (
    <Stage>
      <EarnFragment
        {...earnFragmentPropsFrom(earnStateMocks.addingReward, {
          presentation: 'popover',
        })}
      />
    </Stage>
  ),
}

export const MobileGearBothSchemes = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      <Stage theme="light">
        <EarnFragment
          {...earnFragmentPropsFrom(earnStateMocks.loadedTypical, {
            showsMobileEarnPreferencesGear: true,
          })}
        />
      </Stage>
      <Stage theme="dark">
        <EarnFragment
          {...earnFragmentPropsFrom(earnStateMocks.loadedTypical, {
            showsMobileEarnPreferencesGear: true,
          })}
        />
      </Stage>
    </div>
  ),
}
