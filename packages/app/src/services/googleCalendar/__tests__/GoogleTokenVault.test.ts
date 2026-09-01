import { describe, expect, it } from 'vitest'
import {
  STUBBED_VAULT_PREFIX,
  ambientCryptoSource,
  fromBase64Url,
  makeStubbedTokenVault,
  makeWebCryptoTokenVault,
  toBase64Url,
} from '../GoogleTokenVault'

/**
 * These run against **real** Web Crypto — Node ≥ 18 provides it, so nothing is
 * mocked. Mocking the cipher would prove only that a mock was called; the
 * properties that matter here (authenticated, key-bound, non-reversible without
 * the key) are properties of AES-GCM itself.
 */
const REFRESH_TOKEN = 'not-a-real-refresh-token-1//0gAbCdEf'

describe('sealing a credential into a cookie value', () => {
  it('round-trips the token with the same key', () => {
    const vault = makeWebCryptoTokenVault({ secret: 'key-material-one' })
    return vault
      .seal(REFRESH_TOKEN)
      .then((sealed) => vault.open(sealed))
      .then((opened) => expect(opened).toBe(REFRESH_TOKEN))
  })

  it('never stores the token in the clear (SEC-5)', async () => {
    const vault = makeWebCryptoTokenVault({ secret: 'key-material-one' })
    const sealed = await vault.seal(REFRESH_TOKEN)
    expect(sealed).not.toContain(REFRESH_TOKEN)
    expect(sealed).not.toContain('1//0gAbCdEf')
  })

  it('produces a different value each time, so a cookie is not a fingerprint', async () => {
    // AES-GCM with a fresh IV per seal. Two identical tokens must not produce
    // identical cookies.
    const vault = makeWebCryptoTokenVault({ secret: 'key-material-one' })
    const first = await vault.seal(REFRESH_TOKEN)
    const second = await vault.seal(REFRESH_TOKEN)
    expect(first).not.toBe(second)
    expect(await vault.open(second)).toBe(REFRESH_TOKEN)
  })

  it('is URL-safe, so it survives a cookie value unescaped', async () => {
    const vault = makeWebCryptoTokenVault({ secret: 'key-material-one' })
    const sealed = await vault.seal(REFRESH_TOKEN)
    expect(sealed).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('handles a long token without truncating it', async () => {
    const vault = makeWebCryptoTokenVault({ secret: 'key-material-one' })
    const long = 'x'.repeat(2048)
    expect(await vault.open(await vault.seal(long))).toBe(long)
  })

  it('handles a non-ASCII payload', async () => {
    const vault = makeWebCryptoTokenVault({ secret: 'key-material-one' })
    const value = 'refresh·токен·🌸'
    expect(await vault.open(await vault.seal(value))).toBe(value)
  })
})

describe('refusing to open what it did not seal', () => {
  it('answers null for a different key — a rotated GOOGLE_CALENDAR_TOKEN_KEY', async () => {
    const sealed = await makeWebCryptoTokenVault({ secret: 'old-key' }).seal(
      REFRESH_TOKEN,
    )
    const opened = await makeWebCryptoTokenVault({ secret: 'new-key' }).open(
      sealed,
    )
    expect(opened).toBeNull()
  })

  it('answers null for a tampered ciphertext rather than decrypting garbage', async () => {
    // The authenticated half of AES-GCM: this is why the cookie is sealed
    // rather than merely HttpOnly.
    const vault = makeWebCryptoTokenVault({ secret: 'key-material-one' })
    const sealed = await vault.seal(REFRESH_TOKEN)
    const flipped =
      `${sealed.slice(0, -2)}${sealed.endsWith('A') ? 'B' : 'A'}=`.replace(
        '=',
        '',
      )
    expect(await vault.open(flipped)).toBeNull()
  })

  it('answers null for a truncated payload rather than calling decrypt on it', async () => {
    const vault = makeWebCryptoTokenVault({ secret: 'key-material-one' })
    expect(await vault.open('AAAA')).toBeNull()
    expect(await vault.open('')).toBeNull()
  })

  it('answers null for a value that is not base64url at all', async () => {
    const vault = makeWebCryptoTokenVault({ secret: 'key-material-one' })
    expect(await vault.open('not base64!!')).toBeNull()
  })

  it('never throws with the ciphertext in the message', async () => {
    // A throw carrying the payload would put the credential into whatever
    // catches it. Every failure is `null` instead.
    const vault = makeWebCryptoTokenVault({ secret: 'key-material-one' })
    await expect(vault.open('AAAAAAAAAAAAAAAAAAAA')).resolves.toBeNull()
  })
})

describe('base64url helpers', () => {
  it('round-trips arbitrary bytes', () => {
    const bytes = new Uint8Array([0, 1, 250, 251, 252, 253, 254, 255])
    expect(Array.from(fromBase64Url(toBase64Url(bytes)) ?? [])).toEqual(
      Array.from(bytes),
    )
  })

  it('emits no padding and no + or /', () => {
    const bytes = new Uint8Array([251, 255, 190, 239])
    const encoded = toBase64Url(bytes)
    expect(encoded).not.toContain('=')
    expect(encoded).not.toContain('+')
    expect(encoded).not.toContain('/')
  })

  it('refuses a string containing non-alphabet characters', () => {
    expect(fromBase64Url('abc$def')).toBeNull()
  })

  it('accepts the empty string as zero bytes', () => {
    expect(fromBase64Url('')?.length).toBe(0)
  })
})

describe('the stubbed vault', () => {
  it('round-trips so a route spec can read back what it wrote', () => {
    const vault = makeStubbedTokenVault()
    return vault
      .seal('token')
      .then((sealed) => vault.open(sealed))
      .then((opened) => expect(opened).toBe('token'))
  })

  it('marks itself, so an accidental production use is visible in a cookie', async () => {
    const sealed = await makeStubbedTokenVault().seal('token')
    expect(sealed.startsWith(STUBBED_VAULT_PREFIX)).toBe(true)
  })

  it('refuses a value it did not write', async () => {
    expect(
      await makeStubbedTokenVault().open('someone-elses-cookie'),
    ).toBeNull()
  })
})

describe('the ambient crypto source', () => {
  it('is available under the test runtime, so nothing here is mocked', () => {
    expect(ambientCryptoSource()).not.toBeNull()
  })
})
