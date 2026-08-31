import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TasksRoute from './page'

describe('/tasks', () => {
  it("mounts the All Tasks surface inside the shell's store", async () => {
    render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <TasksRoute />
      </StoreProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('tasks-surface')).toBeTruthy()
    })
    expect(screen.getByRole('radiogroup', { name: 'Group by' })).toBeTruthy()
  })

  it('installs the default `.tasks*` vista this route names', async () => {
    const store = makeStore(stubbedThunkExtra)

    render(
      <StoreProvider store={store}>
        <TasksRoute />
      </StoreProvider>,
    )

    await waitFor(() => {
      expect(store.getState().find.tasksSelection).toEqual({ kind: 'default' })
    })
    expect(store.getState().main.selected.kind).toBe('allTasks')
  })
})
