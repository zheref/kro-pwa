import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ListRoute from './page'

describe('/lists/[listId]', () => {
  it('forwards the project id from the route to the shared Page', async () => {
    const store = makeStore(stubbedThunkExtra)
    const element = await ListRoute({
      params: Promise.resolve({ listId: 'p-2' }),
    })

    render(<StoreProvider store={store}>{element}</StoreProvider>)

    await waitFor(() => {
      expect(store.getState().find.tasksSelection).toEqual({
        kind: 'list',
        listId: 'p-2',
        listTitle: null,
      })
    })
  })

  it('renders the list destination as the All Tasks surface over that vista', async () => {
    const element = await ListRoute({
      params: Promise.resolve({ listId: 'p-2' }),
    })

    render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        {element}
      </StoreProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('tasks-surface')).toBeTruthy()
    })
  })

  it('selects the Lists row so the sidebar highlight follows the URL', async () => {
    const store = makeStore(stubbedThunkExtra)
    const element = await ListRoute({
      params: Promise.resolve({ listId: 'p-2' }),
    })

    render(<StoreProvider store={store}>{element}</StoreProvider>)

    await waitFor(() => {
      expect(store.getState().main.selected).toMatchObject({
        kind: 'list',
        listId: 'p-2',
      })
    })
  })
})
