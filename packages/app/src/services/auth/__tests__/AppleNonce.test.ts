import { describe, expect, it } from 'vitest'
import {
  APPLE_NONCE_CHARSET,
  APPLE_NONCE_LENGTH,
  type CryptoProvider,
  ambientCrypto,
  makeAppleSignInChallenge,
  randomNonceString,
  sha256Nonce,
} from '../AppleNonce'

const realCrypto = (): CryptoProvider => {
  const crypto = ambientCrypto()
  if (crypto === null) throw new Error('this runtime has no Web Crypto')
  return crypto
}

/** A crypto double that hands out a fixed byte sequence, over and over. */
const scriptedCrypto = (bytes: readonly number[]): CryptoProvider => {
  let cursor = 0
  return {
    getRandomValues: <T extends Uint8Array>(array: T): T => {
      for (let index = 0; index < array.length; index += 1) {
        array[index] = bytes[cursor % bytes.length] as number
        cursor += 1
      }
      return array
    },
    subtle: realCrypto().subtle,
  }
}

describe('randomNonceString', () => {
  it('produces exactly the requested length (canon default is 32)', () => {
    expect(randomNonceString(realCrypto()).length).toBe(APPLE_NONCE_LENGTH)
    expect(randomNonceString(realCrypto(), 8).length).toBe(8)
  })

  it('draws only from canon charset, so the nonce matches what the iOS client sends', () => {
    const nonce = randomNonceString(realCrypto(), 128)
    for (const character of nonce) {
      expect(APPLE_NONCE_CHARSET).toContain(character)
    }
  })

  it('rejects bytes at or above the charset size rather than folding them with a modulo', () => {
    // 200 and 255 are both out of range for a 63-symbol charset. Folding them
    // would bias the distribution toward the first few symbols; rejection
    // sampling drops them and keeps drawing.
    const nonce = randomNonceString(scriptedCrypto([200, 255, 0, 1]), 4)
    expect(nonce).toBe(APPLE_NONCE_CHARSET.charAt(0) + APPLE_NONCE_CHARSET.charAt(1) + APPLE_NONCE_CHARSET.charAt(0) + APPLE_NONCE_CHARSET.charAt(1))
  })

  it('does not repeat itself across attempts (a fresh nonce per sign-in)', () => {
    const first = randomNonceString(realCrypto())
    const second = randomNonceString(realCrypto())
    expect(first).not.toBe(second)
  })
})

describe('sha256Nonce', () => {
  it('produces the known SHA-256 of an empty string, lowercase hex', async () => {
    expect(await sha256Nonce(realCrypto(), '')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    )
  })

  it("produces the known SHA-256 of 'abc'", async () => {
    expect(await sha256Nonce(realCrypto(), 'abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  it('is 64 lowercase hex characters for any input, so Apple always gets a well-formed nonce', async () => {
    const digest = await sha256Nonce(realCrypto(), randomNonceString(realCrypto()))
    expect(digest).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('makeAppleSignInChallenge', () => {
  it('returns a pair whose hashed half is the SHA-256 of the raw half', async () => {
    const challenge = await makeAppleSignInChallenge(realCrypto())
    expect(challenge.hashedNonce).toBe(
      await sha256Nonce(realCrypto(), challenge.rawNonce),
    )
  })

  it('never returns the same value twice for the two halves — swapping them fails closed', async () => {
    const challenge = await makeAppleSignInChallenge(realCrypto())
    expect(challenge.rawNonce).not.toBe(challenge.hashedNonce)
  })

  it('mints a distinct pair per attempt, so a token cannot be replayed into the next one', async () => {
    const first = await makeAppleSignInChallenge(realCrypto())
    const second = await makeAppleSignInChallenge(realCrypto())
    expect(first.rawNonce).not.toBe(second.rawNonce)
  })
})

describe('ambientCrypto', () => {
  it('finds Web Crypto in this runtime', () => {
    expect(ambientCrypto()).not.toBeNull()
  })
})
