/**
 * `ThirstDestinationPage` — mirrors `DestinationPage.test.tsx`'s own shape:
 * what matters is that mounting one of these four routes still selects the
 * destination in the shell slice, the same as the shared `DestinationPage`
 * this component stands in for (see its own header for why).
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { StoreProvider } from '../../../library/StoreProvider'
import { makeStore, stubbedThunkExtra } from '../../../library/store'
import { ThirstDestinationPage } from '../ThirstDestinationPage'

afterEach(cleanup)

describe.each([
  ['matrix', 'Priority Matrix'],
  ['board', 'Board'],
  ['blueprints', 'Blueprints'],
  ['habits', 'Habits'],
] as const)('ThirstDestinationPage kind=%s', (kind, title) => {
  it(`selects "${kind}" on mount and renders "${title}"`, () => {
    const store = makeStore(stubbedThunkExtra)
    render(
      <StoreProvider store={store}>
        <ThirstDestinationPage kind={kind} />
      </StoreProvider>,
    )

    expect(store.getState().main.selected.kind).toBe(kind)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(title)
  })
})

describe('ThirstDestinationPage', () => {
  it('re-mounting a different kind re-selects the shell to that destination', () => {
    const store = makeStore(stubbedThunkExtra)
    const { rerender } = render(
      <StoreProvider store={store}>
        <ThirstDestinationPage kind="matrix" />
      </StoreProvider>,
    )
    expect(store.getState().main.selected.kind).toBe('matrix')

    rerender(
      <StoreProvider store={store}>
        <ThirstDestinationPage kind="habits" />
      </StoreProvider>,
    )
    expect(store.getState().main.selected.kind).toBe('habits')
  })
})
