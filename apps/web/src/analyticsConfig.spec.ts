import { describe, expect, it } from 'vitest'
import {
  UMAMI_CLOUD_COLLECT_ORIGIN,
  UMAMI_CLOUD_SCRIPT,
  umamiConfig,
} from './analyticsConfig'

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
      collectOrigin: 'https://gateway.umami.is',
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
      collectOrigin: 'https://gateway.umami.is',
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
      collectOrigin: 'https://stats.example.com:8443',
    })
  })
})

describe('umamiConfig — where events are sent', () => {
  it('sends Umami Cloud events to the gateway, not the script host', () => {
    const config = umamiConfig({ NEXT_PUBLIC_UMAMI_WEBSITE_ID: 'site-123' })
    expect(config?.collectOrigin).toBe(UMAMI_CLOUD_COLLECT_ORIGIN)
    expect(config?.collectOrigin).not.toBe(config?.origin)
  })

  it('sends a self-hosted instance its events on the script origin', () => {
    const config = umamiConfig({
      NEXT_PUBLIC_UMAMI_WEBSITE_ID: 'site-123',
      NEXT_PUBLIC_UMAMI_SCRIPT_URL: 'https://stats.example.com/u.js',
    })
    expect(config?.collectOrigin).toBe('https://stats.example.com')
  })

  it('treats an override naming the cloud script exactly as Umami Cloud', () => {
    const config = umamiConfig({
      NEXT_PUBLIC_UMAMI_WEBSITE_ID: 'site-123',
      NEXT_PUBLIC_UMAMI_SCRIPT_URL: UMAMI_CLOUD_SCRIPT,
    })
    expect(config?.collectOrigin).toBe(UMAMI_CLOUD_COLLECT_ORIGIN)
  })

  it('has no collect origin at all when analytics is off', () => {
    expect(umamiConfig({})?.collectOrigin ?? null).toBeNull()
  })
})
