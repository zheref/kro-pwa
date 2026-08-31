import { userInitials } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { authSlice } from '../AuthFeature'
import { AuthMocks, authUserMocks } from '../AuthMocks'

describe('the user fixtures', () => {
  it('ships the seven-variant spread a domain model owes (RC-13 shape, scoped to what auth needs)', () => {
    // Four user variants plus the state variants below; the user set covers
    // named / Apple / Google / unnamed, which is the spread this feature reads.
    expect(Object.keys(authUserMocks).length).toBeGreaterThanOrEqual(4)
  })

  it('never carries a credential — the User shape has no field that could hold one', () => {
    // Asserted on the *keys*, not on a substring of the serialised value: the
    // provider raw value is legitimately `email_password`, and a naive
    // substring check would flag it while missing an actual `accessToken`.
    const forbiddenKeys = ['token', 'accesstoken', 'refreshtoken', 'password', 'secret']
    for (const user of Object.values(authUserMocks)) {
      for (const key of Object.keys(user)) {
        expect(forbiddenKeys).not.toContain(key.toLowerCase())
      }
    }
  })

  it('uses only example.com addresses, so no real account can leak into a fixture', () => {
    for (const user of Object.values(authUserMocks)) {
      for (const email of user.emails) expect(email.endsWith('@example.com')).toBe(true)
    }
  })

  it('covers the unnamed case, where initials fall back to the primary email', () => {
    expect(userInitials(authUserMocks.unnamed)).toBe('S')
    expect(userInitials(authUserMocks.typical)).toBe('AL')
  })

  it('covers an account with more than one connected provider', () => {
    expect(authUserMocks.google.connectedProviders.length).toBeGreaterThan(1)
  })
})

describe('the state fixtures', () => {
  it('are all built from the slice own initial state, never hand-assembled', () => {
    const base = authSlice.getInitialState()
    for (const state of Object.values(AuthMocks)) {
      expect(Object.keys(state).sort()).toEqual(Object.keys(base).sort())
    }
  })

  it('cover the whole session lifecycle, so no arm is untested for lack of a fixture', () => {
    const kinds = Object.values(AuthMocks).map((state) => state.session.kind)
    for (const kind of ['unknown', 'signedOut', 'authenticating', 'signedIn', 'failed']) {
      expect(kinds).toContain(kind)
    }
  })

  it('cover the dialog shown and resolving, which are the two states a surface renders', () => {
    expect(AuthMocks.localDataDialog.localData.kind).toBe('shown')
    expect(AuthMocks.localDataResolving.localData.kind).toBe('resolving')
  })

  it('cover the endeavor engine as it ships (disabled) as well as a completed sweep', () => {
    expect(AuthMocks.endeavorSyncDisabled.endeavorSync.kind).toBe('disabled')
    expect(AuthMocks.endeavorSyncCompleted.endeavorSync).toMatchObject({
      kind: 'completed',
      deleted: 1,
    })
  })

  it('cover both settings footers a signed-in user can see', () => {
    expect(AuthMocks.settingsSynced.settingsSync.kind).toBe('synced')
    expect(AuthMocks.settingsOffline.settingsSync.kind).toBe('offline')
  })

  it('cover a sign-out that still owes the platform tier its withdrawal', () => {
    expect(AuthMocks.signedOutWithPendingIntents.pendingSignOutIntents).toHaveLength(1)
  })

  it('never carry a nonce, which belongs to one attempt and not to a fixture', () => {
    for (const state of Object.values(AuthMocks)) {
      expect(state.appleRawNonce).toBeNull()
    }
  })
})
