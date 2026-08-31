/**
 * The auth Producers, driven through the real slice against stubbed Services
 * injected via `extra` (`RC-54`, `RC-35`). No suite here mocks `fetch`, and
 * none reaches the network — the stubbed transport records every call it is
 * given, and the assertions read that record.
 */
import {
  FeatureFlagState,
  FeatureFlags,
  type Result,
  type UserProfileRecord,
  cloudSyncOptions,
  epochMillisFromDate,
  makeFeatureFlagAssignment,
  makeHardcodedFeatureFlagService,
  makePreferences,
  preferenceStorageKey,
} from '@kro/core'
import { endeavorMocks } from '@kro/core/mocks'
import { describe, expect, it } from 'vitest'
import { type ThunkExtra, makeStore, stubbedThunkExtra } from '../../../library/store'
import {
  authFixtureUsers,
  makeStubbedAuthService,
} from '../../../services/auth/AuthService'
import {
  makeInMemoryLocalStore,
  type InMemoryLocalStoreSeed,
} from '../../../services/localStore/InMemoryLocalStore'
import { signOutWipe } from '../../../services/localStore/signOutWipe'
import { makeStubbedEndeavorCloudTransport } from '../../../services/sync/EndeavorCloudTransport'
import {
  makeEndeavorSyncService,
  supabaseHostingGate,
} from '../../../services/sync/EndeavorSyncService'
import { makeStubbedSettingsSyncService } from '../../../services/sync/SettingsSyncService'
import { AuthExceptions } from '../AuthException'
import type { CloudSettingEntry } from '../CloudSettings'
import {
  beginAppleSignInThunk,
  observeAuthState,
  resolveLocalDataChoiceThunk,
  restoreSessionThunk,
  signInWithAppleThunk,
  signInWithEmailThunk,
  signOutThunk,
  signUpWithEmailThunk,
  startOAuthRedirectThunk,
  syncSettingsThunk,
  synchronizeEndeavorsThunk,
} from '../AuthProducer'
import { SettingsSyncTrigger } from '../CloudSettings'
import { LocalDataChoice } from '../LocalDataDialog'
import { signOutIntents } from '../SignOutIntents'

const NOW = new Date('2026-08-31T10:00:00.000Z')
const OWNER = authFixtureUsers.email.id

const boolCloudOption = cloudSyncOptions.find((option) => option.type.kind === 'bool')

const profileRecord = (id: string): UserProfileRecord => ({
  id,
  name: 'Ada Lovelace',
  username: null,
  emailsCsv: 'ada@example.com',
  birthDate: null,
  nationality: null,
  loginKind: 'email_password',
  connectedServicesCsv: null,
  avatarUrl: null,
  createdAt: NOW,
  updatedAtEpochMillis: epochMillisFromDate(NOW),
})

interface HarnessOptions {
  readonly seed?: InMemoryLocalStoreSeed
  readonly authService?: ReturnType<typeof makeStubbedAuthService>
  readonly settingsStored?: readonly CloudSettingEntry[]
  readonly settingsPullFailure?: unknown
  readonly settingsPushFailure?: unknown
  readonly cloudEnabled?: boolean
}

const harness = (options: HarnessOptions = {}) => {
  const localStore = makeInMemoryLocalStore(options.seed ?? {})
  const authService = options.authService ?? makeStubbedAuthService()
  const settingsSync = makeStubbedSettingsSyncService({
    stored: options.settingsStored,
    pullFailure: options.settingsPullFailure,
    pushFailure: options.settingsPushFailure,
  })
  const transport = makeStubbedEndeavorCloudTransport()
  const featureFlags = makeHardcodedFeatureFlagService({
    overrides:
      options.cloudEnabled === true
        ? [
            makeFeatureFlagAssignment(
              FeatureFlags.supabaseHosting,
              FeatureFlagState.enabled,
            ),
          ]
        : [],
  })
  const extra: ThunkExtra = {
    ...stubbedThunkExtra,
    localStore,
    signOutWipe,
    featureFlags,
    authService,
    settingsSync,
    endeavorSync: makeEndeavorSyncService({
      localStore,
      transport,
      isCloudEnabled: supabaseHostingGate(featureFlags),
    }),
  }
  return { store: makeStore(extra), localStore, authService, settingsSync, transport }
}

// ---------------------------------------------------------------------------
// restoreSessionThunk — the launch restore
// ---------------------------------------------------------------------------

describe('restoreSessionThunk', () => {
  it('resolves nobody on a fresh browser and settles the session to signed out', async () => {
    const { store } = harness()

    await store.dispatch(restoreSessionThunk({ now: NOW }))

    expect(store.getState().auth.session).toEqual({ kind: 'signedOut' })
  })

  it('signs the account in when a session is persisted (a reload while signed in)', async () => {
    const { store } = harness({
      authService: makeStubbedAuthService({ initialUser: authFixtureUsers.email }),
    })

    await store.dispatch(restoreSessionThunk({ now: NOW }))

    expect(store.getState().auth.session).toEqual({
      kind: 'signedIn',
      user: authFixtureUsers.email,
    })
  })

  it('PULLS settings on launch — the only moment besides sign-in that a pull overwrites local', async () => {
    const { store, settingsSync } = harness({
      authService: makeStubbedAuthService({ initialUser: authFixtureUsers.email }),
    })

    await store.dispatch(restoreSessionThunk({ now: NOW }))

    expect(settingsSync.pullCount()).toBe(1)
  })

  it('pulls nothing when nobody is signed in — a signed-out launch touches no cloud', async () => {
    const { store, settingsSync, transport } = harness()

    await store.dispatch(restoreSessionThunk({ now: NOW }))

    expect(settingsSync.pullCount()).toBe(0)
    expect(transport.calls()).toEqual([])
  })

  it('surfaces a transport failure as a typed exception rather than throwing', async () => {
    const { store } = harness({
      authService: makeStubbedAuthService({
        failures: { restoreSession: new TypeError('Failed to fetch') },
      }),
    })

    await store.dispatch(restoreSessionThunk({ now: NOW }))

    expect(store.getState().auth.session).toEqual({
      kind: 'failed',
      exception: AuthExceptions.networkUnavailable(),
    })
  })
})

// ---------------------------------------------------------------------------
// The email/password arms
// ---------------------------------------------------------------------------

describe('signInWithEmailThunk', () => {
  it('signs in and settles the session when there is no local data', async () => {
    const { store } = harness()

    await store.dispatch(
      signInWithEmailThunk({ email: 'ada@example.com', password: 'secret', now: NOW }),
    )

    expect(store.getState().auth.session.kind).toBe('signedIn')
    expect(store.getState().auth.localData).toEqual({ kind: 'hidden' })
  })

  it('OPENS the existing-local-data dialog when anonymous rows are present', async () => {
    const anonymous = {
      ...endeavorMocks.plannedTask,
    }
    const { store } = harness({
      seed: {
        endeavors: [
          {
            id: anonymous.id,
            title: anonymous.title,
            kind: anonymous.kind,
            status: anonymous.status,
            isDraft: false,
            tagsCsv: '',
            shadowsJson: null,
            repeatConfigJson: null,
            start: null,
            due: null,
            duration: null,
            minimumDuration: null,
            maximumDuration: null,
            projectId: null,
            ownerUserId: null,
            ownerGroupId: null,
            completed: null,
            createdAt: NOW,
            updatedAt: null,
            value: null,
            effort: null,
            expiry: null,
            associatedColor: null,
            sessionPoints: null,
            updatedAtEpochMillis: epochMillisFromDate(NOW),
            lastSyncedAtEpochMillis: null,
            deletedAtEpochMillis: null,
          },
        ],
      },
    })

    await store.dispatch(
      signInWithEmailThunk({ email: 'ada@example.com', password: 'secret', now: NOW }),
    )

    expect(store.getState().auth.localData).toMatchObject({
      kind: 'shown',
      anonymousCount: 1,
    })
  })

  it('HOLDS the cloud follow-ups until the dialog is answered — Clear Everything must not race a pull', async () => {
    const { store, settingsSync } = harness({
      seed: {
        endeavors: [
          {
            id: 'anon',
            title: 'Local only',
            kind: 'task',
            status: 'planned',
            isDraft: false,
            tagsCsv: '',
            shadowsJson: null,
            repeatConfigJson: null,
            start: null,
            due: null,
            duration: null,
            minimumDuration: null,
            maximumDuration: null,
            projectId: null,
            ownerUserId: null,
            ownerGroupId: null,
            completed: null,
            createdAt: NOW,
            updatedAt: null,
            value: null,
            effort: null,
            expiry: null,
            associatedColor: null,
            sessionPoints: null,
            updatedAtEpochMillis: epochMillisFromDate(NOW),
            lastSyncedAtEpochMillis: null,
            deletedAtEpochMillis: null,
          },
        ],
      },
    })

    await store.dispatch(
      signInWithEmailThunk({ email: 'ada@example.com', password: 'secret', now: NOW }),
    )

    expect(settingsSync.pullCount()).toBe(0)
  })

  it('refuses an empty form before it ever reaches the service', async () => {
    const { store, authService } = harness()

    await store.dispatch(signInWithEmailThunk({ email: '', password: '', now: NOW }))

    expect(authService.operations()).toEqual([])
    expect(store.getState().auth.session).toMatchObject({
      kind: 'failed',
      exception: { kind: 'incompleteForm' },
    })
  })

  it('surfaces wrong credentials as the typed case, not as a generic failure', async () => {
    const { store } = harness({
      authService: makeStubbedAuthService({
        failures: { signInWithEmail: new Error('Invalid login credentials') },
      }),
    })

    await store.dispatch(
      signInWithEmailThunk({ email: 'ada@example.com', password: 'wrong', now: NOW }),
    )

    expect(store.getState().auth.session).toMatchObject({
      kind: 'failed',
      exception: { kind: 'invalidCredentials' },
    })
  })
})

describe('signUpWithEmailThunk', () => {
  it('creates the account and settles the session', async () => {
    const { store } = harness()

    await store.dispatch(
      signUpWithEmailThunk({
        email: 'new@example.com',
        password: 'correct-horse',
        name: 'New User',
        now: NOW,
      }),
    )

    expect(store.getState().auth.session).toMatchObject({
      kind: 'signedIn',
      user: { name: 'New User' },
    })
  })

  it('refuses a missing name before reaching the service', async () => {
    const { store, authService } = harness()

    await store.dispatch(
      signUpWithEmailThunk({
        email: 'new@example.com',
        password: 'correct-horse',
        name: '',
        now: NOW,
      }),
    )

    expect(authService.operations()).toEqual([])
    expect(store.getState().auth.session).toMatchObject({
      exception: { message: 'Please enter your name.' },
    })
  })

  it("refuses a password below canon's six-character minimum", async () => {
    const { store, authService } = harness()

    await store.dispatch(
      signUpWithEmailThunk({
        email: 'new@example.com',
        password: 'short',
        name: 'New User',
        now: NOW,
      }),
    )

    expect(authService.operations()).toEqual([])
    expect(store.getState().auth.session).toMatchObject({
      exception: { message: 'Password must be at least 6 characters.' },
    })
  })

  it('surfaces an already-registered email as the typed case', async () => {
    const { store } = harness({
      authService: makeStubbedAuthService({
        failures: { signUpWithEmail: new Error('User already registered') },
      }),
    })

    await store.dispatch(
      signUpWithEmailThunk({
        email: 'ada@example.com',
        password: 'correct-horse',
        name: 'Ada',
        now: NOW,
      }),
    )

    expect(store.getState().auth.session).toMatchObject({
      exception: { kind: 'emailAlreadyInUse' },
    })
  })
})

// ---------------------------------------------------------------------------
// Apple and the OAuth redirect
// ---------------------------------------------------------------------------

describe('the Apple flow', () => {
  it('mints a challenge and keeps only the raw half in state', async () => {
    const { store } = harness({
      authService: makeStubbedAuthService({
        challenge: { rawNonce: 'raw-1', hashedNonce: 'hashed-1' },
      }),
    })

    await store.dispatch(beginAppleSignInThunk())

    expect(store.getState().auth.appleRawNonce).toBe('raw-1')
    expect(JSON.stringify(store.getState().auth)).not.toContain('hashed-1')
  })

  it('exchanges an id token against the nonce that is actually in flight', async () => {
    const { store } = harness()
    await store.dispatch(beginAppleSignInThunk())

    await store.dispatch(
      signInWithAppleThunk({ idToken: 'token', fullName: 'Grace Hopper', now: NOW }),
    )

    expect(store.getState().auth.session).toMatchObject({
      kind: 'signedIn',
      user: { name: 'Grace Hopper', authProvider: 'apple' },
    })
  })

  it('refuses an exchange with no nonce in flight — the replay the nonce exists to prevent', async () => {
    const { store, authService } = harness()

    await store.dispatch(
      signInWithAppleThunk({ idToken: 'token', fullName: null, now: NOW }),
    )

    expect(authService.operations()).toEqual([])
    expect(store.getState().auth.session).toMatchObject({
      exception: { kind: 'noIdentityToken' },
    })
  })

  it('clears the nonce once the attempt resolves, so it cannot be reused', async () => {
    const { store } = harness()
    await store.dispatch(beginAppleSignInThunk())
    await store.dispatch(
      signInWithAppleThunk({ idToken: 'token', fullName: null, now: NOW }),
    )

    expect(store.getState().auth.appleRawNonce).toBeNull()
  })
})

describe('startOAuthRedirectThunk', () => {
  it('reports the URL the browser was sent to', async () => {
    const { store } = harness()

    const action = await store.dispatch(
      startOAuthRedirectThunk({
        provider: 'google',
        redirectTo: 'https://kro.example/auth/callback',
      }),
    )
    const result = action.payload as Result<{ provider: string; url: string }, unknown>

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.provider).toBe('google')
  })

  it('signs nobody in — the session arrives through the launch restore on the way back', async () => {
    const { store } = harness()

    await store.dispatch(
      startOAuthRedirectThunk({
        provider: 'apple',
        redirectTo: 'https://kro.example/auth/callback',
      }),
    )

    expect(store.getState().auth.session.kind).toBe('authenticating')
  })

  it('surfaces a provider rejection as a typed failure', async () => {
    const { store } = harness({
      authService: makeStubbedAuthService({
        failures: { startOAuthRedirect: AuthExceptions.providerRejected('google') },
      }),
    })

    await store.dispatch(
      startOAuthRedirectThunk({ provider: 'google', redirectTo: 'https://kro.example' }),
    )

    expect(store.getState().auth.session).toMatchObject({
      exception: { kind: 'providerRejected' },
    })
  })
})

// ---------------------------------------------------------------------------
// The existing-local-data dialog — acceptance criterion 2
// ---------------------------------------------------------------------------

describe('resolveLocalDataChoiceThunk', () => {
  const anonymousRow = (id: string) => ({
    id,
    title: 'Local only',
    kind: 'task',
    status: 'planned',
    isDraft: false,
    tagsCsv: '',
    shadowsJson: null,
    repeatConfigJson: null,
    start: null,
    due: null,
    duration: null,
    minimumDuration: null,
    maximumDuration: null,
    projectId: null,
    ownerUserId: null,
    ownerGroupId: null,
    completed: null,
    createdAt: NOW,
    updatedAt: null,
    value: null,
    effort: null,
    expiry: null,
    associatedColor: null,
    sessionPoints: null,
    updatedAtEpochMillis: epochMillisFromDate(NOW),
    lastSyncedAtEpochMillis: null,
    deletedAtEpochMillis: null,
  })

  const signedInWithLocalData = async () => {
    const context = harness({ seed: { endeavors: [anonymousRow('a'), anonymousRow('b')] } })
    await context.store.dispatch(
      signInWithEmailThunk({ email: 'ada@example.com', password: 'secret', now: NOW }),
    )
    return context
  }

  it('"Sign All" stamps every anonymous row with the account and marks it dirty', async () => {
    const { store, localStore } = await signedInWithLocalData()

    await store.dispatch(
      resolveLocalDataChoiceThunk({ choice: LocalDataChoice.signAll, now: NOW }),
    )

    const rows = await localStore.endeavors.all()
    expect(rows).toHaveLength(2)
    for (const row of rows) {
      expect(row.ownerUserId).toBe(OWNER)
      expect(row.lastSyncedAtEpochMillis).toBeNull()
    }
    expect(store.getState().auth.localData).toEqual({ kind: 'hidden' })
  })

  it('"Clear Everything" drops every local row and both relation tables', async () => {
    const { store, localStore } = await signedInWithLocalData()

    await store.dispatch(
      resolveLocalDataChoiceThunk({ choice: LocalDataChoice.clearAll, now: NOW }),
    )

    expect(await localStore.endeavors.allIncludingRemoved()).toEqual([])
    expect(await localStore.defers.all()).toEqual([])
    expect(await localStore.performances.all()).toEqual([])
  })

  it('"Cancel" keeps the rows and leaves them ANONYMOUS — canon treats dismiss as keep', async () => {
    const { store, localStore } = await signedInWithLocalData()

    await store.dispatch(
      resolveLocalDataChoiceThunk({ choice: LocalDataChoice.cancel, now: NOW }),
    )

    const rows = await localStore.endeavors.all()
    expect(rows).toHaveLength(2)
    for (const row of rows) expect(row.ownerUserId).toBeNull()
  })

  it('pulls the account settings after every arm, which is what all three canon arms do', async () => {
    for (const choice of [
      LocalDataChoice.signAll,
      LocalDataChoice.clearAll,
      LocalDataChoice.cancel,
    ]) {
      const { store, settingsSync } = await signedInWithLocalData()
      await store.dispatch(resolveLocalDataChoiceThunk({ choice, now: NOW }))
      expect(settingsSync.pullCount()).toBe(1)
    }
  })

  it('refuses when no dialog is pending', async () => {
    const { store } = harness()

    const action = await store.dispatch(
      resolveLocalDataChoiceThunk({ choice: LocalDataChoice.signAll, now: NOW }),
    )

    expect((action.payload as Result<unknown, unknown>).ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Sign-out — the wipe and the intents
// ---------------------------------------------------------------------------

describe('signOutThunk', () => {
  const seedWithPreferences = (): InMemoryLocalStoreSeed => ({
    userProfiles: [profileRecord(OWNER)],
    preferences: {
      [preferenceStorageKey('general.weekStart')]: 'monday',
      'debug.ff.notifications': 'enabled',
    },
    endeavors: [
      {
        id: 'row',
        title: 'A task',
        kind: 'task',
        status: 'planned',
        isDraft: false,
        tagsCsv: '',
        shadowsJson: null,
        repeatConfigJson: null,
        start: null,
        due: null,
        duration: null,
        minimumDuration: null,
        maximumDuration: null,
        projectId: null,
        ownerUserId: OWNER,
        ownerGroupId: null,
        completed: null,
        createdAt: NOW,
        updatedAt: null,
        value: null,
        effort: null,
        expiry: null,
        associatedColor: null,
        sessionPoints: null,
        updatedAtEpochMillis: epochMillisFromDate(NOW),
        lastSyncedAtEpochMillis: null,
        deletedAtEpochMillis: null,
      },
    ],
  })

  it('clears the kro: preferences and every endeavor store', async () => {
    const { store, localStore } = harness({ seed: seedWithPreferences() })

    await store.dispatch(signOutThunk())

    expect(await localStore.endeavors.allIncludingRemoved()).toEqual([])
    expect(localStore.preferences.get(preferenceStorageKey('general.weekStart'))).toBeNull()
  })

  it('PRESERVES debug.ff.* overrides — a tester keeps their flags across a sign-out', async () => {
    const { store, localStore } = harness({ seed: seedWithPreferences() })

    await store.dispatch(signOutThunk())

    expect(localStore.preferences.get('debug.ff.notifications')).toBe('enabled')
  })

  it('raises the pending-alert withdrawal intent for #34 to perform', async () => {
    const { store } = harness({ seed: seedWithPreferences() })

    await store.dispatch(signOutThunk())

    expect(store.getState().auth.pendingSignOutIntents).toEqual(signOutIntents())
  })

  it('drops the session', async () => {
    const { store } = harness({
      seed: seedWithPreferences(),
      authService: makeStubbedAuthService({ initialUser: authFixtureUsers.email }),
    })
    await store.dispatch(restoreSessionThunk({ now: NOW }))

    await store.dispatch(signOutThunk())

    expect(store.getState().auth.session).toEqual({ kind: 'signedOut' })
  })

  it('still wipes locally when the remote sign-out fails — canon calls that non-fatal', async () => {
    const { store, localStore } = harness({
      seed: seedWithPreferences(),
      authService: makeStubbedAuthService({
        initialUser: authFixtureUsers.email,
        failures: { signOut: new TypeError('Failed to fetch') },
      }),
    })

    await store.dispatch(signOutThunk())

    expect(await localStore.endeavors.allIncludingRemoved()).toEqual([])
    expect(store.getState().auth.session).toEqual({ kind: 'signedOut' })
  })
})

// ---------------------------------------------------------------------------
// Settings sync — acceptance criterion 3
// ---------------------------------------------------------------------------

describe('syncSettingsThunk', () => {
  it('pulls at launch and applies the account values locally', async () => {
    if (boolCloudOption === undefined) return
    const { store, localStore } = harness({
      settingsStored: [{ key: boolCloudOption.key, value: true, updatedAt: null }],
    })

    await store.dispatch(
      syncSettingsThunk({ trigger: SettingsSyncTrigger.appLaunch, now: NOW }),
    )

    expect(makePreferences(localStore.preferences).read(boolCloudOption)).toBe(true)
  })

  it('pulls at sign-in', async () => {
    const { store, settingsSync } = harness()
    await store.dispatch(
      syncSettingsThunk({ trigger: SettingsSyncTrigger.signIn, now: NOW }),
    )
    expect(settingsSync.pullCount()).toBe(1)
  })

  it('does NOTHING when Settings is merely opened — a pull there would clobber an offline edit', async () => {
    const { store, settingsSync } = harness()

    const action = await store.dispatch(
      syncSettingsThunk({ trigger: SettingsSyncTrigger.settingsOpened, now: NOW }),
    )

    expect(settingsSync.pullCount()).toBe(0)
    expect(settingsSync.pushes()).toEqual([])
    expect(action.payload).toMatchObject({ value: { kind: 'skipped' } })
  })

  it('pushes on closing Settings', async () => {
    const { store, settingsSync } = harness()

    await store.dispatch(
      syncSettingsThunk({ trigger: SettingsSyncTrigger.settingsClosed, now: NOW }),
    )

    expect(settingsSync.pushes()).toHaveLength(1)
  })

  it('never pushes a device-only key — local-scoped values do not leave the device', async () => {
    const { store, settingsSync } = harness()

    await store.dispatch(
      syncSettingsThunk({ trigger: SettingsSyncTrigger.settingsClosed, now: NOW }),
    )

    const pushedKeys = (settingsSync.pushes()[0] ?? []).map((entry) => entry.key)
    const cloudKeys = cloudSyncOptions.map((option) => option.key)
    for (const key of pushedKeys) expect(cloudKeys).toContain(key)
  })

  it('reports offline on a transport failure and keeps the local value', async () => {
    const { store } = harness({ settingsPullFailure: new TypeError('Failed to fetch') })

    await store.dispatch(
      syncSettingsThunk({ trigger: SettingsSyncTrigger.appLaunch, now: NOW }),
    )

    expect(store.getState().auth.settingsSync).toEqual({ kind: 'offline' })
  })

  it('reports "sign in to sync" rather than an error when nobody is signed in', async () => {
    const { store } = harness({ settingsPushFailure: AuthExceptions.notSignedIn() })

    await store.dispatch(
      syncSettingsThunk({ trigger: SettingsSyncTrigger.settingsClosed, now: NOW }),
    )

    expect(store.getState().auth.settingsSync).toEqual({ kind: 'signedOut' })
  })
})

// ---------------------------------------------------------------------------
// The endeavor sweep — acceptance criterion 4
// ---------------------------------------------------------------------------

describe('synchronizeEndeavorsThunk', () => {
  it('reports disabled and touches no transport under the shipping flag configuration', async () => {
    const { store, transport } = harness({ seed: { userProfiles: [profileRecord(OWNER)] } })

    await store.dispatch(synchronizeEndeavorsThunk({ now: NOW }))

    expect(store.getState().auth.endeavorSync).toEqual({ kind: 'disabled' })
    expect(transport.calls()).toEqual([])
  })

  it('runs and reports counts with the flag forced on', async () => {
    const { store } = harness({
      cloudEnabled: true,
      seed: { userProfiles: [profileRecord(OWNER)] },
    })

    await store.dispatch(synchronizeEndeavorsThunk({ now: NOW }))

    expect(store.getState().auth.endeavorSync).toMatchObject({ kind: 'completed' })
  })

  it('reports idle rather than a failure when nobody is signed in', async () => {
    const { store } = harness({ cloudEnabled: true })

    await store.dispatch(synchronizeEndeavorsThunk({ now: NOW }))

    expect(store.getState().auth.endeavorSync).toEqual({ kind: 'idle' })
  })
})

// ---------------------------------------------------------------------------
// The auth-state subscription seam
// ---------------------------------------------------------------------------

describe('observeAuthState', () => {
  it('restores the session when the client reports a sign-in from elsewhere', async () => {
    const authService = makeStubbedAuthService()
    const { store } = harness({ authService })
    const stop = observeAuthState({
      dispatch: store.dispatch,
      extra: { ...stubbedThunkExtra, authService },
      now: () => NOW,
    })

    await authService.signInWithEmail('ada@example.com', 'secret')
    await Promise.resolve()

    stop()
    expect(authService.operations()).toContain('restoreSession')
  })

  it('stops listening once released', async () => {
    const authService = makeStubbedAuthService()
    const { store } = harness({ authService })
    const stop = observeAuthState({
      dispatch: store.dispatch,
      extra: { ...stubbedThunkExtra, authService },
      now: () => NOW,
    })
    stop()

    await authService.signInWithEmail('ada@example.com', 'secret')

    expect(authService.operations()).toEqual(['signInWithEmail'])
  })

  it('returns a teardown that is safe to call twice', () => {
    const authService = makeStubbedAuthService()
    const { store } = harness({ authService })
    const stop = observeAuthState({
      dispatch: store.dispatch,
      extra: { ...stubbedThunkExtra, authService },
      now: () => NOW,
    })
    expect(() => {
      stop()
      stop()
    }).not.toThrow()
  })
})
