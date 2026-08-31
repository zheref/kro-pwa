/**
 * `Endeavor.Host` — canon `KroCore/Model/Endeavor/Endeavor.swift`.
 *
 * Where an endeavor lives. An endeavor is hosted by zero or more of these at
 * once, and the combination is what `docs/Features/KroEnhanced.md` reads to
 * classify it as Kro-citizen (Kro hosts only), Kro-tourist (external only) or
 * Kro-enhanced (both) — see `EndeavorComputed`.
 *
 * The label trap: **`supabase` displays as "Kro"**, not "Supabase". The raw
 * value is the wire form and the display name is the product name; they differ
 * on purpose and neither may be derived from the other.
 *
 * The two Apple hosts are out of scope for the web epic (#1: EventKit has no
 * browser counterpart) but are ported anyway — an endeavor synced from Kro
 * Cloud can carry them, and dropping the cases would make that row
 * undecodable.
 */
import { assertNever } from '../../library/assertNever'
import {
  type IconRepresentation,
  glyphIcon,
} from '../shared/IconRepresentation'

export const EndeavorHost = {
  supabase: 'supabase',
  local: 'local',
  appleCalendar: 'appleCalendar',
  googleCalendar: 'googleCalendar',
  outlookCalendar: 'outlookCalendar',
  appleReminders: 'appleReminders',
} as const

export type EndeavorHost = (typeof EndeavorHost)[keyof typeof EndeavorHost]

/** `Host.allCases`, in canon declaration order. */
export const endeavorHosts: readonly EndeavorHost[] = [
  EndeavorHost.supabase,
  EndeavorHost.local,
  EndeavorHost.appleCalendar,
  EndeavorHost.googleCalendar,
  EndeavorHost.outlookCalendar,
  EndeavorHost.appleReminders,
]

/** `Host(rawValue:)` — narrows a raw string, or `null` when unknown. */
export const endeavorHostFromRawValue = (raw: string): EndeavorHost | null =>
  endeavorHosts.find((host) => host === raw) ?? null

/** `Host.displayName`. `supabase` → **"Kro"**. */
export const endeavorHostDisplayName = (host: EndeavorHost): string => {
  switch (host) {
    case EndeavorHost.supabase:
      return 'Kro'
    case EndeavorHost.appleCalendar:
      return 'Calendar'
    case EndeavorHost.local:
      return 'Local'
    case EndeavorHost.appleReminders:
      return 'Reminders'
    case EndeavorHost.googleCalendar:
      return 'Google Calendar'
    case EndeavorHost.outlookCalendar:
      return 'Outlook Calendar'
    default:
      return assertNever(host)
  }
}

/** `Host.iconRepresentation` — SF Symbol names, mapped to web icons by #6. */
export const endeavorHostIcon = (host: EndeavorHost): IconRepresentation => {
  switch (host) {
    case EndeavorHost.supabase:
      return glyphIcon('network')
    case EndeavorHost.local:
      return glyphIcon('memorychip')
    case EndeavorHost.appleCalendar:
      return glyphIcon('calendar')
    case EndeavorHost.appleReminders:
      return glyphIcon('checklist')
    case EndeavorHost.googleCalendar:
      return glyphIcon('g.circle.fill')
    case EndeavorHost.outlookCalendar:
      return glyphIcon('m.square.fill')
    default:
      return assertNever(host)
  }
}

/**
 * The two hosts Kro itself owns. `docs/Features/KroEnhanced.md`: an endeavor
 * hosted by one of these stores its Kro-enhanced overlay directly; one hosted
 * only elsewhere has nowhere to put it.
 */
export const kroOwnedHosts: readonly EndeavorHost[] = [
  EndeavorHost.supabase,
  EndeavorHost.local,
]

/** Whether `host` is a Kro-owned store rather than an external provider. */
export const isKroOwnedHost = (host: EndeavorHost): boolean =>
  kroOwnedHosts.includes(host)
