/**
 * `AuthService` — canon `SupabaseAuthService` (`Kro/Dependencies/`), ported to
 * the **web** flow, with its `.live` and `.mock` pair kept as
 * `makeLiveAuthService` / `makeStubbedAuthService` (`RC-33`, `RC-59`).
 *
 * ## What differs from canon, and why
 *
 * | Canon (iOS) | Here (web) | Why |
 * |---|---|---|
 * | `signInWithGoogle` runs `WebAuth` against `app.kro://login-callback` and exchanges the callback URL itself | `startOAuthRedirect` returns the provider URL and navigates; supabase-js's `detectSessionInUrl` completes the exchange on the way back | There is no `ASWebAuthenticationSession` in a browser. A full-page redirect (or the popup #32 may choose) is the web idiom, and the PKCE code exchange is the client library's job. |
 * | Apple arrives as `ASAuthorizationAppleIDCredential` | `beginAppleSignIn()` mints the nonce pair; the UI hands Apple's JS SDK the **hashed** half and returns the id token with the **raw** half | Same OIDC exchange, different SDK. See `AppleNonce.ts`. |
 * | `uploadAvatar`, `requestDataDeletion`, `updateProfile` | `updateProfile` only | Avatar upload is a Settings/Profile surface (#32) and account deletion is a policy flow neither this issue nor #32 scopes; porting either here would ship an operation nothing calls. |
 * | `fatalError` when no client | every operation throws `AuthExceptions.unavailable(...)` | Signed-out local-only use is a supported mode on the web (`authenticationEnforced` OFF). A missing environment must degrade, not crash. |
 *
 * ## The operations throw; they do not return `Result`
 *
 * `RC-33` puts the `Result` boundary in the Producer. Where this Service
 * *knows* the answer — no project configured, the user dismissed the sheet — it
 * throws the typed `AuthException` directly, exactly as canon throws
 * `KroAuthError`; `AuthMapper.toException` passes those through untouched and
 * translates everything else.
 *
 * ## No token ever leaves this file
 *
 * Operations resolve a domain `User` and nothing else. The access token,
 * refresh token and the whole `Session` stay inside supabase-js's storage —
 * they are never returned, never put in slice state, never logged and never
 * appended to a URL this code builds (`SEC-1`, `SEC-5`).
 */
import type { AuthProvider, User } from '@kro/core'
import type { Provider, SupabaseClient } from '@supabase/supabase-js'
import { AuthExceptions } from '../../features/auth/AuthException'
import { AuthMapper, type UserRow } from '../../features/auth/AuthMapper'
import type { SupabaseClientProvider } from '../supabase/SupabaseClientProvider'
import {
  type AppleSignInChallenge,
  type CryptoProvider,
  ambientCrypto,
  makeAppleSignInChallenge,
} from './AppleNonce'
import fixtures from './auth.fixtures.json'

/** What an auth-state change tells the app. Never carries a token. */
export type AuthStateEvent =
  | { readonly kind: 'signedIn'; readonly userId: string }
  | { readonly kind: 'signedOut' }
  /** The session was refreshed in place — identity unchanged. */
  | { readonly kind: 'refreshed'; readonly userId: string }

/** An `onAuthStateChange` registration. Calling it detaches the listener. */
export type AuthSubscription = () => void

/** The provider redirect a caller was sent to. */
export interface OAuthRedirect {
  readonly provider: AuthProvider
  readonly url: string
}

export interface AppleIdTokenCredentials {
  readonly idToken: string
  /** The **raw** nonce from `beginAppleSignIn()`, not the hashed one. */
  readonly rawNonce: string
  /** Apple sends the name once, on first authorization only. */
  readonly fullName: string | null
}

export interface AuthService {
  /** `restoreSession` — the persisted session's profile, or `null`. */
  restoreSession(): Promise<User | null>
  signInWithEmail(email: string, password: string): Promise<User>
  signUpWithEmail(email: string, password: string, name: string): Promise<User>
  /** Mints the nonce pair one Apple attempt needs. */
  beginAppleSignIn(): Promise<AppleSignInChallenge>
  /** `signInWithAppleIdToken` — the OIDC exchange. */
  signInWithAppleIdToken(credentials: AppleIdTokenCredentials): Promise<User>
  /**
   * Starts the redirect leg for a provider that has no id token to offer.
   * Resolves once the browser has been sent; the session lands on the way back.
   */
  startOAuthRedirect(params: {
    provider: AuthProvider
    redirectTo: string
  }): Promise<OAuthRedirect>
  /** `updateProfile` — writes only the non-null columns (`AuthMapper`). */
  updateProfile(user: User): Promise<User>
  signOut(): Promise<void>
  onAuthStateChange(listener: (event: AuthStateEvent) => void): AuthSubscription
}

/** The two providers Kro's OAuth redirect supports. */
export const oauthRedirectProviders: readonly AuthProvider[] = [
  'google',
  'apple',
]

/**
 * A domain `AuthProvider` to supabase-js's `Provider`, or `null` when the
 * provider has no redirect flow (`email_password` is a credential grant, and
 * `facebook` is declared in the domain but wired on no Kro surface).
 */
export const supabaseProviderFor = (
  provider: AuthProvider,
): Provider | null => {
  if (provider === 'google') return 'google'
  if (provider === 'apple') return 'apple'
  return null
}

// ---------------------------------------------------------------------------
// Live
// ---------------------------------------------------------------------------

const USERS_TABLE = 'users'

export interface LiveAuthServiceOptions {
  readonly clientProvider: SupabaseClientProvider
  /** Defaults to Web Crypto. A test may pass a deterministic double. */
  readonly crypto?: CryptoProvider | null
  /**
   * How the browser is sent to the provider. Defaults to a full-page
   * assignment; injected so the redirect is a Service concern (`RC-17` in
   * spirit — navigation never happens in a component) and so no test navigates.
   */
  readonly navigate?: (url: string) => void
}

const defaultNavigate = (url: string): void => {
  const host = globalThis as {
    readonly location?: { assign?: (target: string) => void }
  }
  host.location?.assign?.(url)
}

/** The client, or the typed "no project configured" failure. */
const requireClient = (provider: SupabaseClientProvider): SupabaseClient => {
  const client = provider.client()
  if (client !== null) return client
  const availability = provider.availability()
  throw AuthExceptions.unavailable(
    availability.kind === 'unconfigured' ? availability.missing : [],
  )
}

/**
 * `ensureProfileRow` — canon's idempotent provisioning, step for step.
 *
 * 1. `INSERT … ON CONFLICT (id) DO NOTHING`, so a returning user's row is left
 *    completely untouched.
 * 2. Read the authoritative state back.
 * 3. For a returning user, fill `name` / `avatar_url` **only if** they are
 *    empty locally and the provider supplied them — never overwrite what the
 *    user set themselves.
 */
const ensureProfileRow = async (
  client: SupabaseClient,
  params: {
    readonly userId: string
    readonly email: string | null
    readonly name: string | null
    readonly avatarUrl: string | null
    readonly provider: AuthProvider
    readonly now: Date
  },
): Promise<User> => {
  const seed = {
    id: params.userId,
    username: null,
    emails: params.email === null ? [] : [params.email],
    name: params.name,
    avatar_url: params.avatarUrl,
    birth_date: null,
    nationality: null,
    login_kind: params.provider,
    connected_services: [params.provider],
    created_at: params.now.toISOString(),
  }

  const inserted = await client
    .from(USERS_TABLE)
    .upsert(seed, { onConflict: 'id', ignoreDuplicates: true })
  if (inserted.error !== null) throw inserted.error

  const read = await client.from(USERS_TABLE).select().eq('id', params.userId)
  if (read.error !== null) throw read.error

  const row = (read.data as readonly UserRow[] | null)?.[0]
  if (row === undefined) {
    throw AuthExceptions.userCreationFailed('profile row missing after upsert')
  }

  const needsName =
    (row.name ?? '').length === 0 && (params.name ?? '').length > 0
  const needsAvatar =
    (row.avatar_url ?? '').length === 0 && (params.avatarUrl ?? '').length > 0

  if (needsName || needsAvatar) {
    const patch: { name?: string; avatar_url?: string } = {}
    if (needsName && params.name !== null) patch.name = params.name
    if (needsAvatar && params.avatarUrl !== null)
      patch.avatar_url = params.avatarUrl

    const updated = await client
      .from(USERS_TABLE)
      .update(patch)
      .eq('id', params.userId)
      .select()
    if (updated.error === null) {
      const refreshed = (updated.data as readonly UserRow[] | null)?.[0]
      if (refreshed !== undefined) {
        const mapped = AuthMapper.toDomain(refreshed)
        if (mapped !== null) return mapped
      }
    }
  }

  const mapped = AuthMapper.toDomain(row)
  if (mapped === null) {
    throw AuthExceptions.userCreationFailed('profile row is malformed')
  }
  return mapped
}

/** The OAuth metadata Google puts on the session user, read canon's way. */
const metadataString = (
  metadata: Readonly<Record<string, unknown>> | undefined,
  ...names: readonly string[]
): string | null => {
  for (const name of names) {
    const value = metadata?.[name]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return null
}

export const makeLiveAuthService = (
  options: LiveAuthServiceOptions,
): AuthService => {
  const { clientProvider } = options
  const navigate = options.navigate ?? defaultNavigate
  const crypto = options.crypto === undefined ? ambientCrypto() : options.crypto
  const now = (): Date => new Date()

  return {
    async restoreSession() {
      const client = requireClient(clientProvider)
      const { data, error } = await client.auth.getSession()
      if (error !== null) throw error
      const sessionUser = data.session?.user
      if (sessionUser === undefined) return null

      const read = await client
        .from(USERS_TABLE)
        .select()
        .eq('id', sessionUser.id)
      if (read.error !== null) throw read.error
      const row = (read.data as readonly UserRow[] | null)?.[0]
      return row === undefined ? null : AuthMapper.toDomain(row)
    },

    async signInWithEmail(email, password) {
      const client = requireClient(clientProvider)
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      })
      if (error !== null) throw error
      return ensureProfileRow(client, {
        userId: data.user.id,
        email: data.user.email ?? null,
        name: null,
        avatarUrl: null,
        provider: 'email_password',
        now: now(),
      })
    },

    async signUpWithEmail(email, password, name) {
      const client = requireClient(clientProvider)
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { display_name: name } },
      })
      if (error !== null) throw error
      if (data.user === null) {
        throw AuthExceptions.userCreationFailed('sign-up returned no user')
      }
      return ensureProfileRow(client, {
        userId: data.user.id,
        email: data.user.email ?? null,
        name,
        avatarUrl: null,
        provider: 'email_password',
        now: now(),
      })
    },

    async beginAppleSignIn() {
      if (crypto === null) {
        throw AuthExceptions.unknown('this runtime has no Web Crypto')
      }
      return makeAppleSignInChallenge(crypto)
    },

    async signInWithAppleIdToken(credentials) {
      const client = requireClient(clientProvider)
      if (credentials.idToken.length === 0)
        throw AuthExceptions.noIdentityToken()
      const { data, error } = await client.auth.signInWithIdToken({
        provider: 'apple',
        token: credentials.idToken,
        nonce: credentials.rawNonce,
      })
      if (error !== null) throw error
      if (data.user === null) throw AuthExceptions.noIdentityToken()
      return ensureProfileRow(client, {
        userId: data.user.id,
        email: data.user.email ?? null,
        // Apple sends the name exactly once, on first authorization.
        name: credentials.fullName,
        // Apple never supplies an avatar (canon says so in the same words).
        avatarUrl: null,
        provider: 'apple',
        now: now(),
      })
    },

    async startOAuthRedirect({ provider, redirectTo }) {
      const client = requireClient(clientProvider)
      const supabaseProvider = supabaseProviderFor(provider)
      if (supabaseProvider === null) {
        throw AuthExceptions.providerRejected(provider)
      }
      const { data, error } = await client.auth.signInWithOAuth({
        provider: supabaseProvider,
        options: { redirectTo, skipBrowserRedirect: true },
      })
      if (error !== null) throw error
      if (data.url === null) throw AuthExceptions.providerRejected(provider)
      navigate(data.url)
      return { provider, url: data.url }
    },

    async updateProfile(user) {
      const client = requireClient(clientProvider)
      const { data, error } = await client
        .from(USERS_TABLE)
        .update(AuthMapper.fromDomain(user))
        .eq('id', user.id)
        .select()
      if (error !== null) throw error
      const row = (data as readonly UserRow[] | null)?.[0]
      if (row === undefined) return user
      return AuthMapper.toDomain(row) ?? user
    },

    async signOut() {
      const client = clientProvider.client()
      // Signing out with no project is not a failure — there is nothing signed
      // in. The caller's local wipe still runs, which is the part that matters.
      if (client === null) return
      const { error } = await client.auth.signOut()
      if (error !== null) throw error
    },

    onAuthStateChange(listener) {
      const client = clientProvider.client()
      if (client === null) return () => {}
      const { data } = client.auth.onAuthStateChange((event, session) => {
        const userId = session?.user.id
        if (event === 'SIGNED_OUT' || userId === undefined) {
          listener({ kind: 'signedOut' })
          return
        }
        if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          listener({ kind: 'refreshed', userId })
          return
        }
        listener({ kind: 'signedIn', userId })
      })
      return () => data.subscription.unsubscribe()
    },
  }
}

/** Reads the OAuth display name/avatar the way canon reads Google's metadata. */
export const oauthProfileFromMetadata = (
  metadata: Readonly<Record<string, unknown>> | undefined,
): { readonly name: string | null; readonly avatarUrl: string | null } => ({
  name: metadataString(metadata, 'full_name', 'name'),
  avatarUrl: metadataString(metadata, 'picture', 'avatar_url'),
})

// ---------------------------------------------------------------------------
// Stub
// ---------------------------------------------------------------------------

const fixtureRows = fixtures.users as unknown as Readonly<
  Record<string, UserRow>
>

/** The fixture profiles, as domain users, for tests and stories. */
export const authFixtureUsers: Readonly<
  Record<'email' | 'apple' | 'google', User>
> = {
  email: AuthMapper.toDomain(fixtureRows.email as UserRow) as User,
  apple: AuthMapper.toDomain(fixtureRows.apple as UserRow) as User,
  google: AuthMapper.toDomain(fixtureRows.google as UserRow) as User,
}

/** Every operation name, so a stub can be scripted per operation. */
export type AuthOperation =
  | 'restoreSession'
  | 'signInWithEmail'
  | 'signUpWithEmail'
  | 'beginAppleSignIn'
  | 'signInWithAppleIdToken'
  | 'startOAuthRedirect'
  | 'updateProfile'
  | 'signOut'

export interface StubbedAuthServiceOptions {
  /** The session the stub starts with. Defaults to signed out. */
  readonly initialUser?: User | null
  /** Operations that should fail, and with what. */
  readonly failures?: Partial<Record<AuthOperation, unknown>>
  /** Fixed challenge, so an Apple test asserts on a known nonce pair. */
  readonly challenge?: AppleSignInChallenge
}

/** A stub that also records what was asked of it. */
export interface StubbedAuthService extends AuthService {
  /** Every operation invoked, in order — the spy half of the double. */
  operations(): readonly AuthOperation[]
  /** The user the stub currently considers signed in. */
  currentUser(): User | null
}

/**
 * The test/preview binding.
 *
 * It is a real little state machine rather than a bag of constants: sign-in
 * stores a user, `restoreSession` reports it, `signOut` clears it and every
 * registered `onAuthStateChange` listener sees the transition. That is what
 * lets the slice's arms be driven end to end without a network, and it is why
 * the "≥3 per arm" tests below are exercises of the real reducer path rather
 * than of hand-written state.
 */
export const makeStubbedAuthService = (
  options: StubbedAuthServiceOptions = {},
): StubbedAuthService => {
  let user: User | null = options.initialUser ?? null
  const invoked: AuthOperation[] = []
  const listeners = new Set<(event: AuthStateEvent) => void>()

  const record = (operation: AuthOperation): void => {
    invoked.push(operation)
    const failure = options.failures?.[operation]
    if (failure !== undefined) throw failure
  }

  const announce = (event: AuthStateEvent): void => {
    for (const listener of listeners) listener(event)
  }

  const signedIn = (next: User): User => {
    user = next
    announce({ kind: 'signedIn', userId: next.id })
    return next
  }

  return {
    operations: () => [...invoked],
    currentUser: () => user,

    async restoreSession() {
      record('restoreSession')
      return user
    },

    async signInWithEmail(email, _password) {
      record('signInWithEmail')
      const fixture = authFixtureUsers.email
      return signedIn({ ...fixture, emails: [email] })
    },

    async signUpWithEmail(email, _password, name) {
      record('signUpWithEmail')
      const fixture = authFixtureUsers.email
      return signedIn({
        ...fixture,
        emails: [email],
        name,
        connectedProviders: [],
      })
    },

    async beginAppleSignIn() {
      record('beginAppleSignIn')
      return (
        options.challenge ?? {
          rawNonce: 'stub-raw-nonce',
          hashedNonce: 'stub-hashed-nonce',
        }
      )
    },

    async signInWithAppleIdToken(credentials) {
      record('signInWithAppleIdToken')
      if (credentials.idToken.length === 0)
        throw AuthExceptions.noIdentityToken()
      const fixture = authFixtureUsers.apple
      return signedIn(
        credentials.fullName === null
          ? fixture
          : { ...fixture, name: credentials.fullName },
      )
    },

    async startOAuthRedirect({ provider, redirectTo }) {
      record('startOAuthRedirect')
      if (supabaseProviderFor(provider) === null) {
        throw AuthExceptions.providerRejected(provider)
      }
      // No navigation, no network: the URL is synthesised so a test can assert
      // the provider and the return address were carried correctly.
      return {
        provider,
        url: `https://auth.kro.invalid/${provider}?redirect=${redirectTo}`,
      }
    },

    async updateProfile(next) {
      record('updateProfile')
      user = next
      return next
    },

    async signOut() {
      record('signOut')
      user = null
      announce({ kind: 'signedOut' })
    },

    onAuthStateChange(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/** The default stub — signed out, nothing scripted to fail. */
export const stubbedAuthService: AuthService = makeStubbedAuthService()
