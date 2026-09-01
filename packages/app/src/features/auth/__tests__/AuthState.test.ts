import { describe, expect, it } from 'vitest'
import {
  AuthFlow,
  AuthMode,
  MINIMUM_PASSWORD_LENGTH,
  initialAuthState,
} from '../AuthState'

describe('the declared vocabulary', () => {
  it("offers exactly canon's two modes — sign in and create account", () => {
    expect(Object.values(AuthMode)).toEqual(['signIn', 'signUp'])
  })

  it('names every provider flow a surface can spin, plus the silent launch restore', () => {
    expect(Object.values(AuthFlow)).toEqual([
      'emailPassword',
      'apple',
      'google',
      'restore',
    ])
  })

  it("keeps canon's six-character password minimum", () => {
    expect(MINIMUM_PASSWORD_LENGTH).toBe(6)
  })
})

describe('the initial state', () => {
  it('starts with the session UNKNOWN, not signed out — the shell must not flash', () => {
    expect(initialAuthState.session).toEqual({ kind: 'unknown' })
  })

  it('starts in sign-in mode with an empty form', () => {
    expect(initialAuthState.mode).toBe(AuthMode.signIn)
    expect(initialAuthState.form).toEqual({ email: '', password: '', name: '' })
  })

  it('starts with both sync footers idle, so nothing claims to have synced', () => {
    expect(initialAuthState.settingsSync).toEqual({ kind: 'idle' })
    expect(initialAuthState.endeavorSync).toEqual({ kind: 'idle' })
  })

  it('holds no nonce and no pending platform intent', () => {
    expect(initialAuthState.appleRawNonce).toBeNull()
    expect(initialAuthState.pendingSignOutIntents).toEqual([])
  })

  it('carries no credential-shaped field at all — the shape itself forbids one', () => {
    const forbidden = [
      'token',
      'accessToken',
      'refreshToken',
      'password',
      'secret',
    ]
    for (const key of Object.keys(initialAuthState)) {
      expect(forbidden).not.toContain(key)
    }
    // `form.password` is the user's own input for one submit and is cleared by
    // `withSignedIn`; nothing else in the slice may hold a credential.
    expect(Object.keys(initialAuthState.form)).toEqual([
      'email',
      'password',
      'name',
    ])
  })
})
