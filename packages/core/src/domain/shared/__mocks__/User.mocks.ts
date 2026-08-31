/**
 * `User` fixtures — `RC-13`: three convenient, one neutral, three
 * inconvenient. The inconvenient three exist mostly to pin `initials`, whose
 * "first letter of each of the first two words" rule has more edge cases than
 * it looks: no name, a one-word name, leading spaces, and a name whose first
 * character is outside the Latin alphabet.
 */
import { AuthProvider, type User } from '../User'

const at = (day: number, month = 0, year = 2026): Date =>
  new Date(year, month, day, 9, 0, 0)

export const userMocks = {
  /** Convenient: a full profile, two names, email-and-password sign-in. */
  complete: {
    id: 'user-ada',
    name: 'Ada Lovelace',
    emails: ['ada@kro.app', 'ada.lovelace@example.com'],
    username: 'ada',
    avatarUrl: 'https://cdn.example.com/avatars/ada.png',
    birthDate: new Date(1815, 11, 10, 0, 0, 0),
    nationality: 'GB',
    createdAt: at(4),
    authProvider: AuthProvider.emailPassword,
    connectedProviders: [AuthProvider.emailPassword, AuthProvider.google],
  },

  /** Convenient: signed in with Google, no second provider connected. */
  googleSignIn: {
    id: 'user-grace',
    name: 'Grace Hopper',
    emails: ['grace@kro.app'],
    username: 'grace',
    avatarUrl: 'https://cdn.example.com/avatars/grace.png',
    birthDate: new Date(1906, 11, 9, 0, 0, 0),
    nationality: 'US',
    createdAt: at(6),
    authProvider: AuthProvider.google,
    connectedProviders: [AuthProvider.google],
  },

  /** Convenient: Apple sign-in, private relay address, no avatar. */
  appleRelay: {
    id: 'user-alan',
    name: 'Alan Turing',
    emails: ['alan@privaterelay.appleid.com'],
    username: null,
    avatarUrl: null,
    birthDate: null,
    nationality: 'GB',
    createdAt: at(7),
    authProvider: AuthProvider.apple,
    connectedProviders: [AuthProvider.apple],
  },

  /** Neutral: the minimum a signed-in user can be — an id and one address. */
  minimal: {
    id: 'user-minimal',
    name: null,
    emails: ['someone@kro.app'],
    username: null,
    avatarUrl: null,
    birthDate: null,
    nationality: null,
    createdAt: at(8),
    authProvider: AuthProvider.emailPassword,
    connectedProviders: [],
  },

  /**
   * Inconvenient: **no email at all**, so `primaryEmail` is `''` and
   * `initials` has nothing to fall back to. Reachable through a provider that
   * withheld the address.
   */
  noEmail: {
    id: 'user-no-email',
    name: null,
    emails: [],
    username: 'ghost',
    avatarUrl: null,
    birthDate: null,
    nationality: null,
    createdAt: at(9),
    authProvider: AuthProvider.facebook,
    connectedProviders: [AuthProvider.facebook],
  },

  /**
   * Inconvenient: a single mononym padded with stray whitespace — canon's
   * `split(separator:)` drops the empty pieces, so this must yield one letter
   * and not three.
   */
  paddedMononym: {
    id: 'user-mononym',
    name: '   Prince   ',
    emails: ['prince@kro.app'],
    username: 'prince',
    avatarUrl: null,
    birthDate: null,
    nationality: null,
    createdAt: at(10),
    authProvider: AuthProvider.google,
    connectedProviders: [AuthProvider.google],
  },

  /**
   * Inconvenient: a long non-Latin name with four words, so only the first
   * two count, and `toUpperCase()` has nothing to change.
   */
  unicodeName: {
    id: 'user-unicode',
    name: '山田 太郎 の 記録',
    emails: ['yamada@kro.app'],
    username: '山田',
    avatarUrl: null,
    birthDate: new Date(1990, 4, 2, 0, 0, 0),
    nationality: 'JP',
    createdAt: at(11),
    authProvider: AuthProvider.apple,
    connectedProviders: [AuthProvider.apple, AuthProvider.google],
  },
} satisfies Record<string, User>

export const allUserMocks: readonly User[] = Object.values(userMocks)
