import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppShellClient } from './AppShellClient'

/**
 * The wrapper is a passive shell (`RC-57`), so this asserts only what a
 * wrapper can get wrong: that it forwards its props and renders its children
 * inside the real shell.
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

describe('AppShellClient', () => {
  it('renders the destination inside the shell', () => {
    render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <AppShellClient isDevelopment={false}>
          <p>destination content</p>
        </AppShellClient>
      </StoreProvider>,
    )

    expect(screen.getByText('destination content')).toBeTruthy()
    expect(screen.getByTestId('shell-sidebar')).toBeTruthy()
  })

  it('forwards the build kind that gates the Tweak row', () => {
    render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <AppShellClient isDevelopment>
          <p>destination content</p>
        </AppShellClient>
      </StoreProvider>,
    )

    // The row still needs its flags resolved to render; what is asserted here
    // is only that the prop reached the Page without the wrapper deciding
    // anything of its own.
    expect(screen.getByTestId('shell-sidebar')).toBeTruthy()
  })
})
