/**
 * Where the Google **refresh token** lives on the web — and why it lives there.
 *
 * ## The decision, and the tradeoff
 *
 * Canon persists the token envelope in the platform keystore
 * (`GoogleOAuthConfig.tokensKeychainKey`). A browser has no keystore, and this
 * app deploys as serverless Next.js with no session store of its own, so the
 * two honest options were:
 *
 * | Option | What it is | Cost |
 * |---|---|---|
 * | **Encrypted httpOnly cookie** *(chosen)* | The refresh token, AES-GCM sealed with a server-only key, carried in a `HttpOnly; Secure; SameSite=Lax` cookie | Bound to **one browser**. Connecting on the laptop does not connect the phone. Cookie size is bounded (~4 KB) — fine for one token. |
 * | Kro Cloud table | A `google_credentials` row keyed by the Supabase user | Multi-device, revocable server-side, auditable — but the schema is **KroApple-owned** (`zheref/KroApple`, stack-matrix cross-cutting rule) and this repo writes no migration. Not available to this issue. |
 *
 * The cookie is chosen because it is the simplest shape that is actually
 * honest: it needs no schema this repo may not author, it survives a serverless
 * cold start (there is no server state to lose), and it fails safe — losing the
 * key or the cookie means "reconnect", never "silently act as someone else".
 * **The named future path is the cloud table**: when KroApple's schema gains a
 * credentials table, `GoogleTokenVault` is the seam that changes and nothing
 * above it does, because every caller already speaks `seal`/`open` rather than
 * `cookie`.
 *
 * ## Why the token is sealed rather than merely `HttpOnly`
 *
 * `HttpOnly` keeps JavaScript out of the cookie; it does nothing about anyone
 * who can read the raw HTTP store — a shared machine's profile directory, a
 * logging proxy, a crash dump. A refresh token is a long-lived credential, so
 * it is encrypted at rest with a key that exists only in the server's
 * environment (`GOOGLE_CALENDAR_TOKEN_KEY`). AES-GCM is authenticated, so a
 * tampered cookie fails to open rather than decrypting to garbage that the
 * caller then sends to Google.
 *
 * ## SEC-5, structurally
 *
 * Nothing here logs, and nothing here builds a URL. The sealed value is
 * base64url, so it is safe as a cookie value, but it is never *put* in a URL by
 * any caller — the vault has no function that would. `open` answers `null` on
 * every failure (wrong key, tampered payload, truncated cookie) rather than
 * throwing with the ciphertext in the message.
 */

/** How a caller stores and retrieves the credential. One seam, two bindings. */
export interface GoogleTokenVault {
  /** Encrypt `plaintext` into an opaque, URL-safe string. */
  seal(plaintext: string): Promise<string>
  /** Decrypt, or `null` when the value is absent, tampered, or from another key. */
  open(sealed: string): Promise<string | null>
}

/**
 * The `crypto.subtle` surface this module needs — injected, so a test can prove
 * the failure paths without a real key and so this file names its dependency
 * rather than reaching for a global (`RC-6` in spirit).
 */
export interface CryptoSource {
  readonly subtle: SubtleCrypto
  getRandomValues<T extends ArrayBufferView>(array: T): T
}

/** The ambient Web Crypto implementation — present in browsers and Node ≥ 18. */
export const ambientCryptoSource = (): CryptoSource | null => {
  const host = globalThis as { readonly crypto?: Crypto }
  const source = host.crypto
  if (source === undefined) return null
  if (typeof source.subtle !== 'object' || source.subtle === null) return null
  return {
    subtle: source.subtle,
    getRandomValues: (array) => source.getRandomValues(array),
  }
}

const AES_GCM = 'AES-GCM'
/** 96 bits — the IV size AES-GCM is specified for. */
const IV_BYTES = 12

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

/** Base64url without padding — safe in a cookie value and in a URL. */
export const toBase64Url = (bytes: Uint8Array): string => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * `null` rather than a throw on anything that is not base64url.
 *
 * The return type names its backing buffer explicitly. A bare `Uint8Array` is
 * `Uint8Array<ArrayBufferLike>`, which `SubtleCrypto` will not accept as a
 * `BufferSource` because `ArrayBufferLike` admits `SharedArrayBuffer`.
 */
export const fromBase64Url = (value: string): Uint8Array<ArrayBuffer> | null => {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) return null
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=')
  try {
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return bytes
  } catch {
    return null
  }
}

/**
 * Derive the AES key from the configured secret.
 *
 * SHA-256 of the raw secret gives exactly 256 bits from a secret of any length,
 * so an operator may paste `openssl rand -base64 32` output (44 characters) or
 * anything else without the key silently being truncated. This is a *key
 * derivation for a machine-generated secret*, not a password hash: the input is
 * required to be high-entropy, which is why a KDF with a work factor (PBKDF2,
 * scrypt) would add cost without adding safety here.
 */
const importKey = async (
  crypto: CryptoSource,
  secret: string,
): Promise<CryptoKey> => {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(secret))
  return crypto.subtle.importKey('raw', digest, AES_GCM, false, [
    'encrypt',
    'decrypt',
  ])
}

/**
 * The production binding.
 *
 * The key is derived once per vault rather than per call, and the derivation
 * promise is cached — a route handler seals or opens at most twice per request,
 * and re-hashing the secret each time would be pure overhead. The cached value
 * is a `CryptoKey` handle, never the secret itself.
 */
export const makeWebCryptoTokenVault = (params: {
  readonly secret: string
  readonly crypto?: CryptoSource | null
}): GoogleTokenVault => {
  const crypto = params.crypto ?? ambientCryptoSource()
  let cachedKey: Promise<CryptoKey> | null = null

  const key = (): Promise<CryptoKey> => {
    if (crypto === null) {
      return Promise.reject(new Error('No Web Crypto implementation available.'))
    }
    cachedKey ??= importKey(crypto, params.secret)
    return cachedKey
  }

  return {
    async seal(plaintext) {
      if (crypto === null) {
        throw new Error('No Web Crypto implementation available.')
      }
      // Declared before it is filled so its type stays `Uint8Array<ArrayBuffer>`
      // — `getRandomValues`' generic widens to `ArrayBufferLike`, which
      // `SubtleCrypto` will not accept as a `BufferSource`.
      const iv = new Uint8Array(IV_BYTES)
      crypto.getRandomValues(iv)
      const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt(
          { name: AES_GCM, iv },
          await key(),
          textEncoder.encode(plaintext),
        ),
      )
      const packed = new Uint8Array(iv.length + ciphertext.length)
      packed.set(iv, 0)
      packed.set(ciphertext, iv.length)
      return toBase64Url(packed)
    },

    async open(sealed) {
      if (crypto === null) return null
      const packed = fromBase64Url(sealed)
      // A payload shorter than IV + tag cannot be one of ours. Rejecting it
      // here keeps `subtle.decrypt` from being handed a zero-length body.
      if (packed === null || packed.length <= IV_BYTES) return null
      try {
        const plaintext = await crypto.subtle.decrypt(
          { name: AES_GCM, iv: packed.subarray(0, IV_BYTES) },
          await key(),
          packed.subarray(IV_BYTES),
        )
        return textDecoder.decode(plaintext)
      } catch {
        // Wrong key, tampered ciphertext, or a cookie from an older secret.
        // All three mean the same thing to the caller: reconnect.
        return null
      }
    },
  }
}

/**
 * The deterministic double (`RC-33`).
 *
 * Reversible and **not** encryption — that is the point. A suite asserting that
 * a route sets a cookie, or that the cookie's value is not the raw token, needs
 * to be able to read it back without a key ceremony; a suite asserting that the
 * *real* vault is authenticated uses `makeWebCryptoTokenVault`, which runs on
 * Node's Web Crypto under Vitest with no mocking at all.
 *
 * The prefix makes an accidental use in production obvious the moment anyone
 * looks at a cookie.
 */
export const STUBBED_VAULT_PREFIX = 'stub.'

export const makeStubbedTokenVault = (): GoogleTokenVault => ({
  seal: async (plaintext) =>
    `${STUBBED_VAULT_PREFIX}${toBase64Url(textEncoder.encode(plaintext))}`,
  open: async (sealed) => {
    if (!sealed.startsWith(STUBBED_VAULT_PREFIX)) return null
    const bytes = fromBase64Url(sealed.slice(STUBBED_VAULT_PREFIX.length))
    return bytes === null ? null : textDecoder.decode(bytes)
  },
})

export const stubbedTokenVault: GoogleTokenVault = makeStubbedTokenVault()
