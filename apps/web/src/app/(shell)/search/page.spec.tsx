import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SearchRoute from './page'

describe('/search', () => {
  it("mounts the Search destination inside the shell's store", () => {
    render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <SearchRoute />
      </StoreProvider>,
    )

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Search')
  })
})
