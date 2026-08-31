import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ExecutePageClient } from './ExecutePageClient'

/**
 * A Client Page Wrapper is a passive shell (`RC-39`/`RC-57`): it imports the
 * Page and forwards props, and there is nothing else it could do wrong. This
 * asserts exactly that — the wrapper mounts the shared Page, and adds no markup
 * or decision of its own.
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

describe('ExecutePageClient', () => {
  it('mounts the shared session Page and nothing else', async () => {
    const { container } = render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <ExecutePageClient />
      </StoreProvider>,
    )

    await waitFor(() => {
      expect(
        container.querySelector('[data-kro-session-surface="inline"]'),
      ).toBeTruthy()
    })
  })
})
