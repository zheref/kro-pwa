/**
 * Kind / status / host → chip, the port of the three `Endeavor.*` extensions at
 * the foot of `KroUI/Models/Endeavor+UI.swift`.
 *
 * Each answers the same three questions — what does this value read as, which
 * glyph goes with it, which tint — and each keeps canon's own separation
 * between the two colour families:
 *
 *   · `badgeColor` (canon) is the raw system tint used by the legacy Find
 *     pills. It measures 2.0–3.5:1 and canon says so, in a comment, at the
 *     declaration. It is NOT ported. Porting a colour whose own source calls it
 *     unreadable would be a faithful copy of a bug.
 *   · `chipTint` / `KroTokens.Colors.*` (canon) is the contrast-verified badge
 *     palette. That is what these functions return, as design-system semantic
 *     roles, so a re-tune happens in `tokens.css` and lands here without an edit.
 *
 * Every function returns a *token role name*, never a colour value: the value
 * belongs to the stylesheet, and reading it in TypeScript is how a component
 * ends up with a light-mode colour baked into a dark-mode card.
 */

import type { SemanticRole } from '../system/tokens/roles'
import type { KitSymbolName } from './endeavorIcons'
import {
  EndeavorHost,
  EndeavorKind,
  EndeavorStatus,
  assertNever,
  endeavorHostIcon,
} from '@kro/core'

/* ------------------------------------------------------------------------ */
/* Kind                                                                      */
/* ------------------------------------------------------------------------ */

/** `Endeavor.Kind.glyphName`. */
export function kindGlyph(kind: EndeavorKind): KitSymbolName {
  switch (kind) {
    case EndeavorKind.task:
      return 'checkmark.circle.fill'
    case EndeavorKind.calendarEvent:
      return 'calendar'
    case EndeavorKind.habit:
      return 'arrow.2.circlepath'
    case EndeavorKind.reminder:
      return 'bell.fill'
    case EndeavorKind.behavior:
      return 'lightbulb.fill'
    case EndeavorKind.blueprint:
      return 'doc.plaintext'
    case EndeavorKind.background:
      return 'moon.fill'
    default:
      return assertNever(kind)
  }
}

/**
 * `Endeavor.Kind.shortLabel` — the chip label, which is NOT
 * `endeavorKindDisplayName`: canon abbreviates `calendarEvent` to "Event" on a
 * row and spells it "Calendar Event" everywhere else.
 */
export function kindShortLabel(kind: EndeavorKind): string {
  switch (kind) {
    case EndeavorKind.task:
      return 'Task'
    case EndeavorKind.calendarEvent:
      return 'Event'
    case EndeavorKind.habit:
      return 'Habit'
    case EndeavorKind.reminder:
      return 'Reminder'
    case EndeavorKind.behavior:
      return 'Behavior'
    case EndeavorKind.blueprint:
      return 'Blueprint'
    case EndeavorKind.background:
      return 'Background'
    default:
      return assertNever(kind)
  }
}

/** `Endeavor.Kind.badgeColor`, as the semantic role it resolves to. */
export function kindTint(kind: EndeavorKind): SemanticRole {
  switch (kind) {
    case EndeavorKind.task:
      return 'kindTask'
    case EndeavorKind.calendarEvent:
      return 'kindEvent'
    case EndeavorKind.habit:
      return 'kindHabit'
    case EndeavorKind.reminder:
      return 'kindReminder'
    case EndeavorKind.behavior:
      return 'kindBehavior'
    case EndeavorKind.blueprint:
      return 'kindBlueprint'
    case EndeavorKind.background:
      return 'kindBackground'
    default:
      return assertNever(kind)
  }
}

/* ------------------------------------------------------------------------ */
/* Status                                                                    */
/* ------------------------------------------------------------------------ */

/** `Endeavor.Status.glyphName` — so status never depends on colour alone. */
export function statusGlyph(status: EndeavorStatus): KitSymbolName {
  switch (status) {
    case EndeavorStatus.pending:
      return 'circle'
    case EndeavorStatus.planned:
      return 'calendar.badge.clock'
    case EndeavorStatus.ongoing:
      return 'play.circle.fill'
    case EndeavorStatus.paused:
      return 'pause.circle.fill'
    case EndeavorStatus.reviewing:
      return 'eye.circle.fill'
    case EndeavorStatus.delegated:
      return 'person.crop.circle.badge.checkmark'
    case EndeavorStatus.qa:
      return 'checkmark.seal'
    case EndeavorStatus.blocked:
      return 'exclamationmark.octagon.fill'
    case EndeavorStatus.closed:
      return 'checkmark.circle.fill'
    case EndeavorStatus.skipped:
      return 'arrow.uturn.forward.circle'
    default:
      return assertNever(status)
  }
}

/**
 * `Endeavor.Status.shortLabel`.
 *
 * Identical to `@kro/core`'s `endeavorStatusDisplayName` today, and deliberately
 * re-stated rather than aliased: canon keeps two properties because the row
 * label is free to shorten (as `Kind.shortLabel` already does) without dragging
 * the domain's display name with it.
 */
export function statusShortLabel(status: EndeavorStatus): string {
  switch (status) {
    case EndeavorStatus.pending:
      return 'Pending'
    case EndeavorStatus.planned:
      return 'Planned'
    case EndeavorStatus.ongoing:
      return 'Ongoing'
    case EndeavorStatus.paused:
      return 'Paused'
    case EndeavorStatus.reviewing:
      return 'Reviewing'
    case EndeavorStatus.delegated:
      return 'Delegated'
    case EndeavorStatus.qa:
      return 'QA'
    case EndeavorStatus.blocked:
      return 'Blocked'
    case EndeavorStatus.closed:
      return 'Closed'
    case EndeavorStatus.skipped:
      return 'Skipped'
    default:
      return assertNever(status)
  }
}

/** `Endeavor.Status.chipTint`. `closed` and `skipped` share the neutral chip. */
export function statusTint(status: EndeavorStatus): SemanticRole {
  switch (status) {
    case EndeavorStatus.pending:
      return 'statusPending'
    case EndeavorStatus.planned:
      return 'statusPlanned'
    case EndeavorStatus.ongoing:
      return 'statusOngoing'
    case EndeavorStatus.paused:
      return 'statusPaused'
    case EndeavorStatus.reviewing:
      return 'statusReviewing'
    case EndeavorStatus.delegated:
      return 'statusDelegated'
    case EndeavorStatus.qa:
      return 'statusQA'
    case EndeavorStatus.blocked:
      return 'statusBlocked'
    case EndeavorStatus.closed:
    case EndeavorStatus.skipped:
      return 'chipNeutral'
    default:
      return assertNever(status)
  }
}

/* ------------------------------------------------------------------------ */
/* Host                                                                      */
/* ------------------------------------------------------------------------ */

/** `Endeavor.Host.badgeColor`, as a semantic role. */
export function hostTint(host: EndeavorHost): SemanticRole {
  switch (host) {
    case EndeavorHost.supabase:
      return 'hostSupabase'
    case EndeavorHost.local:
      return 'hostLocal'
    case EndeavorHost.appleCalendar:
      return 'hostAppleCalendar'
    case EndeavorHost.appleReminders:
      return 'hostAppleReminders'
    case EndeavorHost.googleCalendar:
      return 'hostGoogleCalendar'
    case EndeavorHost.outlookCalendar:
      return 'hostOutlookCalendar'
    default:
      return assertNever(host)
  }
}

/**
 * `Endeavor.Host.glyphName`.
 *
 * Canon resolves this from the domain's own `iconRepresentation` rather than
 * re-listing the hosts, with a `questionmark.circle` fallback for the emoji
 * case — so the port reads `@kro/core`'s `endeavorHostIcon` for exactly the
 * same reason: adding a host means editing the domain, and nothing here.
 */
export function hostGlyph(host: EndeavorHost): KitSymbolName {
  const icon = endeavorHostIcon(host)
  return icon.type === 'glyph'
    ? (icon.name as KitSymbolName)
    : 'questionmark.circle'
}
