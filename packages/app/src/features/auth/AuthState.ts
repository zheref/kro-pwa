/**
 * The auth slice's state shape — canon `AuthFeature.State` plus the parts of
 * `MainState` that belong to the session rather than to a screen
 * (`currentUser`, `anonymousMigrationPendingUser`, `settingsSyncState`).
 *
 * Canon splits these across two reducers because iOS composes by presentation:
 * `AuthFeature` owns the form and hands a signed-in `User` up a delegate chain,
 * and `MainFeature` — which owns the endeavor pool and the settings modal —
 * decides what happens next. There is no Main slice on this stack, and `RC-20`
 * forbids another slice reaching into this one's shape, so the two halves
 * collapse into one slice: one session, one form, one dialog, one sync status.
 *
 * ## Four lifecycles, four discriminated fields (`RC-24`, `UZF-9`)
 *
 * They are genuinely independent, which is why they are not flattened into
 * booleans that could describe impossible combinations:
 *
 * - `session` — is anyone signed in, and is a flow in progress?
 * - `localData` — is the existing-local-data dialog up, and for whom?
 * - `settingsSync` — the Settings hub's footer state.
 * - `endeavorSync` — the last endeavor sweep's outcome.
 *
 * A failed settings push must not blank the session; a running sign-in must not
 * make the Settings footer say "syncing". Separate fields are what makes that
 * structural rather than careful.
 *
 * ## No token, ever
 *
 * `session` carries a domain `User` and nothing else. Access and refresh tokens
 * stay inside supabase-js's own storage; they are never lifted into Redux,
 * never serialised into a story fixture and never logged (`SEC-1`, `SEC-5`).
 */
import type { User } from '@kro/core'
import type { AuthException } from './AuthException'
import type { EndeavorSyncException } from './EndeavorSyncException'
import type { LocalDataChoice } from './LocalDataDialog'
import type { SignOutIntent } from './SignOutIntents'

/** Canon's `AuthFeature.Mode` — the sign-in ⇄ create toggle. */
export const AuthMode = {
  signIn: 'signIn',
  signUp: 'signUp',
} as const

export type AuthMode = (typeof AuthMode)[keyof typeof AuthMode]

/** Which provider flow is in flight, so the surface can spin the right button. */
export const AuthFlow = {
  emailPassword: 'emailPassword',
  apple: 'apple',
  google: 'google',
  /** The silent restore that runs at app launch. */
  restore: 'restore',
} as const

export type AuthFlow = (typeof AuthFlow)[keyof typeof AuthFlow]

/**
 * The session's lifecycle. `unknown` is the pre-launch state — distinct from
 * `signedOut`, because a surface must not render "Sign in" before the restore
 * has answered, or every reload would flash the signed-out shell.
 */
export type AuthSessionState =
  | { readonly kind: 'unknown' }
  | { readonly kind: 'authenticating'; readonly flow: AuthFlow }
  | { readonly kind: 'signedIn'; readonly user: User }
  | { readonly kind: 'signedOut' }
  | { readonly kind: 'failed'; readonly exception: AuthException }

/** Canon's `anonymousMigrationPendingUser`, as one field rather than two. */
export type LocalDataDialogState =
  | { readonly kind: 'hidden' }
  | {
      readonly kind: 'shown'
      /** The account that just signed in and is waiting on the choice. */
      readonly pendingUser: User
      /** Anonymous rows on this device — the number canon interpolates. */
      readonly anonymousCount: number
    }
  | {
      readonly kind: 'resolving'
      readonly pendingUser: User
      readonly choice: LocalDataChoice
    }

/**
 * Canon's `SettingsSyncState` — the Settings hub footer. `signedOut` is its own
 * case rather than an absence because the footer's copy differs: *"Sign in to
 * sync"* is a prompt, not a failure.
 */
export type SettingsSyncState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'syncing' }
  | { readonly kind: 'synced'; readonly at: Date }
  | { readonly kind: 'offline' }
  | { readonly kind: 'signedOut' }

/** The last endeavor sweep. `disabled` is the shipping state, not a failure. */
export type EndeavorSyncState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'syncing' }
  | {
      readonly kind: 'completed'
      readonly at: Date
      readonly pushed: number
      readonly deleted: number
      readonly deferred: number
      readonly pulled: number
    }
  /** The `supabaseHosting` flag is off — nothing was attempted. */
  | { readonly kind: 'disabled' }
  | { readonly kind: 'failed'; readonly exception: EndeavorSyncException }

/**
 * What one endeavor sweep did, counted.
 *
 * Counts rather than id lists: the slice's job is to tell a surface whether
 * anything moved, and holding every id would put an unbounded array in state
 * for no reader. The engine's full report (with ids) is what the Producer sees
 * and what the engine's own tests assert on.
 */
export interface EndeavorSyncSummary {
  readonly status: 'disabled' | 'signedOut' | 'synchronized'
  readonly pushed: number
  /** Tombstones pushed — the KC-IS-#31 ruling, visible in state. */
  readonly deleted: number
  readonly deferred: number
  readonly pulled: number
  readonly localWins: number
  readonly skipped: number
}

/** The email/password form. Held here because it survives a mode toggle. */
export interface AuthFormState {
  readonly email: string
  readonly password: string
  readonly name: string
}

export interface AuthState {
  readonly mode: AuthMode
  readonly form: AuthFormState
  readonly session: AuthSessionState
  readonly localData: LocalDataDialogState
  readonly settingsSync: SettingsSyncState
  readonly endeavorSync: EndeavorSyncState
  /**
   * The raw nonce of the Apple attempt in flight, and nothing else — the
   * hashed half is handed to Apple by the surface and never needs storing.
   * `null` between attempts so a stale nonce can never be replayed.
   */
  readonly appleRawNonce: string | null
  /**
   * Platform actions the last sign-out asked for and this issue cannot perform
   * (#34). Cleared when a surface acknowledges them.
   */
  readonly pendingSignOutIntents: readonly SignOutIntent[]
}

export const initialAuthState: AuthState = {
  mode: AuthMode.signIn,
  form: { email: '', password: '', name: '' },
  session: { kind: 'unknown' },
  localData: { kind: 'hidden' },
  settingsSync: { kind: 'idle' },
  endeavorSync: { kind: 'idle' },
  appleRawNonce: null,
  pendingSignOutIntents: [],
}

/** Canon's minimum, quoted from `AuthFeature`: *"at least 6 characters"*. */
export const MINIMUM_PASSWORD_LENGTH = 6
