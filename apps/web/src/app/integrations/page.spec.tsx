import { describe, expect, it, vi } from 'vitest'

/**
 * `/integrations` — retired, still resolvable.
 *
 * Calendar-connect is a pane inside the Settings hub, not a destination, so the
 * only correct target is the hub itself. That is what these cases pin.
 */
const redirect = vi.fn()
vi.mock('next/navigation', () => ({
  redirect: (path: string) => redirect(path),
}))

describe('the retired /integrations address', () => {
  it('sends a connect link to the hub that owns the Integrations pane', async () => {
    const { default: IntegrationsRoute } = await import('./page')

    IntegrationsRoute()

    expect(redirect).toHaveBeenCalledWith('/adjust')
  })

  it('does not invent a destination canon has no route for', async () => {
    redirect.mockClear()
    const { default: IntegrationsRoute } = await import('./page')

    IntegrationsRoute()

    expect(redirect).toHaveBeenCalledTimes(1)
    expect(redirect).not.toHaveBeenCalledWith('/integrations')
  })

  it('renders nothing of its own — the stub content is gone', async () => {
    redirect.mockClear()
    const { default: IntegrationsRoute } = await import('./page')

    expect(IntegrationsRoute()).toBeUndefined()
  })
})
