/**
 * `EarlyAccessResponse` is the wire shape; these pin its snake_case fields
 * and the request body the Mapper produces for the other direction.
 */
import { describe, expect, it } from 'vitest'
import { earlyAccessRequestMocks } from '../__mocks__/EarlyAccessRequest.mocks'
import { EarlyAccessMapper } from '../EarlyAccessMapper'
import type {
  EarlyAccessRequestBody,
  EarlyAccessResponse,
} from '../EarlyAccessResponse'

const wire: EarlyAccessResponse = {
  id: 'ea-1',
  email: 'ada@example.com',
  platform: 'ios',
  position: null,
  joined_at: '2026-10-12T12:00:00.000Z',
}

describe('EarlyAccessResponse', () => {
  it('mirrors the wire’s snake_case timestamp', () => {
    expect(wire).toHaveProperty('joined_at')
    expect(wire).not.toHaveProperty('joinedAt')
  })

  it('keeps the platform an untrusted string until the Mapper narrows it', () => {
    const untrusted: EarlyAccessResponse = { ...wire, platform: 'linux' }
    expect(EarlyAccessMapper.toDomain(untrusted)).toBeNull()
  })

  it('pairs with a request body holding exactly the four posted fields', () => {
    const body: EarlyAccessRequestBody = EarlyAccessMapper.fromDomain(
      earlyAccessRequestMocks.typical,
    )
    expect(Object.keys(body).sort()).toEqual([
      'email',
      'locale',
      'platform',
      'source',
    ])
  })
})
