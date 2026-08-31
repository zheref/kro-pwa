import { describe, expect, it, vi } from 'vitest'
import {
  SERVICE_WORKER_PATH,
  SERVICE_WORKER_SCOPE,
  type ServiceWorkerContainerLike,
  registerAppServiceWorker,
} from './registerServiceWorker'

const registration = {} as ServiceWorkerRegistration

describe('registerAppServiceWorker', () => {
  it('registers the worker at the app root', async () => {
    const register = vi.fn(async () => registration)
    const container = { register } as unknown as ServiceWorkerContainerLike

    await registerAppServiceWorker({ container })

    expect(register).toHaveBeenCalledWith(SERVICE_WORKER_PATH, {
      scope: SERVICE_WORKER_SCOPE,
      updateViaCache: 'none',
    })
  })

  it('bypasses the HTTP cache for sw.js, so a deploy is never a worker behind', async () => {
    const register: ServiceWorkerContainerLike['register'] = vi.fn(
      async () => registration,
    )

    await registerAppServiceWorker({ container: { register } })

    expect(vi.mocked(register).mock.calls[0]?.[1]?.updateViaCache).toBe('none')
  })

  it('hands the registration back so a caller can post to the worker', async () => {
    const container = {
      register: async () => registration,
    } as unknown as ServiceWorkerContainerLike

    expect(await registerAppServiceWorker({ container })).toBe(registration)
  })

  it('resolves null where the browser has no service-worker support', async () => {
    expect(await registerAppServiceWorker({ container: null })).toBeNull()
  })

  it('resolves null and logs when registration is refused (private window)', async () => {
    const log = vi.fn()
    const container = {
      register: async () => {
        throw new Error('SecurityError')
      },
    } as unknown as ServiceWorkerContainerLike

    expect(await registerAppServiceWorker({ container, log })).toBeNull()
    expect(log).toHaveBeenCalledTimes(1)
  })

  it('never throws, because losing offline support is not a user-facing error', async () => {
    const container = {
      register: async () => {
        throw new Error('boom')
      },
    } as unknown as ServiceWorkerContainerLike

    await expect(
      registerAppServiceWorker({ container, log: () => {} }),
    ).resolves.toBeNull()
  })

  it('resolves null under jsdom, which has no serviceWorker on navigator', async () => {
    // No `container` option: this exercises the default resolution against the
    // real environment, which is the branch a server render also takes.
    expect('serviceWorker' in navigator).toBe(false)
    expect(await registerAppServiceWorker()).toBeNull()
  })

  it('logs to the console by default, with no logger injected', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const container = {
      register: async () => {
        throw new Error('SecurityError')
      },
    } as unknown as ServiceWorkerContainerLike

    await registerAppServiceWorker({ container })

    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})
