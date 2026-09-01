import { describe, expect, it } from 'vitest'
import { AuthExceptions } from '../AuthException'
import { AuthMapper, type UserRow } from '../AuthMapper'

const row = (overrides: Partial<UserRow> = {}): UserRow => ({
  id: 'user-1',
  username: 'ada',
  emails: ['ada@example.com'],
  name: 'Ada Lovelace',
  avatar_url: null,
  birth_date: null,
  nationality: null,
  login_kind: 'email_password',
  connected_services: ['email_password'],
  created_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

describe('AuthMapper.toDomain', () => {
  it('reads a complete row into a domain user', () => {
    const user = AuthMapper.toDomain(row())
    expect(user?.id).toBe('user-1')
    expect(user?.name).toBe('Ada Lovelace')
    expect(user?.emails).toEqual(['ada@example.com'])
    expect(user?.authProvider).toBe('email_password')
  })

  it('falls back to email_password for a null login_kind, exactly as canon does', () => {
    expect(AuthMapper.toDomain(row({ login_kind: null }))?.authProvider).toBe(
      'email_password',
    )
  })

  it('falls back to email_password for an unrecognised login_kind — canon falls back twice over', () => {
    expect(
      AuthMapper.toDomain(row({ login_kind: 'passkey' }))?.authProvider,
    ).toBe('email_password')
  })

  it('drops an unrecognised connected service rather than defaulting it', () => {
    const user = AuthMapper.toDomain(
      row({ connected_services: ['google', 'myspace'] }),
    )
    expect(user?.connectedProviders).toEqual(['google'])
  })

  it('reads a null emails column as an empty list, never as null', () => {
    expect(AuthMapper.toDomain(row({ emails: null }))?.emails).toEqual([])
  })

  it('KEEPS avatar_url — unlike the local cache mapper, which drops it to match canon', () => {
    const user = AuthMapper.toDomain(
      row({ avatar_url: 'https://avatars.example.com/ada.png' }),
    )
    expect(user?.avatarUrl).toBe('https://avatars.example.com/ada.png')
  })

  it('refuses a row with no id — there is no user to store', () => {
    expect(AuthMapper.toDomain(row({ id: '' }))).toBeNull()
  })

  it('refuses a row whose created_at cannot be parsed rather than storing an Invalid Date', () => {
    expect(AuthMapper.toDomain(row({ created_at: 'whenever' }))).toBeNull()
  })

  it('reads an unparseable birth_date as absent rather than as an Invalid Date', () => {
    expect(
      AuthMapper.toDomain(row({ birth_date: 'nope' }))?.birthDate,
    ).toBeNull()
  })
})

describe('AuthMapper.fromDomain', () => {
  const user = AuthMapper.toDomain(row())
  if (user === null) throw new Error('the fixture row must map')

  it('writes the fields that are set', () => {
    expect(AuthMapper.fromDomain(user)).toEqual({
      name: 'Ada Lovelace',
      username: 'ada',
    })
  })

  it('OMITS a null field, so an UPDATE never clobbers an existing column with NULL', () => {
    const payload = AuthMapper.fromDomain({
      ...user,
      name: null,
      username: null,
    })
    expect(Object.hasOwn(payload, 'name')).toBe(false)
    expect(Object.hasOwn(payload, 'username')).toBe(false)
  })

  it('serialises a birth date as ISO 8601', () => {
    const payload = AuthMapper.fromDomain({
      ...user,
      birthDate: new Date('1815-12-10T00:00:00.000Z'),
    })
    expect(payload.birth_date).toBe('1815-12-10T00:00:00.000Z')
  })

  it('uses the wire column names, not the domain field names', () => {
    const payload = AuthMapper.fromDomain({
      ...user,
      avatarUrl: 'https://avatars.example.com/ada.png',
    })
    expect(payload.avatar_url).toBe('https://avatars.example.com/ada.png')
    expect(Object.hasOwn(payload, 'avatarUrl')).toBe(false)
  })
})

describe('AuthMapper.toException', () => {
  it('passes one of ours through untouched — the Service already knew the answer', () => {
    const tagged = AuthExceptions.unavailable()
    expect(AuthMapper.toException(tagged)).toBe(tagged)
  })

  it("reads the browser's opaque TypeError as a network failure", () => {
    expect(AuthMapper.toException(new TypeError('Failed to fetch')).kind).toBe(
      'networkUnavailable',
    )
  })

  it('recognises a wrong password from the message GoTrue returns', () => {
    expect(
      AuthMapper.toException(new Error('Invalid login credentials')).kind,
    ).toBe('invalidCredentials')
  })

  it('recognises an already-registered email', () => {
    expect(
      AuthMapper.toException(new Error('User already registered')).kind,
    ).toBe('emailAlreadyInUse')
  })

  it('recognises a weak password and keeps the server text for logs', () => {
    const mapped = AuthMapper.toException(
      new Error('Password should be at least 6 characters'),
    )
    expect(mapped.kind).toBe('weakPassword')
    expect(mapped.message).toContain('6 characters')
  })

  it('recognises a connection failure from the message text', () => {
    expect(
      AuthMapper.toException(new Error('network request timed out')).kind,
    ).toBe('networkUnavailable')
  })

  it('matches case-insensitively, because GoTrue capitalises inconsistently', () => {
    expect(AuthMapper.toException(new Error('INVALID LOGIN')).kind).toBe(
      'invalidCredentials',
    )
  })

  it('falls back to unknown for anything unrecognised, keeping the message', () => {
    const mapped = AuthMapper.toException(new Error('teapot'))
    expect(mapped.kind).toBe('unknown')
    expect(mapped.message).toBe('teapot')
  })

  it('stringifies a non-Error throw rather than losing it', () => {
    expect(AuthMapper.toException(42).message).toBe('42')
  })
})
