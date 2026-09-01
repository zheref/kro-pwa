/**
 * PWA install capture — the `beforeinstallprompt` dance, against a stubbed
 * `window`.
 *
 * The three-way availability is what most of these assert: *not yet* and
 * *never* are different answers, and only one of them should ever put a button
 * on screen.
 */
import { describe, expect, it, vi } from 'vitest'
import {
  type InstallPromptEventLike,
  type InstallWindowLike,
  makeLiveInstallService,
  makeStubbedInstallService,
} from '../InstallService'

const makeWindow = (options: { standalone?: boolean } = {}) => {
  const listeners = new Map<string, Set<(event: unknown) => void>>()
  const win: InstallWindowLike = {
    addEventListener: (type, listener) => {
      const bucket = listeners.get(type) ?? new Set()
      bucket.add(listener)
      listeners.set(type, bucket)
    },
    removeEventListener: (type, listener) => {
      listeners.get(type)?.delete(listener)
    },
    matchMedia: () => ({ matches: options.standalone === true }),
  }
  return {
    win,
    listenerCount: () =>
      [...listeners.values()].reduce((n, s) => n + s.size, 0),
    dispatch: (type: string, event: unknown) => {
      for (const listener of [...(listeners.get(type) ?? [])]) listener(event)
    },
  }
}

const promptEvent = (outcome: string): InstallPromptEventLike => ({
  preventDefault: vi.fn(),
  prompt: vi.fn(async () => {}),
  userChoice: Promise.resolve({ outcome }),
})

const liveWith = (options: { standalone?: boolean } = {}) => {
  const host = makeWindow(options)
  const service = makeLiveInstallService({
    window: host.win,
    isStandaloneNavigator: () => false,
  })
  return { service, host }
}

describe('liveInstallService — availability', () => {
  it('says "unknown" before the browser has offered anything', () => {
    const { service } = liveWith()
    expect(service.availability()).toBe('unknown')
  })

  it('says "unavailable" where there is no window at all (server render)', () => {
    const service = makeLiveInstallService({
      window: null,
      isStandaloneNavigator: () => false,
    })
    expect(service.availability()).toBe('unavailable')
  })

  it('says "available" once beforeinstallprompt has been captured', () => {
    const { service, host } = liveWith()

    host.dispatch('beforeinstallprompt', promptEvent('accepted'))

    expect(service.availability()).toBe('available')
  })

  it("suppresses the browser's own mini-infobar when it captures", () => {
    const { service, host } = liveWith()
    const event = promptEvent('accepted')

    host.dispatch('beforeinstallprompt', event)

    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(service.availability()).toBe('available')
  })

  it('says "installed" when already running as an installed app', () => {
    const { service } = liveWith({ standalone: true })
    expect(service.availability()).toBe('installed')
    expect(service.isStandalone()).toBe(true)
  })

  it('says "installed" on iOS, which reports standalone off navigator', () => {
    const host = makeWindow()
    const service = makeLiveInstallService({
      window: host.win,
      isStandaloneNavigator: () => true,
    })
    expect(service.availability()).toBe('installed')
  })

  it('flips to installed when the browser reports appinstalled', () => {
    const { service, host } = liveWith()
    host.dispatch('beforeinstallprompt', promptEvent('accepted'))

    host.dispatch('appinstalled', {})

    expect(service.availability()).toBe('installed')
  })
})

describe('liveInstallService — prompt', () => {
  it('reports "unavailable" rather than throwing when nothing was captured', async () => {
    const { service } = liveWith()
    expect(await service.prompt()).toBe('unavailable')
  })

  it('raises the captured prompt and reports acceptance', async () => {
    const { service, host } = liveWith()
    const event = promptEvent('accepted')
    host.dispatch('beforeinstallprompt', event)

    expect(await service.prompt()).toBe('accepted')
    expect(event.prompt).toHaveBeenCalledTimes(1)
  })

  it('reports a dismissal as a dismissal, not a failure', async () => {
    const { service, host } = liveWith()
    host.dispatch('beforeinstallprompt', promptEvent('dismissed'))

    expect(await service.prompt()).toBe('dismissed')
  })

  it('consumes the single-use event, so a second press is not a dead button', async () => {
    const { service, host } = liveWith()
    host.dispatch('beforeinstallprompt', promptEvent('dismissed'))

    await service.prompt()

    expect(service.availability()).toBe('unknown')
    expect(await service.prompt()).toBe('unavailable')
  })
})

describe('liveInstallService — dispose', () => {
  it('detaches both listeners', () => {
    const { service, host } = liveWith()
    expect(host.listenerCount()).toBe(2)

    service.dispose()

    expect(host.listenerCount()).toBe(0)
  })

  it('is a no-op with no window', () => {
    const service = makeLiveInstallService({
      window: null,
      isStandaloneNavigator: () => false,
    })
    expect(() => service.dispose()).not.toThrow()
  })

  it('stops capturing once disposed', () => {
    const { service, host } = liveWith()
    service.dispose()

    host.dispatch('beforeinstallprompt', promptEvent('accepted'))

    expect(service.availability()).toBe('unknown')
  })
})

describe('stubbedInstallService', () => {
  it('starts available, per its fixture', () => {
    expect(makeStubbedInstallService().availability()).toBe('available')
  })

  it('counts prompts and lands installed on acceptance', async () => {
    const service = makeStubbedInstallService()

    expect(await service.prompt()).toBe('accepted')

    expect(service.promptCount()).toBe(1)
    expect(service.availability()).toBe('installed')
  })

  it('never raises a prompt a browser could not offer', async () => {
    const service = makeStubbedInstallService({ availability: 'unavailable' })

    expect(await service.prompt()).toBe('unavailable')
    expect(service.promptCount()).toBe(0)
  })
})
