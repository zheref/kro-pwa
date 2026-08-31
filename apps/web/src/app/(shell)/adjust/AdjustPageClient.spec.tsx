import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AdjustPageClient } from './AdjustPageClient'

/**
 * The client wrapper is a passive shell (`RC-57`): it imports the Page and
 * forwards nothing. This one assertion proves the wiring — that `/adjust`
 * reaches the settings surface rather than the shared placeholder — and every
 * behaviour is covered by `SettingsHubPage`'s own suite in `packages/app`.
 */
describe('AdjustPageClient', () => {
  it('mounts the Settings hub rather than the destination placeholder', async () => {
    render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <AdjustPageClient />
      </StoreProvider>,
    )

    expect(await screen.findByTestId('settings-hub')).toBeTruthy()
  })
})
