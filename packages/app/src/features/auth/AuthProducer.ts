/**
 * The auth feature's Producers (`RC-3`, `RC-6`, `RC-25`) — canon
 * `AuthProducer.swift` plus the `MainProducer` effects that belong to the
 * session: the sign-out wipe, the settings pull/push pair and the endeavor
 * sweep.
 *
 * Every payload creator resolves `Result<T, …Exception>` and **never throws**
 * (`RC-7`, `UZF-14`); every Service arrives through `extra` (`RC-6`); nothing
 * here reads a clock — `now` is an argument, exactly as canon injects
 * `@Dependency(\.date)`.
 *
 * ## Why some thunks dispatch other thunks
 *
 * Canon's reducer returns `.merge(...)` of several effects from one arm — a
 * successful sign-in fires both `loadCoreData` and the settings pull. A
 * `createSlice` reducer cannot return effects, so the fan-out happens inside
 * the Producer through `thunkAPI.dispatch`. The reducer stays pure and each
 * follow-up keeps its own lifecycle, which is what lets the Settings footer
 * report a failed pull without the sign-in itself looking failed.
 *
 * ## The one-line summary of what runs when
 *
 * | Moment | Settings | Endeavors |
 * |---|---|---|
 * | App launch, session restored | **pull** | sweep |
 * | Sign-in, no local data | **pull** | sweep |
 * | Sign-in, local data present | after the dialog is answered | after the dialog |
 * | Settings opened | *nothing* — canon is emphatic | — |
 * | Settings closed | **push** | — |
 * | Sign-out | — | — |
 *
 * The "Settings opened does nothing" row is the load-bearing one: canon's
 * comment says a pull there *"would overwrite a pending offline edit with the
 * older remote value"*. `shouldPullSettings` encodes it; this file honours it.
 */
import {
  type SignOutWipeReport,
  type User,
  epochMillisFromDate,
  err,
  makePreferences,
  ok,
  type Result,
} from '@kro/core'
import { createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState, ThunkExtra } from '../../library/store'
import { type AuthException, AuthExceptions } from './AuthException'
import { AuthMapper } from './AuthMapper'
import {
  type AuthState,
  type EndeavorSyncSummary,
  MINIMUM_PASSWORD_LENGTH,
} from './AuthState'
import {
  type CloudSettingsApplication,
  SettingsSyncTrigger,
  applyCloudSettingEntries,
  cloudSettingEntriesFrom,
  shouldPullSettings,
  shouldPushSettings,
} from './CloudSettings'
import {
  type EndeavorSyncException,
  endeavorSyncExceptionFrom,
} from './EndeavorSyncException'
import { LocalDataChoice, localDataDecisionFor } from './LocalDataDialog'
import { type SignOutIntent, signOutIntents } from './SignOutIntents'

/** What a completed sign-in hands the reducer. */
export interface AuthCompletion {
  readonly user: User
  /**
   * The anonymous-row count when the dialog is owed, `null` when it is not.
   * One field rather than a boolean beside a number, so "prompt with no count"
   * is unrepresentable.
   */
  readonly localDataPrompt: number | null
}

/** What a settings sync attempt did. `skipped` is a first-class answer. */
export type SettingsSyncOutcome =
  | { readonly kind: 'skipped'; readonly trigger: SettingsSyncTrigger }
  | { readonly kind: 'pulled'; readonly application: CloudSettingsApplication }
  | { readonly kind: 'pushed'; readonly keys: readonly string[] }

/** What a sign-out did, so a test can assert on more than "did not throw". */
export interface SignOutResult {
  readonly wipe: SignOutWipeReport
  readonly intents: readonly SignOutIntent[]
}

/** What the local-data choice did. */
export interface LocalDataResolution {
  readonly choice: LocalDataChoice
  readonly adopted: number
  readonly cleared: boolean
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

/**
 * The anonymous-row count, or `0` when the store cannot answer.
 *
 * A storage failure here must not fail a sign-in that already succeeded: the
 * account exists either way, and the worst outcome of a `0` is that the dialog
 * is not offered — the rows stay on the device, unowned and unsynced, which is
 * exactly what Cancel does.
 */
const anonymousCount = async (extra: ThunkExtra): Promise<number> => {
  try {
    return await extra.localStore.endeavors.countAnonymous()
  } catch {
    return 0
  }
}

/**
 * The two follow-ups a *settled* session owes: pull the account's settings and
 * sweep its endeavors. Fired from a launch restore, from a sign-in with no
 * local data, and from every arm of the local-data dialog — canon fires
 * `loadCoreData` + the settings pull at exactly those three moments.
 */
const dispatchPostSignIn = (
  dispatch: (action: unknown) => unknown,
  now: Date,
  trigger: SettingsSyncTrigger,
): void => {
  dispatch(syncSettingsThunk({ trigger, now }))
  dispatch(synchronizeEndeavorsThunk({ now }))
}

/**
 * Canon's `onSessionRestored` — the silent launch restore.
 *
 * A `null` user is the ordinary signed-out case, not a failure, so it resolves
 * `ok(null)`. Only a transport or profile-row failure produces `err`.
 */
export const restoreSessionThunk = createAsyncThunk<
  Result<User | null, AuthException>,
  { now: Date },
  { extra: ThunkExtra }
>('auth/onSessionRestoreCompleted', async ({ now }, { extra, dispatch }) => {
  try {
    const user = await extra.authService.restoreSession()
    if (user !== null) {
      dispatchPostSignIn(dispatch, now, SettingsSyncTrigger.appLaunch)
    }
    return ok(user)
  } catch (error) {
    return err(AuthMapper.toException(error))
  }
})

/** The shared tail of every provider flow. */
const completeSignIn = async (
  user: User,
  context: {
    readonly extra: ThunkExtra
    readonly dispatch: (action: unknown) => unknown
    readonly now: Date
  },
): Promise<Result<AuthCompletion, AuthException>> => {
  const count = await anonymousCount(context.extra)
  if (count > 0) {
    // Hold the follow-ups: canon waits for the dialog before touching the
    // cloud, because "Clear Everything and Start Over" must not race a pull.
    return ok({ user, localDataPrompt: count })
  }
  dispatchPostSignIn(context.dispatch, context.now, SettingsSyncTrigger.signIn)
  return ok({ user, localDataPrompt: null })
}

/** Canon's `userDidTapSignIn` guard + `produceSignInWithEmailEffect`. */
export const signInWithEmailThunk = createAsyncThunk<
  Result<AuthCompletion, AuthException>,
  { email: string; password: string; now: Date },
  { extra: ThunkExtra }
>('auth/onEmailSignInCompleted', async ({ email, password, now }, { extra, dispatch }) => {
  if (email.length === 0 || password.length === 0) {
    return err(AuthExceptions.incompleteForm('Please enter your email and password.'))
  }
  try {
    const user = await extra.authService.signInWithEmail(email, password)
    return completeSignIn(user, { extra, dispatch, now })
  } catch (error) {
    return err(AuthMapper.toException(error))
  }
})

/** Canon's `userDidTapSignUp` guards + `produceSignUpWithEmailEffect`. */
export const signUpWithEmailThunk = createAsyncThunk<
  Result<AuthCompletion, AuthException>,
  { email: string; password: string; name: string; now: Date },
  { extra: ThunkExtra }
>(
  'auth/onEmailSignUpCompleted',
  async ({ email, password, name, now }, { extra, dispatch }) => {
    if (name.length === 0) {
      return err(AuthExceptions.incompleteForm('Please enter your name.'))
    }
    if (email.length === 0 || password.length === 0) {
      return err(AuthExceptions.incompleteForm('Please enter your email and password.'))
    }
    if (password.length < MINIMUM_PASSWORD_LENGTH) {
      return err(
        AuthExceptions.incompleteForm(
          `Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters.`,
        ),
      )
    }
    try {
      const user = await extra.authService.signUpWithEmail(email, password, name)
      return completeSignIn(user, { extra, dispatch, now })
    } catch (error) {
      return err(AuthMapper.toException(error))
    }
  },
)

/**
 * Mints the Apple nonce pair.
 *
 * The **hashed** half goes to Apple's JS SDK (#32's job); the **raw** half is
 * kept in slice state until the id token comes back. Splitting the flow in two
 * thunks is what the web requires: between them the surface hands control to
 * Apple, which is not something a Producer can await.
 */
export const beginAppleSignInThunk = createAsyncThunk<
  Result<{ readonly rawNonce: string; readonly hashedNonce: string }, AuthException>,
  void,
  { extra: ThunkExtra }
>('auth/onAppleChallengeMinted', async (_arg, { extra }) => {
  try {
    return ok(await extra.authService.beginAppleSignIn())
  } catch (error) {
    return err(AuthMapper.toException(error))
  }
})

/**
 * Canon's `onAppleCredentialReceived` → `produceSignInWithAppleEffect`.
 *
 * The raw nonce is read from state rather than passed in, so a surface cannot
 * hand back a nonce that does not belong to the attempt in flight — the exact
 * replay the nonce exists to prevent.
 */
export const signInWithAppleThunk = createAsyncThunk<
  Result<AuthCompletion, AuthException>,
  { idToken: string; fullName: string | null; now: Date },
  { extra: ThunkExtra; state: RootState }
>(
  'auth/onAppleSignInCompleted',
  async ({ idToken, fullName, now }, { extra, dispatch, getState }) => {
    const rawNonce = (getState().auth as AuthState).appleRawNonce
    if (rawNonce === null) return err(AuthExceptions.noIdentityToken())
    try {
      const user = await extra.authService.signInWithAppleIdToken({
        idToken,
        rawNonce,
        fullName,
      })
      return completeSignIn(user, { extra, dispatch, now })
    } catch (error) {
      return err(AuthMapper.toException(error))
    }
  },
)

/**
 * Canon's `produceSignInWithGoogleEffect`, in its web shape.
 *
 * The browser leaves for the provider here; the session lands on the way back,
 * when supabase-js's `detectSessionInUrl` exchanges the code and the launch
 * restore picks it up. So this resolving `ok` means *"the redirect started"*,
 * not *"you are signed in"* — which is why it does not go through
 * `completeSignIn`.
 */
export const startOAuthRedirectThunk = createAsyncThunk<
  Result<{ readonly provider: string; readonly url: string }, AuthException>,
  { provider: 'google' | 'apple'; redirectTo: string },
  { extra: ThunkExtra }
>('auth/onOAuthRedirectStarted', async ({ provider, redirectTo }, { extra }) => {
  try {
    return ok(await extra.authService.startOAuthRedirect({ provider, redirectTo }))
  } catch (error) {
    return err(AuthMapper.toException(error))
  }
})

/**
 * The existing-local-data dialog's three arms — canon's `migrationAlertSignAll`
 * / `migrationAlertClearAll` / `migrationAlertDismissed`.
 *
 * The decision itself is a pure table (`localDataDecisionFor`); this only
 * performs it, then fires the same two follow-ups every arm owes.
 */
export const resolveLocalDataChoiceThunk = createAsyncThunk<
  Result<LocalDataResolution, AuthException>,
  { choice: LocalDataChoice; now: Date },
  { extra: ThunkExtra; state: RootState }
>(
  'auth/onLocalDataChoiceCompleted',
  async ({ choice, now }, { extra, dispatch, getState }) => {
    const auth = getState().auth as AuthState
    const pendingUser =
      auth.localData.kind === 'hidden' ? null : auth.localData.pendingUser
    if (pendingUser === null) return err(AuthExceptions.notSignedIn())

    const decision = localDataDecisionFor(choice)
    let adopted = 0
    try {
      if (decision.adoptsAnonymousRows) {
        adopted = await extra.localStore.endeavors.adoptAnonymous(
          pendingUser.id,
          epochMillisFromDate(now),
        )
      }
      if (decision.clearsLocalRows) {
        // Canon's `clearLocal()` — the endeavor row and both relation tables.
        await extra.localStore.endeavors.clear()
        await extra.localStore.defers.clear()
        await extra.localStore.performances.clear()
      }
    } catch (error) {
      return err(AuthExceptions.unknown(messageOf(error)))
    }

    if (decision.pullsFromCloud) {
      dispatchPostSignIn(dispatch, now, SettingsSyncTrigger.signIn)
    }
    return ok({ choice, adopted, cleared: decision.clearsLocalRows })
  },
)

/**
 * Sign-out — canon's `produceSignOutEffect` + `onSignedOut`'s two follow-ups.
 *
 * Three properties, in this order and for these reasons:
 *
 * 1. **The remote sign-out's failure is swallowed.** Canon: *"sign-out errors
 *    are non-fatal"*. A user who taps Sign Out while offline must still end up
 *    signed out on this device; leaving them signed in because the server could
 *    not be told is the worst possible answer.
 * 2. **The local wipe always runs.** It is the part that protects the next
 *    person on a shared device (`SEC-8` / CWE-668) and it must not be
 *    conditional on the network.
 * 3. **The alert-withdrawal intents are raised.** kro-pwa has no notification
 *    service yet (#34); see `SignOutIntents.ts` for why the intent is emitted
 *    rather than skipped.
 */
export const signOutThunk = createAsyncThunk<
  Result<SignOutResult, AuthException>,
  void,
  { extra: ThunkExtra }
>('auth/onSignOutCompleted', async (_arg, { extra }) => {
  try {
    await extra.authService.signOut()
  } catch {
    // Non-fatal, deliberately — see the doc comment above.
  }
  try {
    const wipe = await extra.signOutWipe(extra.localStore)
    return ok({ wipe, intents: signOutIntents() })
  } catch (error) {
    return err(AuthExceptions.unknown(messageOf(error)))
  }
})

/**
 * Settings cloud sync — canon's `produceSettingsSyncPullEffect` and
 * `produceSettingsSyncPushEffect`, behind the trigger rules.
 *
 * A trigger that is neither a pull nor a push resolves `skipped`, not `err`:
 * *"opening Settings does not pull"* is correct behaviour, and reporting it as
 * a failure would put the hub's footer into an error state every time the user
 * looked at it.
 */
export const syncSettingsThunk = createAsyncThunk<
  Result<SettingsSyncOutcome, AuthException>,
  { trigger: SettingsSyncTrigger; now: Date },
  { extra: ThunkExtra }
>('auth/onSettingsSyncCompleted', async ({ trigger }, { extra }) => {
  const preferences = makePreferences(extra.localStore.preferences)

  if (shouldPullSettings(trigger)) {
    try {
      const entries = await extra.settingsSync.pullAll()
      return ok({ kind: 'pulled', application: applyCloudSettingEntries(entries, preferences) })
    } catch (error) {
      return err(AuthMapper.toException(error))
    }
  }

  if (shouldPushSettings(trigger)) {
    const entries = cloudSettingEntriesFrom(preferences)
    try {
      await extra.settingsSync.push(entries)
      return ok({ kind: 'pushed', keys: entries.map((entry) => entry.key) })
    } catch (error) {
      return err(AuthMapper.toException(error))
    }
  }

  return ok({ kind: 'skipped', trigger })
})

/**
 * The endeavor sweep — push (tombstones included), then pull.
 *
 * `disabled` and `signedOut` are reported as outcomes rather than as failures:
 * with `supabaseHosting` OFF at `statusQuo`, "the engine did nothing" is the
 * shipping behaviour, and a `failed` lifecycle for it would light an error on
 * every launch of a correctly-configured build.
 */
export const synchronizeEndeavorsThunk = createAsyncThunk<
  Result<EndeavorSyncSummary, EndeavorSyncException>,
  { now: Date },
  { extra: ThunkExtra }
>('auth/onEndeavorSyncCompleted', async ({ now }, { extra }) => {
  try {
    const report = await extra.endeavorSync.synchronize({ now })
    return ok({
      status: report.status,
      pushed: report.pushed.length,
      deleted: report.deleted.length,
      deferred: report.deferred.length,
      pulled: report.pulled.length,
      localWins: report.localWins.length,
      skipped: report.skipped.length,
    })
  } catch (error) {
    return err(endeavorSyncExceptionFrom(error))
  }
})

/**
 * The `onAuthStateChange` seam.
 *
 * supabase-js emits a session change whenever a token refreshes, a second tab
 * signs out, or the PKCE code in the URL is exchanged on the way back from a
 * provider. None of those are dispatches, so this is a subscription rather than
 * a thunk — the shape `RC-27` sanctions for work a caller must be able to stop.
 *
 * The composition root (#13) owns the call and the teardown; it is exported
 * here so the wiring is one line there and the behaviour is testable now.
 */
export const observeAuthState = (context: {
  readonly dispatch: (action: unknown) => unknown
  readonly extra: ThunkExtra
  readonly now: () => Date
}): (() => void) =>
  context.extra.authService.onAuthStateChange((event) => {
    if (event.kind === 'signedOut') {
      // A sign-out that happened elsewhere (another tab, an expired refresh)
      // still owes this tab the local wipe.
      context.dispatch(signOutThunk())
      return
    }
    context.dispatch(restoreSessionThunk({ now: context.now() }))
  })
