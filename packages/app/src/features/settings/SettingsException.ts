/**
 * The settings surface's typed failures (`RC-8`, `UZF-8`).
 *
 * Two of the four are canon's `IntegrationsException` cases, narrowed: canon's
 * `notConfigured` becomes `integrationUnconfigured` (it is the deployment's
 * Google client that is missing, not the user's grant) and
 * `connectionFailed`/`networkUnavailable` collapse into
 * `integrationUnavailable`, because on the web both arrive as the same failed
 * same-origin call and the recovery is identical. The other two are this
 * surface's own: reading and writing the on-device preference store.
 *
 * No case carries a provider message through to the user — `message` is
 * developer detail for logs, and every user-facing string is derived from
 * `kind` by `SettingsSelectors` (`RC-8`).
 */
import { type Exception, exception } from '@kro/core'

export type SettingsException =
  /** The preference store could not be read at all. */
  | Exception<'preferencesUnavailable'>
  /** A write was refused — the value did not fit the option's declared shape. */
  | Exception<'preferenceRejected'>
  /** This deployment has no Google client, so connecting cannot work. */
  | Exception<'integrationUnconfigured'>
  /** The connect or disconnect call did not complete. */
  | Exception<'integrationUnavailable'>

export const SettingsExceptions = {
  preferencesUnavailable: (message = ''): SettingsException =>
    exception('preferencesUnavailable', message, true),
  preferenceRejected: (message = ''): SettingsException =>
    exception('preferenceRejected', message, true),
  // Not recoverable by the user: no amount of retrying supplies a Google client
  // to a deployment that has none. A human G5 step (Google Cloud + env) does.
  integrationUnconfigured: (message = ''): SettingsException =>
    exception('integrationUnconfigured', message, false),
  integrationUnavailable: (message = ''): SettingsException =>
    exception('integrationUnavailable', message, true),
}
