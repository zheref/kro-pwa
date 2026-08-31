import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DestinationPageClient } from './DestinationPageClient'

describe('DestinationPageClient', () => {
  it('forwards a simple destination to the shared Page', () => {
    // `inbox` rather than `earn`: `#28` replaced the earn placeholder with
    // the real `EarnPage`, whose own heading assertions live in
    // `apps/web/src/app/(shell)/earn/page.spec.tsx` and
    // `packages/app/src/features/main/__tests__/DestinationPage.test.tsx`.
    // This test only proves the wrapper forwards props — any still-placeholder
    // destination demonstrates that identically.
    render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <DestinationPageClient kind="inbox" />
      </StoreProvider>,
    )

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Inbox')
  })

  it("forwards a list destination's id as well", () => {
    const store = makeStore(stubbedThunkExtra)
    render(
      <StoreProvider store={store}>
        <DestinationPageClient kind="list" listId="p-7" />
      </StoreProvider>,
    )

    expect(store.getState().main.selected).toMatchObject({
      kind: 'list',
      listId: 'p-7',
    })
  })
})
