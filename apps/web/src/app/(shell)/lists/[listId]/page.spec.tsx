import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ListRoute from './page'

describe('/lists/[listId]', () => {
  it('forwards the project id from the route to the shared Page', async () => {
    const element = await ListRoute({
      params: Promise.resolve({ listId: 'p-2' }),
    })

    render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        {element}
      </StoreProvider>,
    )

    // No projects are loaded in this store, so the heading is empty rather
    // than a guessed name — the id is the identity, the title is presentation.
    expect(screen.getByTestId('destination-placeholder')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('')
  })
})
