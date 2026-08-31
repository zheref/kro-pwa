/**
 * `User` — canon `KroCore/Model/User.swift`.
 *
 * The Kro domain user, with the two derivations canon puts on it:
 * `primaryEmail` (first address, empty string when there is none) and
 * `initials` (up to two words of the display name, or of the primary email
 * when unnamed).
 *
 * `systemImage` on `AuthProvider` is an SF Symbol name and is ported as an
 * `IconRepresentation` for the same reason `Host` is — see
 * `IconRepresentation`.
 */
import { assertNever } from '../../library/assertNever'
import { type IconRepresentation, glyphIcon } from './IconRepresentation'

export const AuthProvider = {
  emailPassword: 'email_password',
  google: 'google',
  apple: 'apple',
  facebook: 'facebook',
} as const

export type AuthProvider = (typeof AuthProvider)[keyof typeof AuthProvider]

/** `AuthProvider.allCases`, in canon declaration order. */
export const authProviders: readonly AuthProvider[] = [
  AuthProvider.emailPassword,
  AuthProvider.google,
  AuthProvider.apple,
  AuthProvider.facebook,
]

/** `AuthProvider.displayName`. */
export const authProviderDisplayName = (provider: AuthProvider): string => {
  switch (provider) {
    case AuthProvider.emailPassword:
      return 'Email & Password'
    case AuthProvider.google:
      return 'Google'
    case AuthProvider.apple:
      return 'Apple'
    case AuthProvider.facebook:
      return 'Facebook'
    default:
      return assertNever(provider)
  }
}

/** `AuthProvider.systemImage`. */
export const authProviderIcon = (
  provider: AuthProvider,
): IconRepresentation => {
  switch (provider) {
    case AuthProvider.emailPassword:
      return glyphIcon('envelope.fill')
    case AuthProvider.google:
      return glyphIcon('network')
    case AuthProvider.apple:
      return glyphIcon('apple.logo')
    case AuthProvider.facebook:
      return glyphIcon('f.circle.fill')
    default:
      return assertNever(provider)
  }
}

export interface User {
  readonly id: string
  readonly name: string | null
  readonly emails: readonly string[]
  readonly username: string | null
  readonly avatarUrl: string | null
  readonly birthDate: Date | null
  readonly nationality: string | null
  readonly createdAt: Date
  readonly authProvider: AuthProvider
  readonly connectedProviders: readonly AuthProvider[]
}

/** `User.primaryEmail` — the first address, or `''` when there is none. */
export const primaryEmail = (user: User): string => user.emails[0] ?? ''

/**
 * `User.initials` — the first letter of each of the first two whitespace-
 * separated words of the display name, uppercased; falls back to the primary
 * email when the user has no name. Empty when neither yields a letter.
 */
export const userInitials = (user: User): string => {
  const source = user.name ?? primaryEmail(user)
  return source
    .split(' ')
    .filter((word) => word.length > 0)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
}
