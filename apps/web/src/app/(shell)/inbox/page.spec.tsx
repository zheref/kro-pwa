import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import InboxRoute from './page'

/**
 * The route file is a passive shell (`RC-57`), so this asserts only what a
 * route can get wrong: that it mounts the real Inbox destination inside the
 * store rather than the shared placeholder it used to render.
 */
describe('/inbox', () => {
  it("mounts the Jot Down destination inside the shell's store", () => {
    render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <InboxRoute />
      </StoreProvider>,
    )

    expect(screen.getByTestId('inbox-surface')).toBeTruthy()
  })

  it('presents it inline — a destination is navigated away from, not dismissed', () => {
    render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <InboxRoute />
      </StoreProvider>,
    )

    expect(
      screen.getByTestId('inbox-surface').getAttribute('data-kro-presentation'),
    ).toBe('inline')
    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull()
  })

  it('shows the centered tray when nothing has been captured yet', () => {
    render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <InboxRoute />
      </StoreProvider>,
    )

    expect(screen.getByText('Inbox is empty')).toBeTruthy()
  })
})
