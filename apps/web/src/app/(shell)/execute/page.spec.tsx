import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import ExecuteRoute from './page'

/**
 * The route file is a passive Server Component (`RC-38`/`RC-57`), so this
 * asserts only what a route file can get wrong: that it mounts the session
 * surface rather than the shared placeholder, and that the shell's selection
 * still follows the URL.
 */
beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', {
    value: 1440,
    configurable: true,
  })
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes('min-width'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
      onchange: null,
    }) as unknown as MediaQueryList) as typeof window.matchMedia
})

describe('/execute', () => {
  it('mounts the session surface as the destination’s own column', async () => {
    const { container } = render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <ExecuteRoute />
      </StoreProvider>,
    )

    await waitFor(() => {
      expect(
        container.querySelector('[data-kro-session-surface="inline"]'),
      ).toBeTruthy()
    })
    expect(screen.getByText('READY')).toBeTruthy()
  })

  it('selects the Execute destination, so the shell highlight follows the URL', async () => {
    const store = makeStore(stubbedThunkExtra)
    render(
      <StoreProvider store={store}>
        <ExecuteRoute />
      </StoreProvider>,
    )

    await waitFor(() => {
      expect(store.getState().main.selected.kind).toBe('session')
    })
  })
})
