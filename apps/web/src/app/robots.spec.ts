import { afterEach, describe, expect, it, vi } from 'vitest'
import robots from './robots'

afterEach(() => {
  vi.unstubAllEnvs()
})

const rule = () => {
  const { rules } = robots()
  if (Array.isArray(rules)) throw new Error('expected a single rule')
  return rules
}

describe('robots', () => {
  it('lets crawlers read the landing', () => {
    expect(rule().allow).toBe('/')
    expect(rule().userAgent).toBe('*')
  })

  it('keeps crawlers out of the app, the API and the /hub bridge', () => {
    const disallow = rule().disallow
    expect(disallow).toEqual(
      expect.arrayContaining(['/my-day', '/plan', '/lists', '/api/', '/hub']),
    )
    expect(disallow).not.toContain('/')
  })

  it('points at the sitemap on the public origin', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://kroapp.com/')

    expect(robots().sitemap).toBe('https://kroapp.com/sitemap.xml')
  })
})
