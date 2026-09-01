/**
 * The auth feature's canned `State` variants (`RC-31`, `UZF-18`).
 *
 * Every test and every future story consumes these rather than building state
 * inline, so the two can never describe different worlds. Each variant is built
 * from `authSlice.getInitialState()` and a domain `User` mock, never from a
 * hand-written object literal.
 *
 * The users here are **fixtures, not accounts**: synthetic ids, `example.com`
 * addresses, no token, nothing that resembles a credential.
 */
import type { User } from '@kro/core'
import { AuthExceptions } from './AuthException'
import { authSlice } from './AuthFeature'
import { AuthFlow, AuthMode, type AuthState } from './AuthState'
import { EndeavorSyncExceptions } from './EndeavorSyncException'
import { LocalDataChoice } from './LocalDataDialog'
import { signOutIntents } from './SignOutIntents'

const base: AuthState = authSlice.getInitialState()

/** A signed-in account with a display name, an email and one provider. */
export const authUserMocks = {
  /** The happy path: named, one email, email/password provider. */
  typical: {
    id: 'user-typical',
    name: 'Ada Lovelace',
    emails: ['ada@example.com'],
    username: 'ada',
    avatarUrl: null,
    birthDate: null,
    nationality: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    authProvider: 'email_password',
    connectedProviders: ['email_password'],
  } satisfies User,

  /** Signed in through Apple; Apple never supplies an avatar. */
  apple: {
    id: 'user-apple',
    name: 'Grace Hopper',
    emails: ['grace@example.com'],
    username: null,
    avatarUrl: null,
    birthDate: null,
    nationality: null,
    createdAt: new Date('2026-02-01T00:00:00.000Z'),
    authProvider: 'apple',
    connectedProviders: ['apple'],
  } satisfies User,

  /** Signed in through Google, which does supply one, and has two providers. */
  google: {
    id: 'user-google',
    name: 'Katherine Johnson',
    emails: ['katherine@example.com', 'kj@example.com'],
    username: null,
    avatarUrl: 'https://avatars.example.com/kj.png',
    birthDate: null,
    nationality: null,
    createdAt: new Date('2026-03-01T00:00:00.000Z'),
    authProvider: 'google',
    connectedProviders: ['google', 'email_password'],
  } satisfies User,

  /** No name at all — initials fall back to the primary email. */
  unnamed: {
    id: 'user-unnamed',
    name: null,
    emails: ['solo@example.com'],
    username: null,
    avatarUrl: null,
    birthDate: null,
    nationality: null,
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
    authProvider: 'email_password',
    connectedProviders: [],
  } satisfies User,
} as const

export const AuthMocks = {
  /** Before the launch restore has answered. */
  unknown: base,

  /** The restore answered "nobody". */
  signedOut: { ...base, session: { kind: 'signedOut' } } satisfies AuthState,

  /** A sign-in in flight. */
  authenticating: {
    ...base,
    session: { kind: 'authenticating', flow: AuthFlow.emailPassword },
  } satisfies AuthState,

  /** Signed in, nothing pending. */
  signedIn: {
    ...base,
    session: { kind: 'signedIn', user: authUserMocks.typical },
  } satisfies AuthState,

  /** The credentials were wrong. */
  failed: {
    ...base,
    session: { kind: 'failed', exception: AuthExceptions.invalidCredentials() },
  } satisfies AuthState,

  /** No project configured — auth cleanly unavailable, local use unaffected. */
  unavailable: {
    ...base,
    session: {
      kind: 'failed',
      exception: AuthExceptions.unavailable([
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      ]),
    },
  } satisfies AuthState,

  /** A filled sign-up form, ready to submit. */
  signUpReady: {
    ...base,
    mode: AuthMode.signUp,
    form: {
      email: 'new@example.com',
      password: 'correct-horse',
      name: 'New User',
    },
  } satisfies AuthState,

  /** The existing-local-data dialog, with canon's count in it. */
  localDataDialog: {
    ...base,
    session: { kind: 'signedIn', user: authUserMocks.typical },
    localData: {
      kind: 'shown',
      pendingUser: authUserMocks.typical,
      anonymousCount: 3,
    },
  } satisfies AuthState,

  /** The dialog's choice being applied. */
  localDataResolving: {
    ...base,
    session: { kind: 'signedIn', user: authUserMocks.typical },
    localData: {
      kind: 'resolving',
      pendingUser: authUserMocks.typical,
      choice: LocalDataChoice.signAll,
    },
  } satisfies AuthState,

  /** Signed in with a healthy settings sync. */
  settingsSynced: {
    ...base,
    session: { kind: 'signedIn', user: authUserMocks.typical },
    settingsSync: { kind: 'synced', at: new Date('2026-08-31T09:00:00.000Z') },
  } satisfies AuthState,

  /** The last settings attempt had no connection. */
  settingsOffline: {
    ...base,
    session: { kind: 'signedIn', user: authUserMocks.typical },
    settingsSync: { kind: 'offline' },
  } satisfies AuthState,

  /** The endeavor engine as it ships: `supabaseHosting` off. */
  endeavorSyncDisabled: {
    ...base,
    session: { kind: 'signedIn', user: authUserMocks.typical },
    endeavorSync: { kind: 'disabled' },
  } satisfies AuthState,

  /** A completed sweep that pushed one tombstone — the ruling, in a fixture. */
  endeavorSyncCompleted: {
    ...base,
    session: { kind: 'signedIn', user: authUserMocks.typical },
    endeavorSync: {
      kind: 'completed',
      at: new Date('2026-08-31T09:05:00.000Z'),
      pushed: 2,
      deleted: 1,
      deferred: 0,
      pulled: 4,
    },
  } satisfies AuthState,

  /** A failed sweep. */
  endeavorSyncFailed: {
    ...base,
    session: { kind: 'signedIn', user: authUserMocks.typical },
    endeavorSync: {
      kind: 'failed',
      exception: EndeavorSyncExceptions.pullFailed('service unavailable'),
    },
  } satisfies AuthState,

  /** Just signed out, with #34's withdrawal still owed. */
  signedOutWithPendingIntents: {
    ...base,
    session: { kind: 'signedOut' },
    settingsSync: { kind: 'signedOut' },
    pendingSignOutIntents: signOutIntents(),
  } satisfies AuthState,
} as const
