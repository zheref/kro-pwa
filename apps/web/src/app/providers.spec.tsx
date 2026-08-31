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
 * The composition root. Three things are wired here, and each has one failure
 * mode worth a test: a second store per render, a theme written onto an
 * attribute the tokens do not read, and a router that never reaches a
 * Producer.
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
