import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import BlueprintsRoute from './page'

describe('/blueprints', () => {
  it("mounts the Blueprints Thirst vote surface inside the shell's store", () => {
    const store = makeStore(stubbedThunkExtra)
    render(
      <StoreProvider store={store}>
        <BlueprintsRoute />
      </StoreProvider>,
    )

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      'Blueprints',
    )
    expect(store.getState().main.selected.kind).toBe('blueprints')
  })
})
