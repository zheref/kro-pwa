import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MatrixPageClient } from './MatrixPageClient'

describe('MatrixPageClient', () => {
  it('mounts the Thirst destination page for the matrix feature key', () => {
    const store = makeStore(stubbedThunkExtra)
    render(
      <StoreProvider store={store}>
        <MatrixPageClient />
      </StoreProvider>,
    )

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      'Priority Matrix',
    )
    expect(store.getState().main.selected.kind).toBe('matrix')
  })
})
