import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SearchPageClient } from './SearchPageClient'

/**
 * The wrapper is a passive shell (`RC-39`, `RC-57`), so this asserts only what
 * a wrapper can get wrong: which Page it mounts.
 */
describe('SearchPageClient', () => {
  it('mounts the Find surface', async () => {
    render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <SearchPageClient />
      </StoreProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('find-surface')).toBeTruthy()
    })
  })
})
