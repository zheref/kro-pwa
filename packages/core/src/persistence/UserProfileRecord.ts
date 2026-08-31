/**
 * `UserProfileRecord` — canon `Kro/Dependencies/LocalStore/
 * UserProfileRecord.swift`, including its `toUser()` / `from(_:)` pair.
 *
 * The signed-in user's profile, cached locally. Three things about it differ
 * from every other row here and all three are canon's:
 *
 * 1. **One watermark, not three.** `updatedAtEpochMillis` only — no
 *    `lastSyncedAtEpochMillis`, no tombstone. The profile is not synced by
 *    watermark: it is *replaced* wholesale on sign-in from the account, so
 *    there is nothing to reconcile and nothing to tombstone. `isDirty` is
 *    therefore not defined for it, which is why the row implements neither
 *    `SyncWatermarks` nor `SoftDeletable`.
 * 2. **`loginKind` defaults to `email_password`** on read, twice over: canon
 *    writes `AuthProvider(rawValue: loginKind ?? "email_password") ?? .emailPassword`.
 *    A null column *and* an unrecognised value both land on the same case.
 * 3. **`avatarUrl` is stored but dropped on read.** Canon's `toUser()` builds a
 *    `User` without passing `avatarUrl`, so it decodes to `nil` even though the
 *    column holds it. Unlike the `owner` case in `EndeavorRecord` — where the
 *    columns exist and the mapper simply forgets them — this port keeps canon's
 *    behaviour **and** exposes the raw column, because `User.avatarUrl` is
 *    `null`-meaningful in the domain and quietly filling it here would make the
 *    web show an avatar the phone does not. `userFromRecord` takes an explicit
 *    `includeAvatarUrl` opt-in so the choice is visible at the call site rather
 *    than baked in; #31 flips it when the two platforms agree.
 */
import type { AuthProvider, User } from '../domain/shared/User'
import { AuthProvider as Provider, authProviders } from '../domain/shared/User'
import type { EpochMillis } from './EpochMillis'
import { epochMillisFromDate } from './EpochMillis'
import {
  decodeConnectedProvidersCsv,
  decodeEmailsCsv,
  encodeConnectedProvidersCsv,
  encodeEmailsCsv,
} from './RecordEncodings'

export interface UserProfileRecord {
  /** Unique. Canon: `@Attribute(.unique) var id: String`. */
  readonly id: string
  readonly name: string | null
  readonly username: string | null
  /** Comma-separated email addresses. */
  readonly emailsCsv: string
  readonly birthDate: Date | null
  readonly nationality: string | null
  /** `User.AuthProvider.rawValue`. */
  readonly loginKind: string | null
  /** Comma-separated `User.AuthProvider.rawValue`s. */
  readonly connectedServicesCsv: string | null
  readonly avatarUrl: string | null
  readonly createdAt: Date
  readonly updatedAtEpochMillis: EpochMillis
}

/** `UserProfileRecord.from(_:)`. */
export const userProfileRecordFromUser = (
  user: User,
  options: { readonly now: Date },
): UserProfileRecord => ({
  id: user.id,
  name: user.name,
  username: user.username,
  emailsCsv: encodeEmailsCsv(user.emails),
  birthDate: user.birthDate,
  nationality: user.nationality,
  loginKind: user.authProvider,
  connectedServicesCsv: encodeConnectedProvidersCsv(user.connectedProviders),
  avatarUrl: user.avatarUrl,
  createdAt: user.createdAt,
  updatedAtEpochMillis: epochMillisFromDate(options.now),
})

/** `AuthProvider(rawValue: loginKind ?? "email_password") ?? .emailPassword`. */
export const authProviderFromLoginKind = (
  loginKind: string | null,
): AuthProvider => {
  if (loginKind === null) return Provider.emailPassword
  return (
    authProviders.find((provider) => provider === loginKind) ??
    Provider.emailPassword
  )
}

/**
 * `record.toUser()`.
 *
 * `includeAvatarUrl` defaults to `false`, which is canon's behaviour — see
 * point 3 in the file header for why the divergence is opt-in rather than
 * silently corrected.
 */
export const userFromRecord = (
  record: UserProfileRecord,
  options: { readonly includeAvatarUrl?: boolean } = {},
): User => ({
  id: record.id,
  name: record.name,
  emails: decodeEmailsCsv(record.emailsCsv),
  username: record.username,
  avatarUrl: options.includeAvatarUrl === true ? record.avatarUrl : null,
  birthDate: record.birthDate,
  nationality: record.nationality,
  createdAt: record.createdAt,
  authProvider: authProviderFromLoginKind(record.loginKind),
  connectedProviders: decodeConnectedProvidersCsv(record.connectedServicesCsv),
})
