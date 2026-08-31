import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MyDayRoute from './page'

/**
 * `RC-57` exempts the Server Page and its Client Wrapper from the per-artifact
 * minimums — they are passive shells and the coverage lives in `DoPage`. This
 * one case is kept because it is the only place that proves the *route* mounts
 * the Do surface rather than the shared placeholder, which is the swap this
 * issue performs in `apps/web`.
 */
describe('/my-day', () => {
  it('mounts the Do surface inside the shell store', () => {
    render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <MyDayRoute />
      </StoreProvider>,
    )

    expect(screen.getByTestId('do-surface')).toBeTruthy()
    expect(screen.queryByTestId('destination-placeholder')).toBeNull()
  })
})
