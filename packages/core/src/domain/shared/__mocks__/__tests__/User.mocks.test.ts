import { describe, expect, it } from 'vitest'
import { allUserMocks, userMocks } from '../User.mocks'

describe('the User mock spread', () => {
  it('offers at least the seven RC-13 variants', () => {
    expect(allUserMocks.length).toBeGreaterThanOrEqual(7)
  })

  it('gives every fixture a distinct id', () => {
    const ids = allUserMocks.map((user) => user.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('covers all four auth providers', () => {
    expect(new Set(allUserMocks.map((user) => user.authProvider))).toEqual(
      new Set(['email_password', 'google', 'apple', 'facebook']),
    )
  })

  it('includes the awkward name cases the `initials` rule needs', () => {
    expect(userMocks.minimal.name).toBeNull()
    expect(userMocks.paddedMononym.name).toBe('   Prince   ')
    expect(userMocks.unicodeName.name?.split(' ')).toHaveLength(4)
  })

  it('includes a user with no email address at all', () => {
    expect(userMocks.noEmail.emails).toEqual([])
  })
})
