import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TasksPageClient } from './TasksPageClient'

/**
 * The wrapper is a passive shell (`RC-39`, `RC-57`), so this asserts only what
 * a wrapper can get wrong: which Page it mounts, and which vista it names.
 */
describe('TasksPageClient', () => {
  it('mounts the All Tasks surface over the default vista', async () => {
    const store = makeStore(stubbedThunkExtra)

    render(
      <StoreProvider store={store}>
        <TasksPageClient />
      </StoreProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('tasks-surface')).toBeTruthy()
    })
    expect(store.getState().find.tasksSelection).toEqual({ kind: 'default' })
  })
})
