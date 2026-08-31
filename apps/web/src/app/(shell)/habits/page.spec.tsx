import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import HabitsRoute from './page'

describe('/habits', () => {
  it("mounts the Habits Thirst vote surface inside the shell's store", () => {
    const store = makeStore(stubbedThunkExtra)
    render(
      <StoreProvider store={store}>
        <HabitsRoute />
      </StoreProvider>,
    )

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Habits')
    expect(store.getState().main.selected.kind).toBe('habits')
  })
})
