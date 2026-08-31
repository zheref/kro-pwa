import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MatrixRoute from './page'

describe('/matrix', () => {
  it("mounts the Priority Matrix destination inside the shell's store", () => {
    render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <MatrixRoute />
      </StoreProvider>,
    )

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      'Priority Matrix',
    )
  })
})
