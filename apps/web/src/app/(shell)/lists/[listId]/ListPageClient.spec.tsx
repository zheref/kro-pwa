import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ListPageClient } from './ListPageClient'

/**
 * The wrapper is a passive shell (`RC-39`, `RC-57`), so this asserts only what
 * a wrapper can get wrong: which Page it mounts, and that the route's id
 * reaches the vista instead of being dropped.
 */
describe('ListPageClient', () => {
  it('mounts the All Tasks surface over the list the route names', async () => {
    const store = makeStore(stubbedThunkExtra)

    render(
      <StoreProvider store={store}>
        <ListPageClient listId="p-9" />
      </StoreProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('tasks-surface')).toBeTruthy()
    })
    expect(store.getState().find.tasksSelection).toMatchObject({
      kind: 'list',
      listId: 'p-9',
    })
  })
})
