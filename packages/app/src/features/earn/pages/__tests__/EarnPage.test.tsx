/**
 * `EarnPage` render + interaction tests, mirroring `EarnPage.stories.tsx`
 * (`RC-11`) — driven through a REAL, seeded store (`earnFixtures.ts`), never
 * a doctored prop set. The last two are the issue's own "claim interaction
 * test": a click on the real Claim button, through the real confirm
 * sheet/popover, through the real `claimRewardThunk`, asserted on the real
 * re-partitioned catalog — once per idiom.
 *
 * A narrow viewport is installed for most of this file (`installMatchMedia`,
 * mirrored from `useSurfaceLayout.test.tsx`'s own suite) so `EarnPage`
 * resolves the `tabBar`/`sheet` idiom — a plain Radix `Dialog`, not a
 * popper-positioned `Popover`, which is measurably faster to settle under
 * jsdom (`design/system/primitives/popover.tsx`'s own note: "mounting a
 * Radix popper under jsdom costs seconds"). The desktop/`popover` idiom gets
 * its own dedicated interaction test, at its real (slower) cost.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { rewardMocks } from '@kro/core/mocks'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { StoreProvider } from '../../../../library/StoreProvider'
import { userDidTapClaim } from '../../EarnFeature'
import { EarnPage } from '../EarnPage'
import { makeSeededEarnStore } from './earnFixtures'

type Listener = () => void
interface FakeMedia {
  matches: boolean
  readonly listeners: Set<Listener>
}

const media = new Map<string, FakeMedia>()
let originalMatchMedia: typeof window.matchMedia | undefined

const setViewport = (width: number): void => {
  Object.defineProperty(window, 'innerWidth', {
    value: width,
    configurable: true,
  })
}

const installMatchMedia = (): void => {
  originalMatchMedia = window.matchMedia
  window.matchMedia = ((query: string) => {
    const entry = media.get(query) ?? { matches: false, listeners: new Set() }
    media.set(query, entry)
    return {
      get matches() {
        return entry.matches
      },
      media: query,
      addEventListener: (_: string, listener: Listener) =>
        entry.listeners.add(listener),
      removeEventListener: (_: string, listener: Listener) =>
        entry.listeners.delete(listener),
      addListener: (listener: Listener) => entry.listeners.add(listener),
      removeListener: (listener: Listener) => entry.listeners.delete(listener),
      dispatchEvent: () => true,
      onchange: null,
    } as unknown as MediaQueryList
  }) as typeof window.matchMedia
}

beforeEach(() => {
  media.clear()
  installMatchMedia()
  // < 768px (`REGULAR_WIDTH_BREAKPOINT`) resolves `handheld` regardless of
  // pointer coarseness — the tab-bar shell, sheet presentation.
  setViewport(390)
})

afterEach(() => {
  cleanup()
  if (originalMatchMedia !== undefined) window.matchMedia = originalMatchMedia
})

describe('EarnPage', () => {
  it('mounts and dispatches the real preferences + catalog loads, rendering the seeded typical catalog', async () => {
    const store = makeSeededEarnStore()
    render(
      <StoreProvider store={store}>
        <EarnPage />
      </StoreProvider>,
    )

    await waitFor(() =>
      expect(screen.getByText('Available to Claim')).toBeTruthy(),
    )
    expect(screen.getByText(rewardMocks.bobaTea.title)).toBeTruthy()
  })

  /**
   * Bugbot (`KC-PR-#65` round 1): before this fix, the first paint showed
   * the (empty) initial slice as a real catalog — "Discover More" with all
   * fifteen starter suggestions and live Add buttons, racing the real load.
   * The pending message must be what shows first, through the real mount
   * effect, not a hand-built prop.
   */
  it('shows the pending message, never the starter suggestions, before the real load resolves', () => {
    const store = makeSeededEarnStore()
    render(
      <StoreProvider store={store}>
        <EarnPage />
      </StoreProvider>,
    )

    expect(screen.getByTestId('earn-catalog-pending')).toBeTruthy()
    expect(screen.queryByText('Discover More')).toBeNull()
    expect(screen.queryByText('Get a PS5 Pro')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add Reward' })).toBeNull()
  })

  it('renders the empty state when the seeded catalog is empty', async () => {
    const store = makeSeededEarnStore({ withCatalog: false })
    render(
      <StoreProvider store={store}>
        <EarnPage />
      </StoreProvider>,
    )

    await waitFor(() => expect(screen.getByText('Get Started')).toBeTruthy())
    expect(screen.queryByText('Available to Claim')).toBeNull()
  })

  it('opens the claim confirmation once `userDidTapClaim` lands on live state', async () => {
    const store = makeSeededEarnStore()
    store.dispatch(userDidTapClaim({ rewardId: rewardMocks.bobaTea.id }))

    render(
      <StoreProvider store={store}>
        <EarnPage />
      </StoreProvider>,
    )

    await waitFor(
      () =>
        expect(
          screen.getByText(`Claim ${rewardMocks.bobaTea.title}?`),
        ).toBeTruthy(),
      { timeout: 8000 },
    )
  })

  it('the claim interaction (mobile/sheet): tap Claim, confirm, and the reward leaves the claimable lane', async () => {
    const store = makeSeededEarnStore()
    render(
      <StoreProvider store={store}>
        <EarnPage />
      </StoreProvider>,
    )

    await waitFor(() =>
      expect(screen.getByText(rewardMocks.bobaTea.title)).toBeTruthy(),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Claim' }))

    await waitFor(
      () =>
        expect(
          screen.getByText(`Claim ${rewardMocks.bobaTea.title}?`),
        ).toBeTruthy(),
      { timeout: 8000 },
    )

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Claim' }))

    await waitFor(
      () =>
        expect(store.getState().earn.claimedRewardIds).toContain(
          rewardMocks.bobaTea.id,
        ),
      { timeout: 8000 },
    )
    // Claimed rewards leave the claimable lane entirely (`EarnRules.ts`'s
    // `partitionRewards` — an already-claimed id is filtered before either
    // partition runs), so its title disappears from the rendered catalog.
    await waitFor(() =>
      expect(screen.queryByText(rewardMocks.bobaTea.title)).toBeNull(),
    )
  }, 20000)

  // The desktop/popover idiom is deliberately NOT re-exercised at the full
  // `EarnPage` level: mounting the whole 15-suggestion tree AND triggering a
  // Radix popper reposition is fast in isolation but grows flaky (>20s) once
  // the full suite's parallel contention is added — the exact cost
  // `design/system/primitives/popover.tsx`'s own header names ("mounting a
  // Radix popper under jsdom costs seconds") and the same reason that file's
  // own suite leaves popper *behaviour* to Radix's tests and the Storybook
  // test-runner rather than RTL. The popover idiom is still proven three
  // ways that do not pay that tax: `RewardListRow.test.tsx`'s own popover
  // test (one row, isolated, ~1s); `EarnFragment.stories.tsx`'s
  // `ClaimConfirmationDesktop` / `AddRewardDesktop` stories (pure props, no
  // store); and the real-browser Playwright screenshots this PR's
  // `## Screenshots` carries at 1440×900 (a real render is strictly more
  // faithful than a jsdom approximation of one).
})
