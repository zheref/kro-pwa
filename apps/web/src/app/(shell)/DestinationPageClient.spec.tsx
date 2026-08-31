import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DestinationPageClient } from './DestinationPageClient'

describe('DestinationPageClient', () => {
  it('forwards a simple destination to the shared Page', () => {
    render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <DestinationPageClient kind="earn" />
      </StoreProvider>,
    )

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      'Rewards',
    )
  })

  it("forwards a list destination's id as well", () => {
    const store = makeStore(stubbedThunkExtra)
    render(
      <StoreProvider store={store}>
        <DestinationPageClient kind="list" listId="p-7" />
      </StoreProvider>,
    )

    expect(store.getState().main.selected).toMatchObject({
      kind: 'list',
      listId: 'p-7',
    })
  })
})
