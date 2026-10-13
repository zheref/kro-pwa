import { afterEach, describe, expect, it, vi } from 'vitest'
import sitemap from './sitemap'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('sitemap', () => {
  it('lists only the marketing pages — the landing, then pricing — on the public origin', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://kroapp.com')

    const entries = sitemap()

    expect(entries.map((entry) => entry.url)).toEqual([
      'https://kroapp.com/',
      'https://kroapp.com/pricing',
    ])
  })

  it('marks pricing monthly, below the landing, with a modification date', () => {
    const pricing = sitemap()[1]

    expect(pricing?.changeFrequency).toBe('monthly')
    expect(pricing?.priority).toBeLessThan(1)
    expect(pricing?.lastModified).toBeInstanceOf(Date)
  })

  it('marks the landing weekly, top priority, with a modification date', () => {
    const [landing] = sitemap()

    expect(landing?.changeFrequency).toBe('weekly')
    expect(landing?.priority).toBe(1)
    expect(landing?.lastModified).toBeInstanceOf(Date)
  })

  it('falls back to the dev server without a configured site URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')

    expect(sitemap()[0]?.url).toBe('http://localhost:3000/')
    expect(sitemap()[1]?.url).toBe('http://localhost:3000/pricing')
  })
})
