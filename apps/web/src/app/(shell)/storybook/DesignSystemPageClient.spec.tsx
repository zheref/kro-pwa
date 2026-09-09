import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DesignSystemPageClient } from './DesignSystemPageClient'

describe('DesignSystemPageClient', () => {
  it("mounts the Design System gallery inside the shell's store", () => {
    const store = makeStore(stubbedThunkExtra)
    render(
      <StoreProvider store={store}>
        <DesignSystemPageClient />
      </StoreProvider>,
    )

    expect(screen.getByTestId('design-system-catalog')).toBeTruthy()
    expect(store.getState().main.selected.kind).toBe('designSystem')
  })
})
