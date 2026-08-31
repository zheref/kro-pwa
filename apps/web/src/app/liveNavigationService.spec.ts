import { describe, expect, it, vi } from 'vitest'
import { makeLiveNavigationService } from './liveNavigationService'

describe('makeLiveNavigationService', () => {
  it('pushes a new history entry for an ordinary navigation', () => {
    const push = vi.fn()
    const service = makeLiveNavigationService({
      push,
      replace: vi.fn(),
      back: vi.fn(),
    })

    service.navigate('/my-day')

    expect(push).toHaveBeenCalledWith('/my-day')
  })

  it('replaces the current entry when asked, leaving no back step', () => {
    const replace = vi.fn()
    const service = makeLiveNavigationService({
      push: vi.fn(),
      replace,
      back: vi.fn(),
    })

    service.replace('/inbox')

    expect(replace).toHaveBeenCalledWith('/inbox')
  })

  it('steps back without a path', () => {
    const back = vi.fn()
    const service = makeLiveNavigationService({
      push: vi.fn(),
      replace: vi.fn(),
      back,
    })

    service.back()

    expect(back).toHaveBeenCalledWith()
  })

  it('touches the router only when a Producer asks it to', () => {
    const push = vi.fn()
    makeLiveNavigationService({ push, replace: vi.fn(), back: vi.fn() })

    expect(push).not.toHaveBeenCalled()
  })

  it('calls the router through a closure, so `this` is never lost', () => {
    // Next's router methods read `this`; `push: router.push` would drop it.
    // Passing an object whose method depends on `this` proves the binding.
    const router = {
      history: [] as string[],
      push(path: string) {
        this.history.push(path)
      },
      replace: vi.fn(),
      back: vi.fn(),
    }

    makeLiveNavigationService(router).navigate('/earn')

    expect(router.history).toEqual(['/earn'])
  })
})
