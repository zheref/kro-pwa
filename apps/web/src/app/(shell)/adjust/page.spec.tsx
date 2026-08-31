import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AdjustRoute from './page'

describe('/adjust', () => {
  it("mounts the Adjust destination inside the shell's store", () => {
    render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <AdjustRoute />
      </StoreProvider>,
    )

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      'Settings',
    )
  })
})
