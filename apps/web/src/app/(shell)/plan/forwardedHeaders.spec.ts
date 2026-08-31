import { describe, expect, it } from 'vitest'
import { firstForwardedValue } from './forwardedHeaders'

/**
 * The multi-proxy case is the one worth pinning: it is invisible on a laptop
 * and on a single-hop deploy, and only shows up behind a load balancer in
 * front of a CDN — where the wrong answer silently changes the cookie scheme.
 */
describe('firstForwardedValue', () => {
  it('reads the client-facing hop from a two-proxy chain', () => {
    expect(firstForwardedValue('https,http')).toBe('https')
    expect(firstForwardedValue('a.example, b.internal')).toBe('a.example')
  })

  it('passes a single value through, trimming the whitespace a proxy adds', () => {
    expect(firstForwardedValue('https')).toBe('https')
    expect(firstForwardedValue('  app.example  ')).toBe('app.example')
  })

  it('treats an absent header as absent, so the caller falls back', () => {
    expect(firstForwardedValue(null)).toBeNull()
  })

  it('treats an empty or leading-empty header as absent, never as "://host"', () => {
    expect(firstForwardedValue('')).toBeNull()
    expect(firstForwardedValue('   ')).toBeNull()
    expect(firstForwardedValue(' , b.internal')).toBeNull()
  })
})
