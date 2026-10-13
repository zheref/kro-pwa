/**
 * `EarlyAccessRequest` is a type; these pin what the form hands the Producer.
 */
import { describe, expect, it } from 'vitest'
import { earlyAccessRequestMocks } from '../__mocks__/EarlyAccessRequest.mocks'
import type { EarlyAccessRequest } from '../EarlyAccessRequest'

describe('EarlyAccessRequest', () => {
  it('carries the email and platform a visitor chose', () => {
    const request: EarlyAccessRequest = earlyAccessRequestMocks.typical
    expect(request).toMatchObject({ email: 'ada@example.com', platform: 'ios' })
  })

  it('keeps the optional context as null rather than absent', () => {
    const request: EarlyAccessRequest = earlyAccessRequestMocks.bare
    expect(request.source).toBeNull()
    expect(request.locale).toBeNull()
  })

  it('holds no identity beyond the email — no name, no id', () => {
    expect(Object.keys(earlyAccessRequestMocks.androidVote).sort()).toEqual([
      'email',
      'locale',
      'platform',
      'source',
    ])
  })
})
