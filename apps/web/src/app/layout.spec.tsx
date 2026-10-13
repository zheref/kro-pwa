import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * The root layout is passive; what it owns is the document metadata — the
 * landing's SEO baseline. Fonts and the stylesheet are build-time concerns
 * stubbed out here.
 */
vi.mock('./globals.css', () => ({}))
vi.mock('next/font/local', () => ({
  default: () => ({ variable: 'font-local' }),
}))
vi.mock('next/font/google', () => ({
  Geist_Mono: () => ({ variable: 'font-mono' }),
}))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('the root layout metadata', () => {
  it('titles every page as Kro, with the tagline as the default', async () => {
    const { metadata } = await import('./layout')

    expect(metadata.title).toEqual({
      default: 'Kro — Control your time',
      template: '%s · Kro',
    })
    expect(metadata.applicationName).toBe('Kro')
    expect(metadata.description).toContain('Plan, Do and Earn')
  })

  it('resolves social URLs against the public apex', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://kroapp.com')
    const { metadata } = await import('./layout')

    expect(metadata.metadataBase?.toString()).toBe('https://kroapp.com/')
  })

  it('falls back to the dev server origin without a site URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    const { metadata } = await import('./layout')

    expect(metadata.metadataBase?.toString()).toBe('http://localhost:3000/')
  })

  it('shares as a large-image card and stays indexable by default', async () => {
    const { metadata } = await import('./layout')

    expect(metadata.openGraph).toMatchObject({
      siteName: 'Kro',
      type: 'website',
      locale: 'en_US',
    })
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' })
    expect(metadata.robots).toEqual({ index: true, follow: true })
  })
})
