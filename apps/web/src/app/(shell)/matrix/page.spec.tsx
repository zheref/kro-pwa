import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MatrixRoute from './page'

describe('/matrix', () => {
  it("mounts the Priority Matrix Thirst vote surface inside the shell's store", () => {
    const store = makeStore(stubbedThunkExtra)
    render(
      <StoreProvider store={store}>
        <MatrixRoute />
      </StoreProvider>,
    )

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      'Priority Matrix',
    )
    // The sidebar highlight still follows the URL (`RC-17`, `RC-63`) even
    // though this route no longer mounts the shared `DestinationPage`.
    expect(store.getState().main.selected.kind).toBe('matrix')
  })
})
