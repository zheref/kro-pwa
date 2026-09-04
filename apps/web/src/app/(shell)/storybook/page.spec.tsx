import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import StorybookRoute from './page'

describe('/storybook', () => {
  it("mounts the Design System destination inside the shell's store", () => {
    const store = makeStore(stubbedThunkExtra)
    render(
      <StoreProvider store={store}>
        <StorybookRoute />
      </StoreProvider>,
    )

    expect(screen.getByTestId('design-system-catalog')).toBeTruthy()
    expect(store.getState().main.selected.kind).toBe('designSystem')
  })
})
