import { describe, expect, it } from 'vitest'
import { groupOwner, ownerIdentifier, userOwner } from '../Owner'

describe('Owner', () => {
  it('builds the user case with the canon key names', () => {
    expect(userOwner('user-ada')).toEqual({ type: 'user', userId: 'user-ada' })
  })

  it('builds the group case with the canon key names', () => {
    expect(groupOwner('group-42')).toEqual({ type: 'group', groupId: 'group-42' })
  })

  it('writes the discriminant under `type` for BOTH cases', () => {
    // Canon's Swift `encode(to:)` writes the group discriminant under
    // `.groupId` and never writes `type` at all, which its own decoder then
    // rejects. This port fixes that; the assertion pins the fix.
    expect(groupOwner('group-42').type).toBe('group')
  })
})

describe('ownerIdentifier', () => {
  it('reads a user id', () => {
    expect(ownerIdentifier(userOwner('user-ada'))).toBe('user-ada')
  })

  it('reads a group id', () => {
    expect(ownerIdentifier(groupOwner('group-42'))).toBe('group-42')
  })

  it('returns an empty id verbatim rather than substituting', () => {
    expect(ownerIdentifier(userOwner(''))).toBe('')
  })
})
