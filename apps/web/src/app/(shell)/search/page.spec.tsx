import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SearchRoute from './page'

describe('/search', () => {
  it("mounts the Find surface inside the shell's store", async () => {
    render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <SearchRoute />
      </StoreProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('find-surface')).toBeTruthy()
    })
    expect(
      screen.getByRole('searchbox', { name: 'Search endeavors' }),
    ).toBeTruthy()
  })

  it('selects the Search destination, so the shell highlight follows the URL', async () => {
    const store = makeStore(stubbedThunkExtra)

    render(
      <StoreProvider store={store}>
        <SearchRoute />
      </StoreProvider>,
    )

    await waitFor(() => {
      expect(store.getState().main.selected.kind).toBe('search')
    })
  })
})
