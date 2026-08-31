import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MyDayPageClient } from './MyDayPageClient'

/**
 * `RC-57` exempts a Client Wrapper from the per-artifact minimums — it is a
 * passive shell and the coverage lives in `DoPage`. These two cases exist for
 * what the wrapper alone can be wrong about: mounting the Do surface at all,
 * and telling the shell which destination the route is.
 */
describe('MyDayPageClient', () => {
  it('mounts the Do surface', () => {
    render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <MyDayPageClient />
      </StoreProvider>,
    )

    expect(screen.getByTestId('do-surface')).toBeTruthy()
  })

  it('selects the My Day destination, so the sidebar row lights up', () => {
    const store = makeStore(stubbedThunkExtra)
    render(
      <StoreProvider store={store}>
        <MyDayPageClient />
      </StoreProvider>,
    )

    expect(store.getState().main.selected).toMatchObject({ kind: 'myDay' })
  })
})
