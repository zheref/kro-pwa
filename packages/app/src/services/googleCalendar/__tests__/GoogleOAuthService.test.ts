import { describe, expect, it } from 'vitest'
import {
  GOOGLE_AUTHORIZATION_ENDPOINT,
  GOOGLE_CALENDAR_SCOPE,
  GOOGLE_REVOCATION_ENDPOINT,
  GOOGLE_TOKEN_ENDPOINT,
  type GoogleFormTransport,
  googleAuthorizationUrl,
  makeLiveGoogleOAuthService,
  makePkcePair,
  makeStubbedGoogleOAuthService,
  parseGoogleCallbackUrl,
  randomUrlSafeString,
} from '../GoogleOAuthService'
import { ambientCryptoSource } from '../GoogleTokenVault'

const crypto = ambientCryptoSource()
if (crypto === null) throw new Error('This suite needs Web Crypto.')

const CLIENT_ID = 'client-id.apps.googleusercontent.com'
const clientSecretFixture = 'not-a-real-value'
const REDIRECT = 'https://kro.app/api/google/callback'

/** A transport double that records every call and answers from a script. */
const recordingTransport = (
  script: readonly { readonly status: number; readonly body: unknown }[],
  recorded: {
    url: string
    fields: Readonly<Record<string, string>>
  }[],
): GoogleFormTransport => {
  let index = 0
  return {
    async postForm(url, fields) {
      recorded.push({ url, fields })
      const answer = script[Math.min(index, script.length - 1)]
      index += 1
      return answer ?? { status: 500, body: null }
    },
  }
}

describe('the authorization URL', () => {
  const url = googleAuthorizationUrl({
    clientId: CLIENT_ID,
    redirectUri: REDIRECT,
    state: 'state-value',
    challenge: 'challenge-value',
  })
  const parsed = new URL(url)

  it('points at Google’s authorization endpoint', () => {
    expect(url.startsWith(GOOGLE_AUTHORIZATION_ENDPOINT)).toBe(true)
  })

  it('asks for the calendar scope canon asks for', () => {
    expect(parsed.searchParams.get('scope')).toBe(GOOGLE_CALENDAR_SCOPE)
  })

  it('sets access_type=offline, without which Google issues NO refresh token', () => {
    expect(parsed.searchParams.get('access_type')).toBe('offline')
  })

  it('sets prompt=consent, without which a repeat grant reissues nothing', () => {
    // This is what makes "Reconnect" work for a user who already granted once.
    expect(parsed.searchParams.get('prompt')).toBe('consent')
  })

  it('carries the S256 PKCE challenge, never the verifier', () => {
    expect(parsed.searchParams.get('code_challenge')).toBe('challenge-value')
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url).not.toContain('code_verifier')
  })

  it('NEVER carries the client secret (SEC-5)', () => {
    // The secret exists only in a POST form body, never in a URL.
    const withSecret = googleAuthorizationUrl({
      clientId: CLIENT_ID,
      redirectUri: REDIRECT,
      state: 's',
      challenge: 'c',
    })
    expect(withSecret).not.toContain(clientSecretFixture)
    expect(withSecret).not.toContain('client_secret')
  })
})

describe('PKCE', () => {
  it('mints a 64-character verifier, as canon does', async () => {
    const pair = await makePkcePair(crypto)
    expect(pair.verifier).toHaveLength(64)
  })

  it('mints a different pair every time', async () => {
    const [first, second] = await Promise.all([
      makePkcePair(crypto),
      makePkcePair(crypto),
    ])
    expect(first.verifier).not.toBe(second.verifier)
    expect(first.challenge).not.toBe(second.challenge)
  })

  it('derives a URL-safe challenge from the verifier', async () => {
    const pair = await makePkcePair(crypto)
    expect(pair.challenge).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(pair.challenge).not.toBe(pair.verifier)
  })

  it('draws random strings from the URL-safe alphabet only', () => {
    // Rejection-sampled rather than modulo-biased — the divergence from canon
    // is recorded in the module note.
    const value = randomUrlSafeString(512, crypto)
    expect(value).toHaveLength(512)
    expect(value).toMatch(/^[A-Za-z0-9\-._~]+$/)
  })
})

describe('reading the callback URL', () => {
  it('extracts the code and the state', () => {
    const parsed = parseGoogleCallbackUrl(
      'https://kro.app/api/google/callback?code=abc&state=xyz',
    )
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.code).toBe('abc')
    expect(parsed.state).toBe('xyz')
  })

  it('reports the user pressing Cancel as an outcome, not a crash', () => {
    const parsed = parseGoogleCallbackUrl(
      'https://kro.app/api/google/callback?error=access_denied',
    )
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.error).toBe('access_denied')
  })

  it('reports a callback missing either half', () => {
    expect(
      parseGoogleCallbackUrl('https://kro.app/api/google/callback?code=abc').ok,
    ).toBe(false)
    expect(parseGoogleCallbackUrl('not a url').ok).toBe(false)
  })
})

describe('exchanging an authorization code', () => {
  it('posts to the token endpoint and returns the grant', async () => {
    const recorded: { url: string; fields: Record<string, string> }[] = []
    const service = makeLiveGoogleOAuthService({
      clientId: CLIENT_ID,
      clientSecret: clientSecretFixture,
      transport: recordingTransport(
        [
          {
            status: 200,
            body: {
              access_token: 'access',
              refresh_token: 'refresh',
              expires_in: 3600,
            },
          },
        ],
        recorded,
      ),
    })

    const tokens = await service.exchangeCode({
      code: 'auth-code',
      verifier: 'verifier',
      redirectUri: REDIRECT,
    })

    expect(tokens.refresh_token).toBe('refresh')
    expect(recorded[0]?.url).toBe(GOOGLE_TOKEN_ENDPOINT)
    expect(recorded[0]?.fields.grant_type).toBe('authorization_code')
    expect(recorded[0]?.fields.code_verifier).toBe('verifier')
  })

  it('keeps every secret in the form body, never in the URL (SEC-5)', async () => {
    const recorded: { url: string; fields: Record<string, string> }[] = []
    const service = makeLiveGoogleOAuthService({
      clientId: CLIENT_ID,
      clientSecret: clientSecretFixture,
      transport: recordingTransport(
        [{ status: 200, body: { access_token: 'a' } }],
        recorded,
      ),
    })
    await service.exchangeCode({
      code: 'auth-code',
      verifier: 'verifier',
      redirectUri: REDIRECT,
    })
    for (const call of recorded) {
      expect(call.url).not.toContain(clientSecretFixture)
      expect(call.url).not.toContain('auth-code')
      expect(call.url).not.toContain('?')
    }
    expect(recorded[0]?.fields.client_secret).toBe(clientSecretFixture)
  })

  it('reports a malformed token body rather than trusting it', async () => {
    const service = makeLiveGoogleOAuthService({
      clientId: CLIENT_ID,
      clientSecret: clientSecretFixture,
      transport: recordingTransport([{ status: 200, body: '<html>' }], []),
    })
    await expect(
      service.exchangeCode({ code: 'c', verifier: 'v', redirectUri: REDIRECT }),
    ).rejects.toMatchObject({ kind: 'malformedResponse' })
  })

  it('surfaces a transport failure as offline', async () => {
    const service = makeLiveGoogleOAuthService({
      clientId: CLIENT_ID,
      clientSecret: clientSecretFixture,
      transport: {
        postForm: () => Promise.reject(new TypeError('Failed to fetch')),
      },
    })
    await expect(
      service.exchangeCode({ code: 'c', verifier: 'v', redirectUri: REDIRECT }),
    ).rejects.toMatchObject({ kind: 'offline' })
  })
})

describe('refreshing — the needsReconnect transition', () => {
  it('returns a fresh access token on the happy path', async () => {
    const recorded: { url: string; fields: Record<string, string> }[] = []
    const service = makeLiveGoogleOAuthService({
      clientId: CLIENT_ID,
      clientSecret: clientSecretFixture,
      transport: recordingTransport(
        [{ status: 200, body: { access_token: 'fresh', expires_in: 3600 } }],
        recorded,
      ),
    })
    expect((await service.refresh('stored-refresh')).access_token).toBe('fresh')
    expect(recorded[0]?.fields.grant_type).toBe('refresh_token')
  })

  it('maps invalid_grant to needsReconnect — a revoked or expired grant', async () => {
    // Acceptance criterion 2: this is the transition the banner is built on.
    const service = makeLiveGoogleOAuthService({
      clientId: CLIENT_ID,
      clientSecret: clientSecretFixture,
      transport: recordingTransport(
        [{ status: 400, body: { error: 'invalid_grant' } }],
        [],
      ),
    })
    await expect(service.refresh('revoked')).rejects.toMatchObject({
      kind: 'needsReconnect',
      recoverable: true,
    })
  })

  it('does NOT call every 400 a reconnect — a bad request is a bad request', async () => {
    // Telling a user their Google account was disconnected because a developer
    // sent a malformed body would be worse than useless.
    const service = makeLiveGoogleOAuthService({
      clientId: CLIENT_ID,
      clientSecret: clientSecretFixture,
      transport: recordingTransport(
        [{ status: 400, body: { error: 'invalid_request' } }],
        [],
      ),
    })
    await expect(service.refresh('x')).rejects.toMatchObject({ kind: 'server' })
  })

  it('never puts the refresh token in the URL (SEC-5)', async () => {
    const recorded: { url: string; fields: Record<string, string> }[] = []
    const service = makeLiveGoogleOAuthService({
      clientId: CLIENT_ID,
      clientSecret: clientSecretFixture,
      transport: recordingTransport(
        [{ status: 200, body: { access_token: 'a' } }],
        recorded,
      ),
    })
    await service.refresh('1//0gSuperSecretRefresh')
    for (const call of recorded) {
      expect(call.url).not.toContain('1//0gSuperSecretRefresh')
    }
  })
})

describe('revoking', () => {
  it('posts the token to Google’s revocation endpoint', async () => {
    const recorded: { url: string; fields: Record<string, string> }[] = []
    const service = makeLiveGoogleOAuthService({
      clientId: CLIENT_ID,
      clientSecret: clientSecretFixture,
      transport: recordingTransport([{ status: 200, body: {} }], recorded),
    })
    await service.revoke('token')
    expect(recorded[0]?.url).toBe(GOOGLE_REVOCATION_ENDPOINT)
    expect(recorded[0]?.fields.token).toBe('token')
  })

  it('treats a 400 as success — Google has already forgotten the token', async () => {
    // The desired end state either way; canon clears the keychain in a `defer`
    // for the same reason.
    const service = makeLiveGoogleOAuthService({
      clientId: CLIENT_ID,
      clientSecret: clientSecretFixture,
      transport: recordingTransport([{ status: 400, body: {} }], []),
    })
    await expect(service.revoke('already-gone')).resolves.toBeUndefined()
  })

  it('surfaces a 5xx as a server failure', async () => {
    const service = makeLiveGoogleOAuthService({
      clientId: CLIENT_ID,
      clientSecret: clientSecretFixture,
      transport: recordingTransport([{ status: 503, body: {} }], []),
    })
    await expect(service.revoke('t')).rejects.toMatchObject({ kind: 'server' })
  })
})

describe('the stubbed OAuth service', () => {
  it('records every call so a route spec can assert on the sequence', async () => {
    const calls: string[] = []
    const service = makeStubbedGoogleOAuthService({ calls })
    await service.exchangeCode({
      code: 'c',
      verifier: 'v',
      redirectUri: REDIRECT,
    })
    await service.refresh('r')
    await service.revoke('r')
    expect(calls).toEqual(['exchangeCode', 'refresh', 'revoke'])
  })

  it('drives the needsReconnect arm on demand', async () => {
    const service = makeStubbedGoogleOAuthService({
      refreshOutcome: 'invalidGrant',
    })
    await expect(service.refresh('r')).rejects.toMatchObject({
      kind: 'needsReconnect',
    })
  })

  it('drives the offline arm on demand', async () => {
    const service = makeStubbedGoogleOAuthService({ refreshOutcome: 'offline' })
    await expect(service.refresh('r')).rejects.toBeInstanceOf(TypeError)
  })

  it('can withhold a refresh token, as Google does without prompt=consent', async () => {
    const service = makeStubbedGoogleOAuthService({ refreshToken: null })
    const tokens = await service.exchangeCode({
      code: 'c',
      verifier: 'v',
      redirectUri: REDIRECT,
    })
    expect(tokens.refresh_token).toBeUndefined()
  })
})
