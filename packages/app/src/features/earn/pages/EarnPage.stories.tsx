import type { ReactNode } from 'react'
import { rewardMocks } from '@kro/core/mocks'
import { StoreProvider } from '../../../library/StoreProvider'
import { userDidTapClaim } from '../EarnFeature'
import { EarnPage } from './EarnPage'
import { makeSeededEarnStore } from './__tests__/earnFixtures'

/**
 * `EarnPage` stories — a REAL store, seeded through the same persistence
 * path production code writes to (`earnFixtures.ts`'s header), never a
 * `preloadedState` shortcut. Mounting reproduces exactly what a user sees:
 * the mount effect dispatches `loadEarnPreferencesThunk`/
 * `loadEarnCatalogThunk` against the seeded `localStore` and the catalog
 * resolves to "loaded" the same tick.
 *
 * The reducer's principal states — loading / loaded / errored — are already
 * the full `EarnFragment.stories.tsx` set (built from pure props via
 * `earnStateMocks`, `05-page-and-screen.md`'s sanctioned Fragment route).
 * What only `EarnPage`'s own stories prove is the WIRING: that a real
 * dispatch through the real Producer reaches the same rendered catalog, and
 * that the claim flow's `userDidTapClaim` — the same action a click on the
 * row fires — actually opens the confirmation against live state.
 */
export default {
  title: 'Earn/EarnPage',
  component: EarnPage,
  parameters: { layout: 'fullscreen' },
}

function Stage({ children }: { children: ReactNode }) {
  return (
    <div
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

export const Typical = {
  render: () => (
    <StoreProvider store={makeSeededEarnStore()}>
      <Stage>
        <EarnPage />
      </Stage>
    </StoreProvider>
  ),
}

export const EmptyCatalog = {
  render: () => (
    <StoreProvider store={makeSeededEarnStore({ withCatalog: false })}>
      <Stage>
        <EarnPage />
      </Stage>
    </StoreProvider>
  ),
}

export const ClaimConfirmationOpen = {
  render: () => {
    const store = makeSeededEarnStore()
    // The same action `RewardListRow`'s Claim button dispatches — proves the
    // confirmation opens against LIVE state once the seeded catalog loads,
    // not a hand-assembled prop.
    store.dispatch(userDidTapClaim({ rewardId: rewardMocks.bobaTea.id }))
    return (
      <StoreProvider store={store}>
        <Stage>
          <EarnPage />
        </Stage>
      </StoreProvider>
    )
  },
}
