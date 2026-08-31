import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { onViewLoaded } from '../../features/greeting/GreetingFeature'
import { StoreProvider } from '../StoreProvider'
import { useAppSelector } from '../hooks'
import { makeStore, stubbedThunkExtra } from '../store'

afterEach(cleanup)

function RecipientProbe() {
  const recipient = useAppSelector((state) => state.greeting.recipient)
  return <span data-testid="recipient">{recipient ?? 'nobody'}</span>
}

describe('StoreProvider', () => {
  it('binds the tree to the store instance it was handed', () => {
    const store = makeStore(stubbedThunkExtra)
    store.dispatch(onViewLoaded({ recipient: 'ada' }))

    render(
      <StoreProvider store={store}>
        <RecipientProbe />
      </StoreProvider>,
    )

    expect(screen.getByTestId('recipient').textContent).toBe('ada')
  })

  it('never builds a store of its own — two trees, two stores, no shared state', () => {
    const first = makeStore(stubbedThunkExtra)
    const second = makeStore(stubbedThunkExtra)
    first.dispatch(onViewLoaded({ recipient: 'ada' }))

    render(
      <div>
        <StoreProvider store={first}>
          <span data-testid="first">
            <RecipientProbe />
          </span>
        </StoreProvider>
        <StoreProvider store={second}>
          <span data-testid="second">
            <RecipientProbe />
          </span>
        </StoreProvider>
      </div>,
    )

    expect(screen.getByTestId('first').textContent).toBe('ada')
    expect(screen.getByTestId('second').textContent).toBe('nobody')
  })

  it('renders its children untouched — it is a binding, not a layout', () => {
    render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <h1>Kro</h1>
        <p>Focus.</p>
      </StoreProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Kro' })).toBeDefined()
    expect(screen.getByText('Focus.')).toBeDefined()
  })
})
