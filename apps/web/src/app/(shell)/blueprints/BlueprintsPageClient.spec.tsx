import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BlueprintsPageClient } from './BlueprintsPageClient'

describe('BlueprintsPageClient', () => {
  it('mounts the Thirst destination page for the blueprints feature key', () => {
    const store = makeStore(stubbedThunkExtra)
    render(
      <StoreProvider store={store}>
        <BlueprintsPageClient />
      </StoreProvider>,
    )

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      'Blueprints',
    )
    expect(store.getState().main.selected.kind).toBe('blueprints')
  })
})
