import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HabitsPageClient } from './HabitsPageClient'

describe('HabitsPageClient', () => {
  it('mounts the Thirst destination page for the habits feature key', () => {
    const store = makeStore(stubbedThunkExtra)
    render(
      <StoreProvider store={store}>
        <HabitsPageClient />
      </StoreProvider>,
    )

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Habits')
    expect(store.getState().main.selected.kind).toBe('habits')
  })
})
