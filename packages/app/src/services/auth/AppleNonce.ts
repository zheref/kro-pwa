/**
 * Sign in with Apple's nonce pair — canon `randomNonceString` / `sha256Nonce`
 * in `Kro/Dependencies/SupabaseAuthService.swift`, on the **web** flow.
 *
 * ## Why there are two values and which one goes where
 *
 * The nonce is what binds Apple's identity token to *this* sign-in attempt: a
 * token replayed from another session carries the wrong nonce and is rejected.
 * Apple hashes what you give it into the token's `nonce` claim, so:
 *
 * - the **hashed** nonce goes to Apple (`AppleID.auth.init({ nonce })` in the
 *   web SDK, `ASAuthorizationAppleIDRequest.nonce` on iOS), and
 * - the **raw** nonce goes to Supabase alongside the returned id token, which
 *   hashes it again and compares.
 *
 * Getting these the wrong way round is the classic Sign-in-with-Apple defect and
 * it fails *closed* (every sign-in rejected), which is why the pair is produced
 * by one function that names both halves rather than by two call sites.
 *
 * ## Why this is Service tier
 *
 * It reads a CSPRNG. `UZF-10` and `UZF-11` forbid randomness in a Shifter or a
 * Selector, and a Producer takes it from an injected Service (`UZF-16`) — so the
 * challenge is minted by `AuthService.beginAppleSignIn()` and the raw nonce is
 * carried in slice state only for the length of one attempt.
 *
 * ## Web Crypto, not a polyfill
 *
 * `crypto.getRandomValues` and `crypto.subtle.digest` are the platform's, and
 * are present in every browser this app targets and in Node ≥ 20 as a global.
 * There is no `Math.random` fallback on purpose: silently degrading a security
 * primitive to a non-CSPRNG is worse than failing, so a runtime without Web
 * Crypto gets a thrown error the Service maps to a typed exception.
 */

/**
 * Canon's charset, ported **verbatim** — including its missing `W` in the
 * uppercase run (`…UVXYZ…`). It is a 63-symbol alphabet rather than 64, which
 * costs a negligible fraction of a bit per character and is not worth an
 * unnecessary divergence from the string the iOS client uses; noted here so
 * nobody "fixes" it without knowing it was deliberate.
 */
export const APPLE_NONCE_CHARSET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._'

/** Canon's `length: Int = 32`. */
export const APPLE_NONCE_LENGTH = 32

/** The pair one Apple sign-in attempt needs. */
export interface AppleSignInChallenge {
  /** Sent to Supabase with the id token. Never leaves this device otherwise. */
  readonly rawNonce: string
  /** Sent to Apple. The SHA-256 of `rawNonce`, lowercase hex. */
  readonly hashedNonce: string
}

/** The Web Crypto surface this module needs, named so a test can supply it. */
export interface CryptoProvider {
  getRandomValues<T extends Uint8Array>(array: T): T
  readonly subtle: { digest(algorithm: string, data: BufferSource): Promise<ArrayBuffer> }
}

/** The ambient Web Crypto, or `null` in a runtime that has none. */
export const ambientCrypto = (): CryptoProvider | null => {
  const host = globalThis as { readonly crypto?: unknown }
  const candidate = host.crypto as CryptoProvider | undefined
  if (candidate === undefined) return null
  if (typeof candidate.getRandomValues !== 'function') return null
  if (typeof candidate.subtle?.digest !== 'function') return null
  return candidate
}

/**
 * `randomNonceString(length:)`.
 *
 * Canon draws random bytes and keeps only those below `charset.count`, which is
 * modulo-bias-free rejection sampling; the same rejection is kept here rather
 * than the shorter `byte % charset.length`, which would skew the distribution
 * toward the first `256 % 63` symbols.
 */
export const randomNonceString = (
  crypto: CryptoProvider,
  length: number = APPLE_NONCE_LENGTH,
): string => {
  let result = ''
  while (result.length < length) {
    const batch = crypto.getRandomValues(new Uint8Array(16))
    for (const byte of batch) {
      if (result.length >= length) break
      if (byte >= APPLE_NONCE_CHARSET.length) continue
      result += APPLE_NONCE_CHARSET.charAt(byte)
    }
  }
  return result
}

/** `sha256Nonce(_:)` — lowercase hex, exactly as canon formats it (`%02x`). */
export const sha256Nonce = async (
  crypto: CryptoProvider,
  input: string,
): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/** Mints one attempt's pair. */
export const makeAppleSignInChallenge = async (
  crypto: CryptoProvider,
  length: number = APPLE_NONCE_LENGTH,
): Promise<AppleSignInChallenge> => {
  const rawNonce = randomNonceString(crypto, length)
  return { rawNonce, hashedNonce: await sha256Nonce(crypto, rawNonce) }
}
