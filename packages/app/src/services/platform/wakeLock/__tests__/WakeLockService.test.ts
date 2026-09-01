/**
 * The wake-lock state machine, against a stubbed Screen Wake Lock API and a
 * stubbed `document` — the acquire / release / **re-acquire** path canon's iOS
 * latch never has to deal with.
 */
import { describe, expect, it, vi } from 'vitest'
import {
  type VisibilityDocumentLike,
  type WakeLockApiLike,
  type WakeLockSentinelLike,
  makeLiveWakeLockService,
  makeStubbedWakeLockService,
} from '../WakeLockService'

/** A wake-lock API that hands out release-tracking sentinels. */
const makeWakeLockApi = (options: { refuse?: boolean } = {}) => {
  const granted: { released: boolean }[] = []
  const request = vi.fn(async (): Promise<WakeLockSentinelLike> => {
    if (options.refuse) throw new Error('NotAllowedError')
    const sentinel = { released: false }
    granted.push(sentinel)
    return {
      release: async () => {
        sentinel.released = true
      },
    }
  })
  return { api: { request } as unknown as WakeLockApiLike, request, granted }
}

/** A `document` whose visibility a test drives directly. */
const makeVisibilityDocument = () => {
  const listeners = new Set<() => void>()
  let visibilityState = 'visible'
  const doc: VisibilityDocumentLike = {
    get visibilityState() {
      return visibilityState
    },
    addEventListener: (_type, listener) => {
      listeners.add(listener)
    },
    removeEventListener: (_type, listener) => {
      listeners.delete(listener)
    },
  }
  return {
    doc,
    listenerCount: () => listeners.size,
    hide: () => {
      visibilityState = 'hidden'
      for (const listener of [...listeners]) listener()
    },
    show: () => {
      visibilityState = 'visible'
      for (const listener of [...listeners]) listener()
    },
  }
}

const liveWith = (options: { refuse?: boolean } = {}) => {
  const wakeLock = makeWakeLockApi(options)
  const visibility = makeVisibilityDocument()
  const service = makeLiveWakeLockService({
    wakeLock: wakeLock.api,
    document: visibility.doc,
    log: () => {},
  })
  return { service, wakeLock, visibility }
}

describe('liveWakeLockService — support', () => {
  it('reports unsupported where the browser has no wakeLock API', () => {
    const service = makeLiveWakeLockService({ wakeLock: null, document: null })
    expect(service.isSupported()).toBe(false)
  })

  it('reports supported when the API is present', () => {
    const { service } = liveWith()
    expect(service.isSupported()).toBe(true)
  })

  it('never throws on an unsupported browser — the toggle is advisory', async () => {
    const service = makeLiveWakeLockService({ wakeLock: null, document: null })
    await expect(service.setKeepAwake(true)).resolves.toBeUndefined()
    expect(service.isHeld()).toBe(false)
  })
})

describe('liveWakeLockService — acquire and release', () => {
  it('takes a sentinel when a session starts running', async () => {
    const { service, wakeLock } = liveWith()

    await service.setKeepAwake(true)

    expect(wakeLock.request).toHaveBeenCalledWith('screen')
    expect(service.isHeld()).toBe(true)
  })

  it('releases the sentinel when the session pauses or concludes', async () => {
    const { service, wakeLock } = liveWith()
    await service.setKeepAwake(true)

    await service.setKeepAwake(false)

    expect(wakeLock.granted[0]?.released).toBe(true)
    expect(service.isHeld()).toBe(false)
  })

  it('is idempotent: re-asserting the hold does not stack sentinels', async () => {
    const { service, wakeLock } = liveWith()

    await service.setKeepAwake(true)
    await service.setKeepAwake(true)

    expect(wakeLock.request).toHaveBeenCalledTimes(1)
  })

  it('is idempotent on release: a second release is a no-op', async () => {
    const { service } = liveWith()
    await service.setKeepAwake(true)

    await service.setKeepAwake(false)
    await expect(service.setKeepAwake(false)).resolves.toBeUndefined()

    expect(service.isHeld()).toBe(false)
  })

  it('keeps the request standing when the browser refuses the lock', async () => {
    const { service } = liveWith({ refuse: true })

    await service.setKeepAwake(true)

    expect(service.isHeld()).toBe(false)
    expect(service.isKeepAwakeRequested()).toBe(true)
  })
})

describe('liveWakeLockService — visibility', () => {
  it('re-acquires when the tab comes back, because the browser dropped it', async () => {
    const { service, wakeLock, visibility } = liveWith()
    await service.setKeepAwake(true)

    visibility.hide()
    expect(service.isHeld()).toBe(false)

    visibility.show()
    await Promise.resolve()
    await Promise.resolve()

    expect(wakeLock.request).toHaveBeenCalledTimes(2)
    expect(service.isHeld()).toBe(true)
  })

  it('does not re-acquire for a session that is no longer running', async () => {
    const { service, wakeLock, visibility } = liveWith()
    await service.setKeepAwake(true)
    await service.setKeepAwake(false)

    visibility.show()
    await Promise.resolve()

    expect(wakeLock.request).toHaveBeenCalledTimes(1)
  })

  it('leaves the request standing across a hide, so the session is unaffected', async () => {
    const { service, visibility } = liveWith()
    await service.setKeepAwake(true)

    visibility.hide()

    expect(service.isKeepAwakeRequested()).toBe(true)
  })

  it('detaches its visibility listener once the hold is released', async () => {
    const { service, visibility } = liveWith()
    await service.setKeepAwake(true)
    expect(visibility.listenerCount()).toBe(1)

    await service.setKeepAwake(false)

    expect(visibility.listenerCount()).toBe(0)
  })

  it('retries an earlier refusal on the next visible turn', async () => {
    const wakeLock = makeWakeLockApi({ refuse: true })
    const visibility = makeVisibilityDocument()
    const service = makeLiveWakeLockService({
      wakeLock: wakeLock.api,
      document: visibility.doc,
      log: () => {},
    })

    await service.setKeepAwake(true)
    visibility.show()
    await Promise.resolve()

    expect(wakeLock.request).toHaveBeenCalledTimes(2)
  })
})

describe('stubbedWakeLockService', () => {
  it("records every request so a suite can assert the session's transitions", async () => {
    const service = makeStubbedWakeLockService()

    await service.setKeepAwake(true)
    await service.setKeepAwake(false)

    expect(service.recordedRequests()).toEqual([true, false])
  })

  it('reports held only while the hold is asked for', async () => {
    const service = makeStubbedWakeLockService()
    expect(service.isHeld()).toBe(false)

    await service.setKeepAwake(true)

    expect(service.isHeld()).toBe(true)
  })

  it('never reports held on a device the fixture says is unsupported', async () => {
    const service = makeStubbedWakeLockService({ supported: false })

    await service.setKeepAwake(true)

    expect(service.isSupported()).toBe(false)
    expect(service.isHeld()).toBe(false)
    expect(service.isKeepAwakeRequested()).toBe(true)
  })
})
