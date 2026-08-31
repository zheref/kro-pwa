/**
 * `ComingSoonPage` driven through a real store against a stubbed
 * `thirstService` — the same shape `DestinationPage.test.tsx` uses for the
 * shell.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { StoreProvider } from '../../../library/StoreProvider'
import { makeStore, stubbedThunkExtra, type ThunkExtra } from '../../../library/store'
import { makeStubbedThirstService } from '../../../services/thirst/ThirstService'
import { thirstCountsFixture } from '../ThirstMocks'
import { ComingSoonPage } from '../ComingSoonPage'

afterEach(cleanup)

const renderPage = (
  featureKey: string,
  overrides: Partial<Parameters<typeof makeStubbedThirstService>[0]> = {},
) => {
  const extra: ThunkExtra = {
    ...stubbedThunkExtra,
    thirstService: makeStubbedThirstService(overrides),
  }
  const store = makeStore(extra)
  render(
    <StoreProvider store={store}>
      <ComingSoonPage featureKey={featureKey} />
    </StoreProvider>,
  )
  return store
}

describe('ComingSoonPage', () => {
  it('renders the registry title for a votable feature key', async () => {
    renderPage('matrix')
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      'Priority Matrix',
    )
  })

  it('shows the honest signed-out state once the auth check resolves', async () => {
    renderPage('matrix', { signedIn: false })
    await waitFor(() =>
      expect(
        screen.getByText('Sign in to vote for upcoming features.'),
      ).toBeTruthy(),
    )
  })

  it('reaches a seeded voted state through the real Page → Producer → reducer loop', async () => {
    renderPage('matrix', {
      signedIn: true,
      initialVotedFeatureKeys: ['matrix'],
      initialCounts: { matrix: thirstCountsFixture },
    })
    await waitFor(() => expect(screen.getByText('You voted')).toBeTruthy())
  })

  it('never fetches or offers a vote for an unmapped dead-end', () => {
    const thirstService = makeStubbedThirstService()
    const extra: ThunkExtra = { ...stubbedThunkExtra, thirstService }
    render(
      <StoreProvider store={makeStore(extra)}>
        <ComingSoonPage featureKey="unknown" />
      </StoreProvider>,
    )

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('unknown')
    expect(screen.queryByRole('button')).toBeNull()
    expect(thirstService.operations()).toEqual([])
  })

  it('falls back to the caller-supplied title for an unmapped dead-end', () => {
    render(
      <StoreProvider store={makeStore(stubbedThunkExtra)}>
        <ComingSoonPage featureKey="unknown" fallbackTitle="Unknown" />
      </StoreProvider>,
    )
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Unknown')
  })

  it('a tap on the vote CTA reaches the store as a cast vote', async () => {
    const store = renderPage('matrix', {
      signedIn: true,
      initialCounts: { matrix: thirstCountsFixture },
    })
    await waitFor(() => {
      const cta = screen.getByRole('button', {
        name: /vote to get it sooner/i,
      }) as HTMLButtonElement
      expect(cta.disabled).toBe(false)
    })
    screen.getByRole('button', { name: /vote to get it sooner/i }).click()
    await waitFor(() =>
      expect(store.getState().thirst.byFeatureKey.matrix?.alreadyVoted).toBe(true),
    )
  })
})
