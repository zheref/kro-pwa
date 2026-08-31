import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ExecuteRoute from './page'

describe('/execute', () => {
  it("mounts the Execute destination inside the shell's store", () => {
    render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <ExecuteRoute />
      </StoreProvider>,
    )

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      'Session',
    )
  })
})
