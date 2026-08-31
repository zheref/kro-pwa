import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BoardPageClient } from './BoardPageClient'

describe('BoardPageClient', () => {
  it('mounts the Thirst destination page for the board feature key', () => {
    const store = makeStore(stubbedThunkExtra)
    render(
      <StoreProvider store={store}>
        <BoardPageClient />
      </StoreProvider>,
    )

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Board')
    expect(store.getState().main.selected.kind).toBe('board')
  })
})
