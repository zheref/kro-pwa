import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import BoardRoute from './page'

describe('/board', () => {
  it("mounts the Board Thirst vote surface inside the shell's store", () => {
    const store = makeStore(stubbedThunkExtra)
    render(
      <StoreProvider store={store}>
        <BoardRoute />
      </StoreProvider>,
    )

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Board')
    expect(store.getState().main.selected.kind).toBe('board')
  })
})
