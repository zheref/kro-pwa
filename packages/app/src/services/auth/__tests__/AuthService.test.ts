import { describe, expect, it } from 'vitest'
import { AuthExceptions } from '../../../features/auth/AuthException'
import { makeStubbedSupabaseClientProvider } from '../../supabase/SupabaseClientProvider'
import {
  type AuthStateEvent,
  authFixtureUsers,
  makeLiveAuthService,
  makeStubbedAuthService,
  oauthRedirectProviders,
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
