import {
  MainShellPage,
  StoreProvider,
  makeStore,
  stubbedThunkExtra,
} from '@kro/app'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MyDayPageClient } from './MyDayPageClient'
import { installShellMatchMedia } from '../__tests__/shellTestEnvironment'

/**
 * `RC-57` exempts a Client Wrapper from the per-artifact minimums — it is a
 * passive shell and the coverage lives in `DoPage`. These two cases exist for
 * what the wrapper alone can be wrong about: mounting the Do surface at all,
 * and telling the shell which destination the route is.
 *
 * The destination is mounted **inside `MainShellPage`**, which is where the
 * route tree puts it. That is not decoration: the shell is what supplies the
 * Active Toast host (KC-IS-#71 item 15), and the Do surface raises a completion
 * toast — so a destination rendered with no shell around it has no host, and
 * `useActiveToasts()` throws by design rather than swallowing the toast.
 */
beforeEach(() => {
  installShellMatchMedia()
})

describe('MyDayPageClient', () => {
  it('mounts the Do surface', () => {
    render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <MainShellPage isDevelopment={false}>
          <MyDayPageClient />
        </MainShellPage>
      </StoreProvider>,
    )

    expect(screen.getByTestId('do-surface')).toBeTruthy()
  })

  it('selects the My Day destination, so the sidebar row lights up', () => {
    const store = makeStore(stubbedThunkExtra)
    render(
      <StoreProvider store={store}>
        <MainShellPage isDevelopment={false}>
          <MyDayPageClient />
        </MainShellPage>
      </StoreProvider>,
    )

    expect(store.getState().main.selected).toMatchObject({ kind: 'myDay' })
  })
})
