/**
 * The share hand-off's four outcomes, and the order that produces them.
 *
 * The Service is driven through an injected `navigator` seam rather than a
 * global stub, which is what lets the fallback ORDER be the thing under test:
 * the sheet first because it is the affordance the user expects, the clipboard
 * behind it because with no sheet a pasteable blurb is the closest thing to a
 * hand-off, and nothing at all only when neither exists.
 */
import { ShareOutcome } from '@kro/core'
import { describe, expect, it, vi } from 'vitest'
import {
  type ShareNavigatorLike,
  makeLiveShareService,
  makeStubbedShareService,
} from '../ShareService'

const abortError = () => {
  const error = new Error('the user closed the sheet')
  error.name = 'AbortError'
  return error
}

describe('the live binding, over an injected navigator', () => {
  it('hands the text to the share sheet when the platform has one', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const service = makeLiveShareService({ navigator: { share } })

    expect(await service.share('hello')).toBe(ShareOutcome.shared)
    expect(share).toHaveBeenCalledWith({ text: 'hello' })
  })

  it('reports a cancel as dismissed, and does NOT quietly copy instead', async () => {
    // The user said no. Copying anyway would be a second action they did not
    // ask for — and canon treats cancel and completion the same either way.
    const writeText = vi.fn()
    const service = makeLiveShareService({
      navigator: { share: () => Promise.reject(abortError()), writeText },
    })

    expect(await service.share('hello')).toBe(ShareOutcome.dismissed)
    expect(writeText).not.toHaveBeenCalled()
  })

  it('falls back to the clipboard when the sheet FAILS, which a cancel is not', async () => {
    // A failed hand-off with nothing on the clipboard leaves the user with
    // neither, so this one does fall through.
    const writeText = vi.fn().mockResolvedValue(undefined)
    const service = makeLiveShareService({
      navigator: {
        share: () => Promise.reject(new Error('SecurityError')),
        writeText,
      },
    })

    expect(await service.share('hello')).toBe(ShareOutcome.copied)
    expect(writeText).toHaveBeenCalledWith('hello')
  })

  it('copies on a platform with no share sheet at all — desktop Firefox', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const service = makeLiveShareService({ navigator: { writeText } })

    expect(service.isSupported()).toBe(false)
    expect(await service.share('hello')).toBe(ShareOutcome.copied)
  })

  it('reports unavailable when neither capability exists — a non-secure origin', async () => {
    const service = makeLiveShareService({ navigator: {} })

    expect(await service.share('hello')).toBe(ShareOutcome.unavailable)
  })

  it('reports unavailable when the clipboard itself refuses', async () => {
    const service = makeLiveShareService({
      navigator: { writeText: () => Promise.reject(new Error('denied')) },
    })

    expect(await service.share('hello')).toBe(ShareOutcome.unavailable)
  })

  it('never throws, whatever the platform does', async () => {
    const hostile: ShareNavigatorLike = {
      share: () => Promise.reject(new Error('boom')),
      writeText: () => Promise.reject(new Error('boom')),
    }
    const service = makeLiveShareService({ navigator: hostile })

    await expect(service.share('hello')).resolves.toBe(ShareOutcome.unavailable)
  })
})

describe('the stub', () => {
  it('shares by default, and records what it was given', async () => {
    const service = makeStubbedShareService()

    expect(await service.share('one')).toBe(ShareOutcome.shared)
    expect(await service.share('two')).toBe(ShareOutcome.shared)
    expect(service.sharedTexts()).toEqual(['one', 'two'])
  })

  it('drives the clipboard fallback with no sheet', async () => {
    const service = makeStubbedShareService({ canShare: false })

    expect(await service.share('one')).toBe(ShareOutcome.copied)
    expect(service.copiedTexts()).toEqual(['one'])
  })

  it('drives the cancel path with a rejecting sheet', async () => {
    const service = makeStubbedShareService({
      shareRejectsWith: abortError(),
    })

    expect(await service.share('one')).toBe(ShareOutcome.dismissed)
    expect(service.sharedTexts()).toEqual([])
  })

  it('drives the unavailable path with neither capability', async () => {
    const service = makeStubbedShareService({
      canShare: false,
      canWriteText: false,
    })

    expect(await service.share('one')).toBe(ShareOutcome.unavailable)
  })
})
