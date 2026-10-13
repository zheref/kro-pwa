import { describe, expect, it } from 'vitest'
import { contactEmail } from './contactConfig'

describe('contactEmail', () => {
  it('is null when the deployment sets no address', () => {
    expect(contactEmail({})).toBeNull()
  })

  it('is null for a blank value — an empty variable is not an address', () => {
    expect(contactEmail({ NEXT_PUBLIC_CONTACT_EMAIL: '   ' })).toBeNull()
  })

  it('is null for garbage — no at sign, no dot after it, or inner whitespace', () => {
    for (const bad of ['nope', 'a@b', 'a b@c.d', 'a@@b.c', '@b.c']) {
      expect(contactEmail({ NEXT_PUBLIC_CONTACT_EMAIL: bad })).toBeNull()
    }
  })

  it('returns a valid address trimmed', () => {
    expect(
      contactEmail({ NEXT_PUBLIC_CONTACT_EMAIL: ' hello@kroapp.com ' }),
    ).toBe('hello@kroapp.com')
  })
})
