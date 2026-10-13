import { describe, expect, it } from 'vitest'
import {
  APP_PATHS,
  isAppPath,
  isBypassed,
  normalizeHost,
  resolveHostRouting,
  siteUrl,
  hubUrl,
} from './hostRouting'

const production = { siteHost: 'kroapp.com', hubHost: 'hub.kroapp.com' }
const route = (
  host: string | null,
  pathname: string,
  search = '',
  hosts: { siteHost?: string; hubHost?: string } = production,
) =>
  resolveHostRouting({
    host,
    pathname,
    search,
    siteHost: hosts.siteHost,
    hubHost: hosts.hubHost,
  })

describe('host routing — the apex', () => {
  it('serves the landing at / untouched — the marketing page is the front door', () => {
    expect(route('kroapp.com', '/')).toEqual({ kind: 'next' })
  })

  it('sends /hub/plan to the same destination on the hub host', () => {
    expect(route('kroapp.com', '/hub/plan')).toEqual({
      kind: 'redirect',
      url: 'https://hub.kroapp.com/plan',
    })
  })

  it('sends a bare /hub to the hub root, keeping the query', () => {
    expect(route('kroapp.com', '/hub', '?code=abc')).toEqual({
      kind: 'redirect',
      url: 'https://hub.kroapp.com/?code=abc',
    })
  })

  it('moves an old app bookmark (/my-day) to the hub with its query', () => {
    expect(route('kroapp.com', '/my-day', '?code=abc&state=s')).toEqual({
      kind: 'redirect',
      url: 'https://hub.kroapp.com/my-day?code=abc&state=s',
    })
  })

  it('moves the Google Calendar return (/integrations?google=connected) to the hub intact', () => {
    expect(route('kroapp.com', '/integrations', '?google=connected')).toEqual({
      kind: 'redirect',
      url: 'https://hub.kroapp.com/integrations?google=connected',
    })
  })

  it('moves nested app paths (/lists/abc) and retired ones (/settings)', () => {
    expect(route('kroapp.com', '/lists/abc')).toEqual({
      kind: 'redirect',
      url: 'https://hub.kroapp.com/lists/abc',
    })
    expect(route('kroapp.com', '/settings')).toEqual({
      kind: 'redirect',
      url: 'https://hub.kroapp.com/settings',
    })
  })

  it('matches the host case-insensitively and ignores a port', () => {
    expect(route('KroApp.com:443', '/plan')).toEqual({
      kind: 'redirect',
      url: 'https://hub.kroapp.com/plan',
    })
  })

  it('does not mistake a look-alike path (/hubble, /planner) for an app path', () => {
    expect(route('kroapp.com', '/hubble')).toEqual({ kind: 'next' })
    expect(route('kroapp.com', '/planner')).toEqual({ kind: 'next' })
  })
})

describe('host routing — the hub', () => {
  it('rewrites / to My Day — the URL stays /, the app answers', () => {
    expect(route('hub.kroapp.com', '/')).toEqual({
      kind: 'rewrite',
      url: '/my-day',
      headers: { 'X-Robots-Tag': 'noindex, nofollow' },
    })
  })

  it('keeps the Supabase ?code= return on the rewrite, so the PKCE exchange still runs', () => {
    expect(route('hub.kroapp.com', '/', '?code=abc-123')).toEqual({
      kind: 'rewrite',
      url: '/my-day?code=abc-123',
      headers: { 'X-Robots-Tag': 'noindex, nofollow' },
    })
  })

  it('serves app paths directly and marks them noindex', () => {
    expect(route('hub.kroapp.com', '/plan')).toEqual({
      kind: 'next',
      headers: { 'X-Robots-Tag': 'noindex, nofollow' },
    })
  })

  it('folds a doubled /hub/plan back to /plan on the hub', () => {
    expect(route('hub.kroapp.com', '/hub/plan', '?x=1')).toEqual({
      kind: 'redirect',
      url: '/plan?x=1',
    })
  })
})

describe('host routing — any other host', () => {
  it('leaves / alone on localhost — the landing, no bounce to production', () => {
    expect(route('localhost:3000', '/')).toEqual({ kind: 'next' })
  })

  it('serves app paths directly on a preview host', () => {
    expect(route('kro-git-x.vercel.app', '/plan', '?code=abc')).toEqual({
      kind: 'next',
    })
  })

  it('strips /hub on the same host, query preserved', () => {
    expect(route('127.0.0.1:3111', '/hub/plan', '?code=abc')).toEqual({
      kind: 'redirect',
      url: '/plan?code=abc',
    })
    expect(route('localhost', '/hub')).toEqual({ kind: 'redirect', url: '/' })
  })

  it('treats every host as "other" while the hosts are unset — the safe preview default', () => {
    expect(route('kroapp.com', '/plan', '', {})).toEqual({ kind: 'next' })
    expect(route('hub.kroapp.com', '/', '', {})).toEqual({ kind: 'next' })
    expect(route(null, '/hub/plan', '', { siteHost: 'kroapp.com' })).toEqual({
      kind: 'redirect',
      url: '/plan',
    })
  })
})

describe('host routing — paths it never touches', () => {
  it.each([
    '/api/google/callback',
    '/_next/static/chunk.js',
    '/icons/Kro192.png',
    '/sounds/done.mp3',
    '/landing/hero.webp',
    '/sw.js',
    '/favicon.ico',
    '/manifest.webmanifest',
    '/robots.txt',
    '/sitemap.xml',
    '/llms.txt',
    '/opengraph-image-1a2b3c',
  ])('passes %s through on the apex, unrouted', (pathname) => {
    expect(isBypassed(pathname)).toBe(true)
    expect(route('kroapp.com', pathname)).toEqual({ kind: 'next' })
  })

  it('does not bypass a look-alike (/apiary, /iconsets)', () => {
    expect(isBypassed('/apiary')).toBe(false)
    expect(isBypassed('/iconsets')).toBe(false)
  })
})

describe('host routing — helpers', () => {
  it('knows every app destination as an app path', () => {
    for (const path of APP_PATHS) expect(isAppPath(path)).toBe(true)
    expect(isAppPath('/')).toBe(false)
  })

  it('normalises a missing host to empty', () => {
    expect(normalizeHost(undefined)).toBe('')
    expect(normalizeHost(' Hub.KroApp.com:8080 ')).toBe('hub.kroapp.com')
  })

  it('derives the site URL without a trailing slash, defaulting to the dev server', () => {
    expect(siteUrl('https://kroapp.com/')).toBe('https://kroapp.com')
    expect(siteUrl('')).toBe('http://localhost:3000')
    expect(siteUrl(undefined)).toBe('http://localhost:3000')
  })
})

describe('hubUrl', () => {
  it('points a landing link at the hub host when one is configured', () => {
    expect(hubUrl('hub.kroapp.com')).toBe('https://hub.kroapp.com/my-day')
  })

  it('falls back to the same-host My Day path on localhost and previews', () => {
    expect(hubUrl('')).toBe('/my-day')
    expect(hubUrl(undefined)).toBe('/my-day')
  })

  it('normalises the host it is given — scheme, port and case never leak into the link', () => {
    expect(hubUrl('HUB.kroapp.com')).toBe('https://hub.kroapp.com/my-day')
  })
})
