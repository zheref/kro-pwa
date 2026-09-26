import { describe, expect, it } from 'vitest'
import { EndeavorActivityExceptions } from '../EndeavorActivityException'
import {
  EndeavorActivityMocks,
  allActivityEndeavorMocks,
} from '../EndeavorActivityMocks'

describe('EndeavorActivityMocks', () => {
  it('carries at least seven domain variants (RC-13)', () => {
    expect(allActivityEndeavorMocks.length).toBeGreaterThanOrEqual(7)
  })
  it('carries loading, loaded and failed State variants', () => {
    expect(EndeavorActivityMocks.loading.load.kind).toBe('loading')
    expect(EndeavorActivityMocks.loadedMany.load.kind).toBe('loaded')
    expect(EndeavorActivityMocks.failed.load.kind).toBe('failed')
  })
  it('builds every exception kind with copy', () => {
    expect(EndeavorActivityExceptions.loadFailed('x').recoverable).toBe(true)
    expect(EndeavorActivityExceptions.endeavorNotFound('x').recoverable).toBe(
      false,
    )
    expect(EndeavorActivityExceptions.unknown('x').message).toBe('x')
  })
})
