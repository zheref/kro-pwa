/**
 * The settings surface's effects (`RC-3`, `RC-25`; implements `UZF-14`,
 * `UZF-15`).
 *
 * Every thunk resolves `Result<T, SettingsException>` and never throws; every
 * one reads its boundary from `extra` and never imports a Service. The four
 * boundaries are the on-device preference store, the `googleCalendar` feature
 * flag, KC-IS-#33's Google service and KC-IS-#13's navigation service.
 *
 * ## Why the preference store is read through a Producer at all
 *
 * `extra.localStore.preferences` is a **synchronous** `KeyValueStore` — a
 * `RC-47` Provider — so a reducer could technically read it. It is read here
 * anyway, for two reasons that outlive the convenience: a component may not
 * reach `extra` at all (`RC-6`), and a snapshot in state is what lets a
 * Selector answer a row's value without touching storage on every render. The
 * same shape `EarnProducer` already uses.
 */
import {
  type Result,
  type SettingValue,
  FeatureFlags,
  allSettingOptions,
  err,
  makePreferences,
  ok,
  settingOptionForKey,
} from '@kro/core'
import { createAsyncThunk } from '@reduxjs/toolkit'
import type { ThunkExtra } from '../../library/store'
import {
  type SettingsException,
  SettingsExceptions,
} from './SettingsException'
import type { GoogleConnectionState } from './SettingsState'

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

/** What one snapshot read produced. */
export interface SettingsSnapshot {
  readonly values: Readonly<Record<string, SettingValue | null>>
  /** The `googleCalendar` flag, resolved in the same pass. */
  readonly isGoogleEnabled: boolean
}

/** What one write produced — the value the store actually took. */
export interface SettingWriteResult {
  readonly key: string
  readonly value: SettingValue | null
}

/**
 * The Service's connection, narrowed to the feature's own union.
 *
 * A feature module may not import from `services/**` (`RC-6`), so the Service's
 * `GoogleCalendarConnection` type is never named here — `extra.googleCalendar`
 * carries it through `ThunkExtra`, and this switch reads its discriminant. The
 * `scopes` and `reason` payloads are deliberately dropped: the pane offers the
 * same affordance whichever reason Google gave, and a scope list in state would
 * be a credential-shaped value with no reader (`SEC-5`).
 */
const toConnectionState = (connection: {
  kind: 'unconfigured' | 'disconnected' | 'connected' | 'needsReconnect'
  missing?: readonly string[]
}): GoogleConnectionState => {
  switch (connection.kind) {
    case 'unconfigured':
      return { kind: 'unconfigured', missing: connection.missing ?? [] }
    case 'disconnected':
      return { kind: 'disconnected' }
    case 'connected':
      return { kind: 'connected' }
    case 'needsReconnect':
      return { kind: 'needsReconnect' }
  }
}

/**
 * Canon's `.started` — read every declared option's stored value at once.
 *
 * `allSettingOptions`, not `allPreferenceOptions`: the three non-preference
 * options (the two Apple integration flags and the Do visibility filter) are
 * part of the same store, and a snapshot that omitted them would make a later
 * reader think they were unset. The *panes* still render only what
 * `settingOptionsByGroup` declares — see `SettingsElements`.
 *
 * A store that cannot be read at all resolves `err`; the surface then shows
 * declared defaults and stays editable, which is canon's "load failed" state.
 */
export const loadSettingsThunk = createAsyncThunk<
  Result<SettingsSnapshot, SettingsException>,
  void,
  { extra: ThunkExtra }
>('settings/onSettingsLoadCompleted', async (_argument, { extra }) => {
  try {
    const preferences = makePreferences(extra.localStore.preferences)
    const values: Record<string, SettingValue | null> = {}
    for (const option of allSettingOptions) {
      values[option.key] = preferences.read(option)
    }
    return ok({
      values,
      isGoogleEnabled: extra.featureFlags.isEnabled(FeatureFlags.googleCalendar),
    })
  } catch (error) {
    return err(SettingsExceptions.preferencesUnavailable(messageOf(error)))
  }
})

/**
 * One preference changed.
 *
 * `Preferences.write` reports `false` for a value that does not fit the
 * option's declared shape and **does not persist it** — so a refusal is an
 * `err` here rather than a silent no-op that would leave the form showing a
 * value the store never took.
 *
 * The end-≤-start pair is not a refusal: both times are legal `timeOfDay`
 * values, canon persists them as entered, and the warning is a *rendered*
 * state (`selectWorkingHoursValid`), never a rejected write.
 */
export const updateSettingThunk = createAsyncThunk<
  Result<SettingWriteResult, SettingsException>,
  { key: string; value: SettingValue },
  { extra: ThunkExtra }
>('settings/onPreferenceWriteCompleted', async ({ key, value }, { extra }) => {
  const option = settingOptionForKey(key)
  if (option === null) {
    return err(SettingsExceptions.preferenceRejected(`no option declares ${key}`))
  }
  try {
    const preferences = makePreferences(extra.localStore.preferences)
    if (!preferences.write(option, value)) {
      return err(
        SettingsExceptions.preferenceRejected(`${key} refused the given value`),
      )
    }
    return ok({ key, value: preferences.read(option) })
  } catch (error) {
    return err(SettingsExceptions.preferencesUnavailable(messageOf(error)))
  }
})

/**
 * Canon's `IntegrationsFeature.onViewAppeared` — ask the deployment what it can
 * offer.
 *
 * Canon asks `googleAuth.loadTokens() != nil`, a two-state answer it can give
 * synchronously because the credential is on the device. Here the credential is
 * an `HttpOnly` cookie the browser cannot read (`SEC-5`), so the question goes
 * to this app's own `/api/google/status` route and comes back with four states.
 */
export const loadGoogleConnectionThunk = createAsyncThunk<
  Result<GoogleConnectionState, SettingsException>,
  void,
  { extra: ThunkExtra }
>('settings/onGoogleConnectionLoadCompleted', async (_argument, { extra, signal }) => {
  try {
    return ok(toConnectionState(await extra.googleCalendar.connection({ signal })))
  } catch (error) {
    return err(SettingsExceptions.integrationUnavailable(messageOf(error)))
  }
})

/**
 * Canon's `userDidTapConnect("google")` — start (or repeat) authorization.
 *
 * Canon opens an `ASWebAuthenticationSession`. The web's equivalent is a
 * full-page navigation to this app's `/api/google/connect`, which mints the
 * state cookie and redirects to Google; the browser comes back to
 * `/api/google/callback`. So the effect is a navigation, and it goes through
 * `extra.navigation` — never `window.location` from a component (`RC-17`).
 *
 * An `unconfigured` deployment resolves `err` **without navigating**: sending
 * the browser to a route that can only fail is worse than saying so.
 */
export const connectGoogleThunk = createAsyncThunk<
  Result<'started', SettingsException>,
  void,
  { extra: ThunkExtra }
>('settings/onGoogleConnectStarted', async (_argument, { extra, signal }) => {
  try {
    const connection = await extra.googleCalendar.connection({ signal })
    if (connection.kind === 'unconfigured') {
      return err(
        SettingsExceptions.integrationUnconfigured(connection.missing.join(', ')),
      )
    }
    extra.navigation.navigate(extra.googleCalendar.authorizationPath())
    return ok('started')
  } catch (error) {
    return err(SettingsExceptions.integrationUnavailable(messageOf(error)))
  }
})

/**
 * Revoke the grant and re-read the state.
 *
 * The re-read is what makes the row honest: `disconnect` answers nothing, and
 * assuming `disconnected` would paint a Connect button over a revocation that
 * did not actually take.
 */
export const disconnectGoogleThunk = createAsyncThunk<
  Result<GoogleConnectionState, SettingsException>,
  void,
  { extra: ThunkExtra }
>('settings/onGoogleDisconnectCompleted', async (_argument, { extra, signal }) => {
  try {
    await extra.googleCalendar.disconnect({ signal })
    return ok(toConnectionState(await extra.googleCalendar.connection({ signal })))
  } catch (error) {
    return err(SettingsExceptions.integrationUnavailable(messageOf(error)))
  }
})
