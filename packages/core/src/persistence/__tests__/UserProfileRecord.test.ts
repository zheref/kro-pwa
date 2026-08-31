import { describe, expect, it } from 'vitest'
import { MOCK_NOW } from '../../domain/endeavor/__mocks__/Endeavor.mocks'
import { userMocks } from '../../domain/shared/__mocks__/User.mocks'
import { AuthProvider } from '../../domain/shared/User'
import { epochMillisFromDate } from '../EpochMillis'
import {
  authProviderFromLoginKind,
  userFromRecord,
  userProfileRecordFromUser,
} from '../UserProfileRecord'

const allUserMocks = Object.values(userMocks)

describe('user-profile round-trip — every #7 fixture', () => {
  it.each(allUserMocks.map((mock) => [mock.id, mock] as const))(
    'restores %s field for field, avatar aside',
    (_id, user) => {
      const record = userProfileRecordFromUser(user, { now: MOCK_NOW })
      expect(userFromRecord(record)).toEqual({ ...user, avatarUrl: null })
    },
  )

  it('is fully lossless once the avatar column is opted in', () => {
    const record = userProfileRecordFromUser(userMocks.complete, {
      now: MOCK_NOW,
    })
    expect(userFromRecord(record, { includeAvatarUrl: true })).toEqual(
      userMocks.complete,
    )
  })

  it('DROPS the avatar by default, matching canon`s toUser()', () => {
    const record = userProfileRecordFromUser(userMocks.complete, {
      now: MOCK_NOW,
    })
    expect(record.avatarUrl).not.toBeNull()
    expect(userFromRecord(record).avatarUrl).toBeNull()
  })

  it('round-trips a multi-address profile through emailsCsv', () => {
    const record = userProfileRecordFromUser(userMocks.complete, {
      now: MOCK_NOW,
    })
    expect(userFromRecord(record).emails).toEqual(userMocks.complete.emails)
  })

  it('round-trips connected providers through the optional CSV column', () => {
    const record = userProfileRecordFromUser(userMocks.complete, {
      now: MOCK_NOW,
    })
    expect(userFromRecord(record).connectedProviders).toEqual(
      userMocks.complete.connectedProviders,
    )
  })

  it('stamps the watermark from the `now` it was given', () => {
    expect(
      userProfileRecordFromUser(userMocks.complete, { now: MOCK_NOW })
        .updatedAtEpochMillis,
    ).toBe(epochMillisFromDate(MOCK_NOW))
  })
})

describe('authProviderFromLoginKind — canon defaults twice over', () => {
  it('reads a stored provider back', () => {
    expect(authProviderFromLoginKind('google')).toBe(AuthProvider.google)
  })

  it('defaults a NULL column to email_password', () => {
    expect(authProviderFromLoginKind(null)).toBe(AuthProvider.emailPassword)
  })

  it('defaults an UNRECOGNISED value to email_password, not to a throw', () => {
    expect(authProviderFromLoginKind('carrier-pigeon')).toBe(
      AuthProvider.emailPassword,
    )
  })

  it('reads every declared provider back exactly', () => {
    for (const provider of Object.values(AuthProvider)) {
      expect(authProviderFromLoginKind(provider)).toBe(provider)
    }
  })
})

describe('a legacy row with neither loginKind nor connected services', () => {
  const legacy = {
    ...userProfileRecordFromUser(userMocks.complete, { now: MOCK_NOW }),
    loginKind: null,
    connectedServicesCsv: null,
  }

  it('still hydrates, rather than failing the profile', () => {
    expect(userFromRecord(legacy).id).toBe(userMocks.complete.id)
  })

  it('lands on email_password', () => {
    expect(userFromRecord(legacy).authProvider).toBe(AuthProvider.emailPassword)
  })

  it('lands on no connected providers, not on null', () => {
    expect(userFromRecord(legacy).connectedProviders).toEqual([])
  })
})
