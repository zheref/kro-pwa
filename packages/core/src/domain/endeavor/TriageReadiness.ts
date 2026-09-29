/**
 * Triage readiness — canon `KroCore/Domain/Triage/TriageReadiness.swift`.
 *
 * The single, deterministic answer to "does this endeavor still owe the user a
 * triage decision?", and the one place the answer turns on the endeavor's
 * **kind**. Every surface that asks — the Inbox's Pending Triage section, the
 * Triage screen's own open, the trailing pane's Triage segment — reads it from
 * here so they can never disagree.
 *
 * Canon's form itself does not vary by kind: the fields, defaults, gate and
 * decision are the same for every kind Triage applies to. What varies is
 * *whether* Triage applies at all:
 *
 * | kind | triageable |
 * |---|---|
 * | task, reminder | yes |
 * | habit | no — a standing commitment decided at creation |
 * | calendar event | no — already a commitment to a moment |
 * | behavior, blueprint, background | no |
 *
 * Canon switches on `resolvedKind`; this tier reads `kind` and lets a caller
 * that has reconciliation context pass the resolved kind in (the same
 * convention `EndeavorComputedState` states).
 */
import type { Endeavor } from './Endeavor'
import { hasBeenCompleted, isCompleted } from './EndeavorComputed'
import { EndeavorKind } from './EndeavorKind'
import { EndeavorStatus } from './EndeavorStatus'
import { assertNever } from '../../library/assertNever'

/** Whether Triage applies to this kind at all — canon's `awaitsTriage` switch. */
export const isTriageableKind = (kind: EndeavorKind): boolean => {
  switch (kind) {
    case EndeavorKind.task:
    case EndeavorKind.reminder:
      return true
    case EndeavorKind.habit:
    case EndeavorKind.calendarEvent:
    case EndeavorKind.behavior:
    case EndeavorKind.blueprint:
    case EndeavorKind.background:
      return false
    default:
      return assertNever(kind)
  }
}

/**
 * `hasTriageDisposition` — scheduled (`start`), delegated, closed or skipped.
 * All three end the question the Inbox exists to ask.
 */
export const hasTriageDisposition = (endeavor: Endeavor): boolean => {
  if (endeavor.start !== null) return true
  return (
    endeavor.status === EndeavorStatus.delegated ||
    endeavor.status === EndeavorStatus.closed ||
    endeavor.status === EndeavorStatus.skipped
  )
}

/**
 * `hasTriageRatings` — value, deadline and reward all present. Effort is
 * deliberately not required: an endeavor is actionable without it.
 */
export const hasTriageRatings = (endeavor: Endeavor): boolean =>
  endeavor.value !== null &&
  endeavor.due !== null &&
  endeavor.sessionPoints !== null

/** `isTriageReady` — every rating present **and** a disposition. */
export const isTriageReady = (endeavor: Endeavor): boolean =>
  hasTriageRatings(endeavor) && hasTriageDisposition(endeavor)

/**
 * Whether Triage may be opened on this endeavor at all: a triageable kind
 * that has not been completed. Re-triaging an already-ready task is allowed —
 * it is `awaitsTriage` that asks whether a decision is still *owed*.
 *
 * Canon has no separate operator for this: its only Triage entry point is the
 * Inbox row, which `awaitsTriage` already filters. The web's pane segment can
 * point Triage at any endeavor, so the kind half of `awaitsTriage` is named.
 */
export const canBeTriaged = (
  endeavor: Endeavor,
  kind: EndeavorKind = endeavor.kind,
): boolean =>
  !isCompleted(endeavor) &&
  !hasBeenCompleted(endeavor) &&
  isTriageableKind(kind)

/**
 * `awaitsTriage` — still owes a triage decision **and** is the kind of thing
 * Triage applies to.
 */
export const awaitsTriage = (
  endeavor: Endeavor,
  kind: EndeavorKind = endeavor.kind,
): boolean => canBeTriaged(endeavor, kind) && !isTriageReady(endeavor)
