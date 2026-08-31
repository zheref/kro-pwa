import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import BoardRoute from './page'

describe('/board', () => {
  it("mounts the Board destination inside the shell's store", () => {
    render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <BoardRoute />
      </StoreProvider>,
    )

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Board')
  })
})
