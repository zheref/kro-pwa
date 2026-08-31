import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import EarnRoute from './page'

/**
 * `#28` replaced the placeholder this route mounted (`#13`) with the real
 * Earn destination — `DestinationPage`'s own swap point now renders
 * `EarnPage` for `kind: 'earn'`. The heading assertion this spec used to
 * carry moved with it: the shell's own `<h1>` already reads "Rewards" (see
 * `MainShellFragment.tsx`), so `EarnFragment` does not repeat it, and this
 * spec asserts the content only `EarnPage` itself owns — the points line and
 * canon's empty-catalog copy — instead.
 */
describe('/earn', () => {
  it("mounts the real Earn destination inside the shell's store", async () => {
    render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <EarnRoute />
      </StoreProvider>,
    )

    await waitFor(() =>
      expect(screen.getByText('0 points available')).toBeInTheDocument(),
    )
    expect(
      screen.getByText(
        'Pick a reward to start working towards, or add your own with the + button.',
      ),
    ).toBeInTheDocument()
  })
})
