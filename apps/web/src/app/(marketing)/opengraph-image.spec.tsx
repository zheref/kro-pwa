import { describe, expect, it, vi } from 'vitest'

/**
 * Smoke only. `next/og` renders through Satori + resvg, which jsdom cannot
 * run, so the renderer is replaced with a recorder and what is asserted is
 * the card's contract: a 1200×630 PNG with the wordmark and the tagline.
 */
const calls: { element: unknown; options: unknown }[] = []
vi.mock('next/og', () => ({
  ImageResponse: class extends Response {
    constructor(element: unknown, options: unknown) {
      super('png')
      calls.push({ element, options })
    }
  },
}))

describe('the landing social card', () => {
  it('declares a 1200×630 PNG with alt text', async () => {
    const { alt, contentType, size } = await import('./opengraph-image')

    expect(size).toEqual({ width: 1200, height: 630 })
    expect(contentType).toBe('image/png')
    expect(alt).toContain('Control your time')
  })

  it('returns an image response rendered at the declared size', async () => {
    const { default: OpengraphImage, size } = await import('./opengraph-image')

    const response = OpengraphImage()

    expect(response).toBeInstanceOf(Response)
    expect(calls.at(-1)?.options).toEqual(size)
  })

  it('carries the wordmark and the tagline on the indigo→grape gradient', async () => {
    const { default: OpengraphImage } = await import('./opengraph-image')

    OpengraphImage()

    const serialized = JSON.stringify(calls.at(-1)?.element)
    expect(serialized).toContain('Kro')
    expect(serialized).toContain(
      'Control your time, do not let time control you.',
    )
    expect(serialized).toContain('#5856d6')
    expect(serialized).toContain('#663399')
  })
})
