import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InboxRouteClient } from './InboxRouteClient'

/**
 * The wrapper is a passive shell (`RC-39`, exempt from the per-artifact minimum
 * by `RC-57`), so this asserts only what a wrapper can get wrong: that it
 * mounts the shared Page and adds nothing of its own.
 */
describe('InboxRouteClient', () => {
  it('mounts the shared Inbox destination Page', () => {
    render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <InboxRouteClient />
      </StoreProvider>,
    )

    expect(screen.getByTestId('inbox-surface')).toBeTruthy()
  })

  it('adds no chrome of its own — the Page owns the whole surface', () => {
    const { container } = render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <InboxRouteClient />
      </StoreProvider>,
    )

    expect(container.firstElementChild?.getAttribute('data-testid')).toBe(
      'inbox-surface',
    )
  })
})
