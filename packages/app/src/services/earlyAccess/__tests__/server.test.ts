// @vitest-environment node
/**
 * `@kro/app/early-access` is what `apps/web`'s route imports: it must carry
 * the handler factory and every sink binding, and nothing a component needs.
 */
import { describe, expect, it } from 'vitest'
import * as server from '../server'

describe('the @kro/app/early-access barrel', () => {
  it('exports the handler factory the route binds', () => {
    expect(typeof server.makeEarlyAccessHandler).toBe('function')
  })

  it('exports the live, unavailable and stubbed sinks', () => {
    expect(typeof server.makeWebhookEarlyAccessSink).toBe('function')
    expect(typeof server.makeUnavailableEarlyAccessSink).toBe('function')
    expect(typeof server.makeStubbedEarlyAccessSink).toBe('function')
    expect(typeof server.stubbedEarlyAccessSink.add).toBe('function')
  })

  it('exports no browser Service — that one reaches a Producer through ThunkExtra', () => {
    expect(server).not.toHaveProperty('liveEarlyAccessService')
    expect(server).not.toHaveProperty('stubbedEarlyAccessService')
  })
})
