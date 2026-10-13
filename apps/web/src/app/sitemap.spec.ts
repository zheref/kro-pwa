import { afterEach, describe, expect, it, vi } from 'vitest'
import sitemap from './sitemap'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('sitemap', () => {
  it('lists only the landing, on the public origin', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://kroapp.com')

    const entries = sitemap()

    expect(entries).toHaveLength(1)
    expect(entries[0]?.url).toBe('https://kroapp.com/')
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
  })
})
