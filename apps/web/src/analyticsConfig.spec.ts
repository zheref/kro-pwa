import { describe, expect, it } from 'vitest'
import { UMAMI_CLOUD_SCRIPT, umamiConfig } from './analyticsConfig'

describe('umamiConfig — analytics off', () => {
  it('is off when no website id is configured (a local build)', () => {
    expect(umamiConfig({})).toBeNull()
  })

  it('is off when the website id is blank (an empty deployment variable)', () => {
    expect(umamiConfig({ NEXT_PUBLIC_UMAMI_WEBSITE_ID: '   ' })).toBeNull()
  })

  it('is off when the script override is plain http — never a downgrade', () => {
    expect(
      umamiConfig({
        NEXT_PUBLIC_UMAMI_WEBSITE_ID: 'site-123',
        NEXT_PUBLIC_UMAMI_SCRIPT_URL: 'http://stats.example.com/u.js',
      }),
    ).toBeNull()
  })

  it('is off when the script override does not parse — not a silent cloud fallback', () => {
    expect(
      umamiConfig({
        NEXT_PUBLIC_UMAMI_WEBSITE_ID: 'site-123',
        NEXT_PUBLIC_UMAMI_SCRIPT_URL: 'stats.example.com/u.js',
      }),
    ).toBeNull()
  })

  it('is off when the override uses a script-capable scheme (javascript:)', () => {
    expect(
      umamiConfig({
        NEXT_PUBLIC_UMAMI_WEBSITE_ID: 'site-123',
        NEXT_PUBLIC_UMAMI_SCRIPT_URL: 'javascript:alert(1)',
      }),
    ).toBeNull()
  })
})

describe('umamiConfig — analytics on', () => {
  it('uses Umami Cloud when only the website id is set', () => {
    expect(umamiConfig({ NEXT_PUBLIC_UMAMI_WEBSITE_ID: 'site-123' })).toEqual({
      websiteId: 'site-123',
      scriptUrl: UMAMI_CLOUD_SCRIPT,
      origin: 'https://cloud.umami.is',
    })
  })

  it('treats a blank override as unset and uses Umami Cloud', () => {
    expect(
      umamiConfig({
        NEXT_PUBLIC_UMAMI_WEBSITE_ID: ' site-123 ',
        NEXT_PUBLIC_UMAMI_SCRIPT_URL: '',
      }),
    ).toEqual({
      websiteId: 'site-123',
      scriptUrl: UMAMI_CLOUD_SCRIPT,
      origin: 'https://cloud.umami.is',
    })
  })

  it('uses a self-hosted https instance and admits its origin, port included', () => {
    expect(
      umamiConfig({
        NEXT_PUBLIC_UMAMI_WEBSITE_ID: 'site-123',
        NEXT_PUBLIC_UMAMI_SCRIPT_URL: 'https://stats.example.com:8443/u.js',
      }),
    ).toEqual({
      websiteId: 'site-123',
      scriptUrl: 'https://stats.example.com:8443/u.js',
      origin: 'https://stats.example.com:8443',
    })
  })
})
