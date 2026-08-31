import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlanPageClient } from './PlanPageClient'

/**
 * The Client Page Wrapper is a passive shell (`RC-57`), so this asserts only
 * the two things a wrapper can get wrong: that it forwards the Server Page's
 * props untouched, and that the one behaviour it adds is wired.
 *
 * That behaviour is the OAuth hand-off. It lives here rather than in the
 * shared tier because it is a **full-document** navigation — the browser has
 * to leave for Google's consent screen and come back with a cookie — which
 * cannot go through the app router, and which `RC-17`/`RC-40` keep out of
 * `packages/app` either way.
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

const mount = (props: Parameters<typeof PlanPageClient>[0] = {}) =>
  render(
    <StoreProvider store={makeStore(stubbedThunkExtra)}>
      <PlanPageClient {...props} />
    </StoreProvider>,
  )

describe('PlanPageClient', () => {
  it('forwards a healthy connection as no banner — the common case', () => {
    mount({ googleNeedsReconnect: false })

    expect(
      screen.queryByTestId('plan-reconnect-banner'),
    ).not.toBeInTheDocument()
  })

  it('forwards a lapsed grant, so the banner the route resolved appears', () => {
    mount({
      googleNeedsReconnect: true,
      googleReconnectDetail:
        'Kro no longer has access to your Google Calendar. Reconnect to see your events.',
    })

    expect(screen.getByTestId('plan-reconnect-banner')).toBeInTheDocument()
    expect(
      screen.getByText(/no longer has access to your Google Calendar/),
    ).toBeInTheDocument()
  })

  it('starts the OAuth flow when the reconnect action is used', () => {
    const assign = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign },
      configurable: true,
    })

    mount({ googleNeedsReconnect: true })
    screen.getByRole('button', { name: 'Reconnect' }).click()

    expect(assign).toHaveBeenCalledWith('/api/google/connect')
  })

  it('forwards the rate-limit line the route composed', () => {
    mount({ staleSyncLabel: 'Rate limit hit. Last synced 3 min ago' })

    expect(screen.getByTestId('plan-stale-sync-banner')).toBeInTheDocument()
  })
})
