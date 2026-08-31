import { StoreProvider, makeStore, stubbedThunkExtra } from '@kro/app'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { PlanPageClient } from './PlanPageClient'

/**
 * The route's own smoke test: `/plan` serves the Plan surface, and the surface
 * it serves is the timeline.
 *
 * The Server Page is a passive shell (`RC-57`) and its one prefetch needs
 * `next/headers` — a request scope jsdom does not have — so `page.tsx` itself
 * is exercised end to end by `e2e/plan-timeline.spec.ts`, which loads the
 * route in a real browser. What is checked here is the shape the route
 * renders, mounted exactly as the route mounts it.
 *
 * The wrapper's own contract has its own file beside this one.
 */
beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', {
    value: 1440,
    configurable: true,
  })
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes('min-width'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
      onchange: null,
    }) as unknown as MediaQueryList) as typeof window.matchMedia
})

const mount = (store = makeStore(stubbedThunkExtra)) => {
  render(
    <StoreProvider store={store}>
      <PlanPageClient />
    </StoreProvider>,
  )
  return store
}

describe('/plan', () => {
  it('serves the Plan surface, not a placeholder — a user opens the tab', () => {
    mount()

    expect(screen.getByTestId('plan-surface')).toBeInTheDocument()
    expect(
      screen.queryByTestId('destination-placeholder'),
    ).not.toBeInTheDocument()
  })

  it('opens on the timeline destination, with its hour grid drawn', () => {
    mount()

    expect(screen.getByTestId('plan-timeline')).toBeInTheDocument()
    expect(screen.getAllByTestId('plan-timeline-hour-rule')).toHaveLength(25)
  })

  it('tells the shell the URL landed on Plan, so the chrome follows', () => {
    // The shell's own heading and sidebar highlight are rendered above this
    // route, so what the route can be held to is the signal it sends — which
    // is exactly what went missing when the placeholder was replaced, and
    // exactly what left `/plan` serving the timeline under a "My Day" header.
    const store = mount()

    expect(store.getState().main.selected.kind).toBe('plan')
  })
})
