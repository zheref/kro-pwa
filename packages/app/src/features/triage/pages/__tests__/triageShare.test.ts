/**
 * The Delegate quadrant's Share hand-off, including the fallback KC-IS-#26
 * names explicitly: *"Web Share API … falling back to clipboard"*.
 *
 * Every case injects a `TriageShareGateway` double rather than stubbing a
 * global, which is the same substitution `stubbed…Service` gives a Producer —
 * and the reason the module takes one at all.
 */
import { describe, expect, it, vi } from 'vitest'
import {
  TriageShareOutcome,
  browserTriageShareGateway,
  performTriageShare,
  triageShareNotice,
} from '../triageShare'

const BLURB = 'I\'d like you to help with "Draft Q3 product plan". (Shared from Kro.)'

describe('the system share sheet', () => {
  it('hands the blurb to the share sheet when the browser has one', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const writeText = vi.fn()

    const outcome = await performTriageShare(BLURB, { share, writeText })

    expect(outcome).toBe(TriageShareOutcome.shared)
    expect(share).toHaveBeenCalledWith({ text: BLURB })
    // Canon's Share does one thing; a silent second copy is not it.
    expect(writeText).not.toHaveBeenCalled()
  })

  it('treats the user closing the sheet as a dismissal, not a failure', async () => {
    const share = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('cancelled'), { name: 'AbortError' }))
    const writeText = vi.fn()

    const outcome = await performTriageShare(BLURB, { share, writeText })

    expect(outcome).toBe(TriageShareOutcome.dismissed)
    // A cancel is the user saying no; copying anyway would be a second action.
    expect(writeText).not.toHaveBeenCalled()
  })
})

describe('the clipboard fallback', () => {
  it('copies the blurb on a browser with no share sheet (desktop Firefox)', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)

    const outcome = await performTriageShare(BLURB, { writeText })

    expect(outcome).toBe(TriageShareOutcome.copied)
    expect(writeText).toHaveBeenCalledWith(BLURB)
  })

  it('copies when the share sheet FAILS, so the hand-off is not simply lost', async () => {
    const share = vi.fn().mockRejectedValue(new Error('NotAllowedError'))
    const writeText = vi.fn().mockResolvedValue(undefined)

    const outcome = await performTriageShare(BLURB, { share, writeText })

    expect(outcome).toBe(TriageShareOutcome.copied)
    expect(writeText).toHaveBeenCalledWith(BLURB)
  })

  it('reports unavailable when the clipboard is refused too (insecure origin)', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('NotAllowedError'))

    const outcome = await performTriageShare(BLURB, { writeText })

    expect(outcome).toBe(TriageShareOutcome.unavailable)
  })

  it('reports unavailable when the browser offers neither capability', async () => {
    expect(await performTriageShare(BLURB, {})).toBe(
      TriageShareOutcome.unavailable,
    )
  })
})

describe('what the user is told afterwards', () => {
  it('says nothing when the share sheet did its job', () => {
    expect(triageShareNotice(TriageShareOutcome.shared)).toBeNull()
    expect(triageShareNotice(TriageShareOutcome.dismissed)).toBeNull()
  })

  it('explains the clipboard fallback rather than letting it happen silently', () => {
    expect(triageShareNotice(TriageShareOutcome.copied)).toContain('clipboard')
  })

  it('says the hand-off did not happen when nothing could carry it', () => {
    expect(triageShareNotice(TriageShareOutcome.unavailable)).toContain(
      'could not be copied',
    )
  })
})

describe('the live gateway', () => {
  it('offers neither capability on a navigator that has neither (jsdom)', () => {
    const gateway = browserTriageShareGateway()
    expect(gateway.share).toBeUndefined()
    expect(typeof gateway.writeText === 'function' || gateway.writeText === undefined).toBe(
      true,
    )
  })

  it('binds share to navigator, so the call cannot throw "Illegal invocation"', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      writable: true,
      value: share,
    })
    try {
      const gateway = browserTriageShareGateway()
      expect(gateway.share).toBeDefined()
      await gateway.share?.({ text: BLURB })
      expect(share).toHaveBeenCalledWith({ text: BLURB })
    } finally {
      Reflect.deleteProperty(navigator, 'share')
    }
  })
})
