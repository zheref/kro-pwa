import * as kroApp from '@kro/app'
import {
  navigateToDestinationThunk,
  useAppDispatch,
  useAppSelector,
} from '@kro/app'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Providers } from './providers'

/**
 * The composition root. Four things are wired here, and each has one failure
 * mode worth a test: a second store per render, a theme written onto an
 * attribute the tokens do not read, a router that never reaches a Producer,
 * and an auth-state subscription that is never started — or never stopped.
 */
const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: (path: string) => push(path),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}))

beforeEach(() => {
  push.mockClear()
  document.documentElement.removeAttribute('data-theme')
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

function Probe() {
  const selected = useAppSelector((state) => state.main.selected.kind)
  return <span data-testid="probe">{selected}</span>
}

function Navigator() {
  const dispatch = useAppDispatch()
  return (
    <button
      type="button"
      onClick={() => {
        void dispatch(
          navigateToDestinationThunk({ destination: { kind: 'inbox' } }),
        )
      }}
    >
      go
    </button>
  )
}

describe('Providers', () => {
  it('builds one store and hands it to the tree', () => {
    const { rerender } = render(
      <Providers>
        <Probe />
      </Providers>,
    )

    const first = screen.getByTestId('probe').textContent
    rerender(
      <Providers>
        <Probe />
      </Providers>,
    )

    expect(screen.getByTestId('probe').textContent).toBe(first)
    // The initial destination, before any route has mounted.
    expect(first).toBe('myDay')
  })

  it('wires the router so a Producer navigates through the Service (RC-17)', async () => {
    render(
      <Providers>
        <Navigator />
      </Providers>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'go' }))

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/inbox')
    })
  })

  it('starts the auth-state subscription with the store’s own bindings', () => {
    const stop = vi.fn()
    const observe = vi.spyOn(kroApp, 'observeAuthState').mockReturnValue(stop)

    render(
      <Providers>
        <Probe />
      </Providers>,
    )

    expect(observe).toHaveBeenCalledTimes(1)
    const context = observe.mock.calls[0]?.[0]
    // The SAME extra the store's Producers read — a second `liveThunkExtra`
    // spread would subscribe to a different Supabase client.
    expect(typeof context?.dispatch).toBe('function')
    expect(context?.extra.authService).toBeDefined()
    expect(context?.now()).toBeInstanceOf(Date)

    observe.mockRestore()
  })

  it('stops the subscription when the root unmounts', () => {
    const stop = vi.fn()
    const observe = vi.spyOn(kroApp, 'observeAuthState').mockReturnValue(stop)

    const { unmount } = render(
      <Providers>
        <Probe />
      </Providers>,
    )
    expect(stop).not.toHaveBeenCalled()

    unmount()
    expect(stop).toHaveBeenCalledTimes(1)

    observe.mockRestore()
  })

  it('writes the scheme onto `data-theme`, which is what the tokens read', async () => {
    render(
      <Providers>
        <Probe />
      </Providers>,
    )

    await waitFor(() => {
      expect(document.documentElement.hasAttribute('data-theme')).toBe(true)
    })
  })
})
