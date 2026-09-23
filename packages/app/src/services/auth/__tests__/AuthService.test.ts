import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { AuthExceptions } from '../../../features/auth/AuthException'
import { makeStubbedSupabaseClientProvider } from '../../supabase/SupabaseClientProvider'
import {
  type AuthStateEvent,
  authFixtureUsers,
  makeLiveAuthService,
  makeStubbedAuthService,
  oauthRedirectProviders,
  providerFromSessionMetadata,
  supabaseProviderFor,
} from '../AuthService'

describe('the fixture users', () => {
  it('maps every fixture row through AuthMapper, so the stub exercises the real mapper', () => {
    expect(authFixtureUsers.email.name).toBe('Ada Lovelace')
    expect(authFixtureUsers.apple.authProvider).toBe('apple')
    expect(authFixtureUsers.google.avatarUrl).toBe(
      'https://avatars.example.com/google.png',
    )
  })

  it('uses only synthetic identities — no real account can leak through a fixture', () => {
    for (const user of Object.values(authFixtureUsers)) {
      for (const email of user.emails)
        expect(email.endsWith('@example.com')).toBe(true)
    }
  })

  it('carries the connected providers the wire column declares', () => {
    expect(authFixtureUsers.google.connectedProviders).toEqual(['google'])
  })
})

describe('provider mapping', () => {
  it('maps the two providers Kro offers a redirect flow for', () => {
    expect(supabaseProviderFor('google')).toBe('google')
    expect(supabaseProviderFor('apple')).toBe('apple')
  })

  it('refuses email/password, which is a credential grant and not a redirect', () => {
    expect(supabaseProviderFor('email_password')).toBeNull()
  })

  it('refuses facebook, which the domain declares but no Kro surface wires', () => {
    expect(supabaseProviderFor('facebook')).toBeNull()
    expect(oauthRedirectProviders).toEqual(['google', 'apple'])
  })
})

describe('the stubbed service as a session machine', () => {
  it('reports nobody signed in before any flow runs (a fresh browser)', async () => {
    const service = makeStubbedAuthService()
    expect(await service.restoreSession()).toBeNull()
  })

  it('remembers the account after an email sign-in, so a restore finds it', async () => {
    const service = makeStubbedAuthService()
    const user = await service.signInWithEmail('ada@example.com', 'secret')
    expect(user.emails).toEqual(['ada@example.com'])
    expect(await service.restoreSession()).toEqual(user)
  })

  it('forgets the account after a sign-out', async () => {
    const service = makeStubbedAuthService({
      initialUser: authFixtureUsers.email,
    })
    await service.signOut()
    expect(await service.restoreSession()).toBeNull()
  })

  it('carries the chosen display name through a sign-up', async () => {
    const service = makeStubbedAuthService()
    const user = await service.signUpWithEmail(
      'new@example.com',
      'secret',
      'New User',
    )
    expect(user.name).toBe('New User')
  })

  it('records every operation it was asked to perform', async () => {
    const service = makeStubbedAuthService()
    await service.signInWithEmail('ada@example.com', 'secret')
    await service.signOut()
    expect(service.operations()).toEqual(['signInWithEmail', 'signOut'])
  })

  it('can be scripted to fail one operation and not the others', async () => {
    const service = makeStubbedAuthService({
      failures: { signInWithEmail: AuthExceptions.invalidCredentials() },
    })
    await expect(
      service.signInWithEmail('ada@example.com', 'wrong'),
    ).rejects.toMatchObject({ kind: 'invalidCredentials' })
    await expect(service.restoreSession()).resolves.toBeNull()
  })
})

describe('the stubbed service and auth-state listeners', () => {
  it('announces a sign-in to every registered listener', async () => {
    const service = makeStubbedAuthService()
    const seen: AuthStateEvent[] = []
    service.onAuthStateChange((event) => seen.push(event))

    await service.signInWithEmail('ada@example.com', 'secret')

    expect(seen).toEqual([
      { kind: 'signedIn', userId: authFixtureUsers.email.id },
    ])
  })

  it('announces a sign-out', async () => {
    const service = makeStubbedAuthService({
      initialUser: authFixtureUsers.email,
    })
    const seen: AuthStateEvent[] = []
    service.onAuthStateChange((event) => seen.push(event))

    await service.signOut()

    expect(seen).toEqual([{ kind: 'signedOut' }])
  })

  it('stops announcing once the subscription is released', async () => {
    const service = makeStubbedAuthService()
    const seen: AuthStateEvent[] = []
    const stop = service.onAuthStateChange((event) => seen.push(event))

    stop()
    await service.signInWithEmail('ada@example.com', 'secret')

    expect(seen).toEqual([])
  })
})

describe('the stubbed Apple flow', () => {
  it('mints a challenge with both halves', async () => {
    const service = makeStubbedAuthService()
    const challenge = await service.beginAppleSignIn()
    expect(challenge.rawNonce.length).toBeGreaterThan(0)
    expect(challenge.hashedNonce).not.toBe(challenge.rawNonce)
  })

  it('signs in with an id token and keeps the name Apple sent once', async () => {
    const service = makeStubbedAuthService()
    const user = await service.signInWithAppleIdToken({
      idToken: 'token',
      rawNonce: 'raw',
      fullName: 'Grace Hopper',
    })
    expect(user.name).toBe('Grace Hopper')
    expect(user.authProvider).toBe('apple')
  })

  it('refuses an empty id token — canon`s noIdentityToken', async () => {
    const service = makeStubbedAuthService()
    await expect(
      service.signInWithAppleIdToken({
        idToken: '',
        rawNonce: 'raw',
        fullName: null,
      }),
    ).rejects.toMatchObject({ kind: 'noIdentityToken' })
  })
})

describe('the stubbed OAuth redirect', () => {
  it('reports the provider and the return address, and navigates nowhere', async () => {
    const service = makeStubbedAuthService()
    const redirect = await service.startOAuthRedirect({
      provider: 'google',
      redirectTo: 'https://kro.example/auth/callback',
    })
    expect(redirect.provider).toBe('google')
    expect(redirect.url).toContain('https://kro.example/auth/callback')
  })

  it('refuses a provider with no redirect flow', async () => {
    const service = makeStubbedAuthService()
    await expect(
      service.startOAuthRedirect({
        provider: 'email_password',
        redirectTo: 'https://kro.example',
      }),
    ).rejects.toMatchObject({ kind: 'providerRejected' })
  })

  it('does not sign anyone in — the session lands on the way back, not here', async () => {
    const service = makeStubbedAuthService()
    await service.startOAuthRedirect({
      provider: 'apple',
      redirectTo: 'https://kro.example',
    })
    expect(service.currentUser()).toBeNull()
  })
})

describe('the live service with no project configured', () => {
  const service = makeLiveAuthService({
    clientProvider: makeStubbedSupabaseClientProvider(),
    navigate: () => {
      throw new Error('the live service must not navigate when unconfigured')
    },
  })

  it('reports auth cleanly unavailable on a restore rather than crashing the launch', async () => {
    await expect(service.restoreSession()).rejects.toMatchObject({
      kind: 'unavailable',
    })
  })

  it('reports auth cleanly unavailable on a sign-in', async () => {
    await expect(
      service.signInWithEmail('ada@example.com', 'secret'),
    ).rejects.toMatchObject({ kind: 'unavailable' })
  })

  it('treats sign-out as a no-op — there is nothing signed in, and the local wipe still runs', async () => {
    await expect(service.signOut()).resolves.toBeUndefined()
  })

  it('returns a no-op unsubscribe from onAuthStateChange rather than throwing', () => {
    const stop = service.onAuthStateChange(() => {
      throw new Error('nothing should be announced')
    })
    expect(() => stop()).not.toThrow()
  })
})

describe('the live service auth-state subscription against a configured project', () => {
  type Handler = (
    event: string,
    session: { user: { id: string } } | null,
  ) => void

  const harness = () => {
    let handler: Handler | null = null
    let unsubscribed = 0
    const fakeClient = {
      auth: {
        onAuthStateChange: (next: Handler) => {
          handler = next
          return {
            data: {
              subscription: {
                unsubscribe: () => {
                  unsubscribed += 1
                },
              },
            },
          }
        },
      },
    }
    const service = makeLiveAuthService({
      clientProvider: {
        availability: () => ({
          kind: 'configured',
          configuration: { url: 'https://project.supabase.co', anonKey: 'k' },
        }),
        client: () => fakeClient as unknown as SupabaseClient,
      },
      navigate: () => {},
    })
    const seen: AuthStateEvent[] = []
    const stop = service.onAuthStateChange((event) => seen.push(event))
    const emit: Handler = (event, session) => {
      if (handler === null) throw new Error('no handler registered')
      handler(event, session)
    }
    return { seen, stop, emit, unsubscribed: () => unsubscribed }
  }

  it('ignores the boot-time INITIAL_SESSION with no session — a signed-out device is not a sign-out', () => {
    const h = harness()
    h.emit('INITIAL_SESSION', null)
    expect(h.seen).toEqual([])
  })

  it('announces a sign-out only on SIGNED_OUT itself (the user signed out here or in another tab)', () => {
    const h = harness()
    h.emit('SIGNED_OUT', null)
    expect(h.seen).toEqual([{ kind: 'signedOut' }])
  })

  it("ignores INITIAL_SESSION even with a session — the shell's mount restore owns boot, so it is never restored twice", () => {
    const h = harness()
    h.emit('INITIAL_SESSION', { user: { id: 'u-1' } })
    expect(h.seen).toEqual([])
  })

  it('announces SIGNED_IN as a sign-in (a PKCE return, or another tab signing in)', () => {
    const h = harness()
    h.emit('SIGNED_IN', { user: { id: 'u-1' } })
    expect(h.seen).toEqual([{ kind: 'signedIn', userId: 'u-1' }])
  })

  it('announces a token refresh as refreshed rather than a fresh sign-in', () => {
    const h = harness()
    h.emit('TOKEN_REFRESHED', { user: { id: 'u-1' } })
    expect(h.seen).toEqual([{ kind: 'refreshed', userId: 'u-1' }])
  })

  it('ignores any other user-less event rather than wiping local data on it', () => {
    const h = harness()
    h.emit('PASSWORD_RECOVERY', null)
    expect(h.seen).toEqual([])
  })

  it('releases the supabase subscription when the caller stops listening', () => {
    const h = harness()
    h.stop()
    expect(h.unsubscribed()).toBe(1)
  })
})

describe('the provider a session was established with', () => {
  it('reads google off app_metadata (a Continue with Google return)', () => {
    expect(providerFromSessionMetadata({ provider: 'google' })).toBe('google')
  })

  it('reads apple off app_metadata (a Continue with Apple return)', () => {
    expect(providerFromSessionMetadata({ provider: 'apple' })).toBe('apple')
  })

  it('falls back to the email kind for a password session or an unmodelled provider', () => {
    expect(providerFromSessionMetadata({ provider: 'email' })).toBe(
      'email_password',
    )
    expect(providerFromSessionMetadata(undefined)).toBe('email_password')
  })
})

describe('restoring a session on the first return from an OAuth redirect', () => {
  interface Row {
    readonly id: string
    readonly username: string | null
    readonly emails: readonly string[] | null
    readonly name: string | null
    readonly avatar_url: string | null
    readonly birth_date: string | null
    readonly nationality: string | null
    readonly login_kind: string | null
    readonly connected_services: readonly string[] | null
    readonly created_at: string
  }

  interface SessionUser {
    readonly id: string
    readonly email: string
    readonly user_metadata: Readonly<Record<string, unknown>>
    readonly app_metadata: Readonly<Record<string, unknown>>
  }

  const sessionUser: SessionUser = {
    id: 'g-1',
    email: 'google@example.com',
    user_metadata: {
      full_name: 'Google User',
      picture: 'https://avatars.example.com/google.png',
    },
    app_metadata: { provider: 'google' },
  }

  const harness = (options: {
    readonly session: { user: SessionUser } | null
    readonly rows?: Row[]
  }) => {
    const rows: Row[] = options.rows ?? []
    const upserts: unknown[] = []
    const navigated: string[] = []
    const table = {
      upsert: async (seed: Row) => {
        upserts.push(seed)
        if (!rows.some((r) => r.id === seed.id)) rows.push(seed)
        return { error: null }
      },
      select: () => ({
        eq: async (_column: string, id: string) => ({
          data: rows.filter((r) => r.id === id),
          error: null,
        }),
      }),
      update: (patch: Partial<Row>) => ({
        eq: (_column: string, id: string) => ({
          select: async () => {
            const index = rows.findIndex((r) => r.id === id)
            if (index >= 0) rows[index] = { ...rows[index], ...patch } as Row
            return { data: index >= 0 ? [rows[index]] : [], error: null }
          },
        }),
      }),
    }
    const authUser = options.session?.user ?? sessionUser
    const fakeClient = {
      auth: {
        getSession: async () => ({
          data: { session: options.session },
          error: null,
        }),
        signUp: async () => ({ data: { user: authUser }, error: null }),
        signInWithIdToken: async () => ({
          data: { user: authUser },
          error: null,
        }),
        signInWithOAuth: async () => ({
          data: { url: 'https://accounts.example/consent' },
          error: null,
        }),
      },
      from: (_name: string) => table,
    }
    const service = makeLiveAuthService({
      clientProvider: {
        availability: () => ({
          kind: 'configured',
          configuration: { url: 'https://project.supabase.co', anonKey: 'k' },
        }),
        client: () => fakeClient as unknown as SupabaseClient,
      },
      navigate: (url: string) => {
        navigated.push(url)
      },
    })
    return { service, rows, upserts, navigated }
  }

  it('creates the profile row from the provider metadata when Supabase has a session and the users table has no row', async () => {
    const h = harness({ session: { user: sessionUser } })

    const user = await h.service.restoreSession()

    expect(h.upserts).toHaveLength(1)
    expect(user).toMatchObject({
      id: 'g-1',
      name: 'Google User',
      avatarUrl: 'https://avatars.example.com/google.png',
      authProvider: 'google',
    })
  })

  it('keeps a name set in Kro and fills an empty avatar from the provider picture', async () => {
    const h = harness({
      session: { user: sessionUser },
      rows: [
        {
          id: 'g-1',
          username: null,
          emails: ['google@example.com'],
          name: 'Renamed Later',
          avatar_url: null,
          birth_date: null,
          nationality: null,
          login_kind: 'google',
          connected_services: ['google'],
          created_at: '2026-01-03T00:00:00.000Z',
        },
      ],
    })

    const user = await h.service.restoreSession()

    expect(user?.name).toBe('Renamed Later')
    expect(user?.avatarUrl).toBe('https://avatars.example.com/google.png')
  })

  it('leaves a picture the account already has, and does not write', async () => {
    const h = harness({
      session: { user: sessionUser },
      rows: [
        {
          id: 'g-1',
          username: null,
          emails: ['google@example.com'],
          name: 'Renamed Later',
          avatar_url: 'https://avatars.example.com/already.png',
          birth_date: null,
          nationality: null,
          login_kind: 'google',
          connected_services: ['google'],
          created_at: '2026-01-03T00:00:00.000Z',
        },
      ],
    })

    const user = await h.service.restoreSession()

    expect(h.upserts).toHaveLength(0)
    expect(user?.avatarUrl).toBe('https://avatars.example.com/already.png')
    expect(user?.name).toBe('Renamed Later')
  })

  it('answers null with nothing written when there is no session at all', async () => {
    const h = harness({ session: null })

    expect(await h.service.restoreSession()).toBeNull()
    expect(h.upserts).toHaveLength(0)
  })

  const appleUser: SessionUser = {
    id: 'a-1',
    email: 'abc123@privaterelay.appleid.com',
    user_metadata: { full_name: 'Ada Lovelace' },
    app_metadata: { provider: 'apple' },
  }

  it('creates an Apple profile from full_name with no avatar and the relay email (first Sign in with Apple on the web)', async () => {
    const h = harness({ session: { user: appleUser } })

    const user = await h.service.restoreSession()

    expect(user).toMatchObject({
      id: 'a-1',
      name: 'Ada Lovelace',
      avatarUrl: null,
      authProvider: 'apple',
    })
    expect(user?.emails).toEqual(['abc123@privaterelay.appleid.com'])
  })

  it('leaves the name empty when Apple withheld it (a later authorisation, name shared only once)', async () => {
    const h = harness({
      session: { user: { ...appleUser, user_metadata: {} } },
    })

    const user = await h.service.restoreSession()

    expect(user?.name).toBeNull()
    expect(user?.authProvider).toBe('apple')
  })

  it('does not overwrite a name the user set in Kro with the provider one on a later return', async () => {
    const h = harness({
      session: { user: appleUser },
      rows: [
        {
          id: 'a-1',
          username: null,
          emails: ['abc123@privaterelay.appleid.com'],
          name: 'Countess',
          avatar_url: null,
          birth_date: null,
          nationality: null,
          login_kind: 'apple',
          connected_services: ['apple'],
          created_at: '2026-01-02T00:00:00.000Z',
        },
      ],
    })

    const user = await h.service.restoreSession()

    expect(user?.name).toBe('Countess')
    expect(h.upserts).toHaveLength(0)
  })

  it('throws the same typed exception as the creation path when the existing row is malformed — never a phantom sign-out', async () => {
    const h = harness({
      session: { user: sessionUser },
      rows: [
        {
          id: 'g-1',
          username: null,
          emails: null,
          name: null,
          avatar_url: null,
          birth_date: null,
          nationality: null,
          login_kind: 'google',
          connected_services: null,
          created_at: 'not-a-date',
        },
      ],
    })

    await expect(h.service.restoreSession()).rejects.toMatchObject({
      kind: 'userCreationFailed',
    })
  })

  it('backfills an empty name and avatar from the provider on a row that lacks them, and leaves a set name alone', async () => {
    const h = harness({
      session: { user: sessionUser },
      rows: [
        {
          id: 'g-1',
          username: null,
          emails: ['google@example.com'],
          name: '',
          avatar_url: null,
          birth_date: null,
          nationality: null,
          login_kind: 'google',
          connected_services: ['google'],
          created_at: '2026-01-03T00:00:00.000Z',
        },
      ],
    })
    // The existing-row early return answers first; drive the backfill through
    // a fresh upsert path by removing the row and re-creating it.
    h.rows.length = 0
    h.rows.push({
      id: 'g-1',
      username: null,
      emails: ['google@example.com'],
      name: '',
      avatar_url: null,
      birth_date: null,
      nationality: null,
      login_kind: 'google',
      connected_services: ['google'],
      created_at: '2026-01-03T00:00:00.000Z',
    })
    const user = await h.service.signUpWithEmail(
      'google@example.com',
      'secret',
      'Google User',
    )

    expect(user.name).toBe('Google User')
  })

  it('throws when the row is missing after the upsert (the write was refused silently)', async () => {
    const h = harness({ session: { user: sessionUser } })
    const table = (h.service as unknown as { _t?: unknown })._t
    void table
    // A store whose upsert reports success but whose read answers nothing.
    const broken = harness({ session: { user: sessionUser } })
    broken.rows.push = () => 0
    await expect(broken.service.restoreSession()).rejects.toMatchObject({
      kind: 'userCreationFailed',
    })
  })

  it('signs up with a display name and provisions the profile inline', async () => {
    const h = harness({ session: null })
    const user = await h.service.signUpWithEmail(
      'ada@example.com',
      'secret',
      'Ada',
    )
    expect(user.name).toBe('Ada')
    expect(user.authProvider).toBe('email_password')
  })

  it('exchanges an Apple id token and provisions the profile with the shared name', async () => {
    const h = harness({ session: null })
    const user = await h.service.signInWithAppleIdToken({
      idToken: 'token',
      rawNonce: 'nonce',
      fullName: 'Ada Lovelace',
    })
    expect(user.authProvider).toBe('apple')
    expect(user.name).toBe('Ada Lovelace')
  })

  it('refuses an empty Apple id token before touching the network', async () => {
    const h = harness({ session: null })
    await expect(
      h.service.signInWithAppleIdToken({
        idToken: '',
        rawNonce: 'n',
        fullName: null,
      }),
    ).rejects.toMatchObject({ kind: 'noIdentityToken' })
  })

  it('starts an OAuth redirect by navigating to the provider URL Supabase minted', async () => {
    const h = harness({ session: null })
    const redirect = await h.service.startOAuthRedirect({
      provider: 'google',
      redirectTo: 'http://localhost:3000/my-day',
    })
    expect(redirect.url).toBe('https://accounts.example/consent')
    expect(h.navigated).toEqual(['https://accounts.example/consent'])
  })
})
