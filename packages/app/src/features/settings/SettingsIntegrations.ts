/**
 * The Integrations pane's rows — canon `IntegrationsShifters.applyItemsLoaded`,
 * ported as a pure function of the connection state rather than a mutation.
 *
 * Canon builds four rows: Kro Cloud (always "connected", no affordance), Google
 * Calendar (only while the `googleCalendar` flag is on), and Apple Calendar and
 * Apple Reminders — whose Connect buttons are rendered `.disabled(true)`,
 * unconditionally, on the platform that *has* EventKit. They are decoration.
 *
 * ## Web parity is honest about the same inertness
 *
 * The epic puts Apple EventKit hosts out of scope: there is no EventKit in a
 * browser and there never will be. Canon's two rows are ported exactly as canon
 * ships them — present, listed, and inert — rather than hidden, because hiding
 * them would make the web's Integrations pane a *different* list from the Mac's
 * for a user comparing the two. `action: 'unavailable'` is what an inert
 * Connect is, said out loud, and the row explains itself instead of offering a
 * button that does nothing when pressed.
 *
 * ## Google's four states, not two
 *
 * Canon's `connected: Bool` cannot distinguish "this build has no Google client
 * configured" from "you have not connected yet" — on iOS the client is baked
 * into the bundle, so the distinction does not arise. On the web it does
 * (KC-IS-#33's `GoogleCalendarConnection`), and collapsing them would show a
 * Connect button on a deployment where connecting cannot possibly work: the
 * user presses it, Google returns an opaque OAuth error, and nothing in the
 * product explains why. So `unconfigured` gets its own row state and its own
 * copy.
 */
import { assertNever } from '@kro/core'
import type { GoogleConnectionState } from './SettingsState'

/** What a row offers. One field, so "connected and connecting" is unsayable. */
export const IntegrationAction = {
  /** Nothing to press — Kro Cloud, and Google while connected-and-idle. */
  none: 'none',
  /** Canon's Connect. */
  connect: 'connect',
  /** A grant existed and stopped working — KC-IS-#33's fourth state. */
  reconnect: 'reconnect',
  disconnect: 'disconnect',
  /** An attempt is in flight — canon's `isConnecting` spinner. */
  busy: 'busy',
  /** This deployment cannot offer the connection at all. */
  unavailable: 'unavailable',
} as const

export type IntegrationAction =
  (typeof IntegrationAction)[keyof typeof IntegrationAction]

/** Canon's `IntegrationItem`, plus the state the web can actually be in. */
export interface IntegrationRow {
  readonly id: string
  readonly title: string
  readonly subtitle: string
  /** Canon's SF Symbol name; the surface resolves it. */
  readonly glyph: string
  readonly isConnected: boolean
  readonly action: IntegrationAction
}

/** Canon's row ids, so a test names them rather than spelling strings twice. */
export const IntegrationId = {
  kroCloud: 'kro-cloud',
  google: 'google',
  appleCalendar: 'apple-calendar',
  appleReminders: 'apple-reminders',
} as const

export type IntegrationId = (typeof IntegrationId)[keyof typeof IntegrationId]

/**
 * The Google row's subtitle, which is the only one that varies by state.
 *
 * `unknown` reads two ways and the difference matters: while an attempt is in
 * flight it means *"still asking"*; once nothing is in flight it means *"we
 * asked and could not find out"* — the state a failed first `/api/google/status`
 * leaves behind. Saying "Checking…" forever there would be a lie about work
 * that is not happening. (Reported by Copilot on KC-PR-#70.)
 */
export const googleIntegrationSubtitle = (
  connection: GoogleConnectionState,
  isBusy = false,
): string => {
  switch (connection.kind) {
    case 'unknown':
      return isBusy
        ? 'Checking your connection…'
        : 'We could not check your connection. Try connecting again.'
    case 'unconfigured':
      return 'Not available on this deployment — no Google client is configured.'
    case 'disconnected':
      // Canon's copy, verbatim.
      return 'See all your events in one place.'
    case 'connected':
      return 'Connected. Your events appear alongside your plans.'
    case 'needsReconnect':
      return 'Kro no longer has access. Reconnect to see your events.'
    default:
      return assertNever(connection)
  }
}

const googleAction = (
  connection: GoogleConnectionState,
  isBusy: boolean,
): IntegrationAction => {
  if (isBusy) return IntegrationAction.busy
  switch (connection.kind) {
    case 'unknown':
      // Not busy and still unknown means the read did not answer — the state a
      // failed first status call leaves behind, because a failed *attempt* must
      // not overwrite a connection it learned nothing about. Offering Connect
      // is the recoverable move: the banner says what went wrong, and
      // `connectGoogleThunk` re-reads the connection before it navigates, so a
      // deployment that is in fact `unconfigured` reports that instead of
      // sending the browser somewhere that can only fail. Returning `busy` here
      // — the previous behaviour — left the row on a non-interactive "Working…"
      // indefinitely. (Reported by Copilot on KC-PR-#70.)
      return IntegrationAction.connect
    case 'unconfigured':
      return IntegrationAction.unavailable
    case 'disconnected':
      return IntegrationAction.connect
    case 'connected':
      return IntegrationAction.disconnect
    case 'needsReconnect':
      return IntegrationAction.reconnect
    default:
      return assertNever(connection)
  }
}

export interface IntegrationRowsInput {
  readonly connection: GoogleConnectionState
  readonly isBusy: boolean
  /** The `googleCalendar` feature flag. */
  readonly isGoogleEnabled: boolean
}

/**
 * The pane's rows, in canon's order: Kro Cloud, Google (flag-gated), then the
 * two Apple rows.
 */
export const integrationRows = (
  input: IntegrationRowsInput,
): readonly IntegrationRow[] => {
  const rows: IntegrationRow[] = [
    {
      id: IntegrationId.kroCloud,
      title: 'Kro Cloud',
      subtitle: 'Always on — stores your plans across devices.',
      glyph: 'icloud.fill',
      isConnected: true,
      action: IntegrationAction.none,
    },
  ]

  if (input.isGoogleEnabled) {
    rows.push({
      id: IntegrationId.google,
      title: 'Google Calendar',
      subtitle: googleIntegrationSubtitle(input.connection, input.isBusy),
      glyph: 'calendar.circle.fill',
      isConnected: input.connection.kind === 'connected',
      action: googleAction(input.connection, input.isBusy),
    })
  }

  rows.push(
    {
      id: IntegrationId.appleCalendar,
      title: 'Apple Calendar',
      // Canon's subtitle is "EventKit on this device." — true of a Mac and of
      // an iPhone, and false of every browser. The row stays; the sentence
      // becomes the one the web can defend.
      subtitle: 'Not available on the web — Apple provides no browser API.',
      glyph: 'calendar.circle.fill',
      isConnected: false,
      action: IntegrationAction.unavailable,
    },
    {
      id: IntegrationId.appleReminders,
      title: 'Apple Reminders',
      subtitle: 'Not available on the web — Apple provides no browser API.',
      glyph: 'checklist',
      isConnected: false,
      action: IntegrationAction.unavailable,
    },
  )

  return rows
}
