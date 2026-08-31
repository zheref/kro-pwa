/**
 * `Endeavor.Shadow` — canon `KroCore/Model/Endeavor/Endeavor.swift`.
 *
 * The record of where a mirrored endeavor originally came from: the external
 * item's title and stable identifier, the kind and provider it was read as,
 * and the provider-side group (list / calendar) it sat in. Per
 * `docs/Features/KroEnhanced.md` the shadow is also what carries a
 * Kro-enhanced overlay's link back to its host record.
 *
 * `appleReminderPriority` has a three-way meaning that a plain number hides,
 * so it is spelled out here: `0` explicitly means "the reminder has **no**
 * priority", while `null` means the shadow predates source-metadata
 * persistence and its stored `kind` must be used instead. Collapsing the two
 * would silently reclassify old rows.
 */
import type { EndeavorKind } from './EndeavorKind'

export interface Shadow {
  readonly originalTitle: string
  readonly sourceIdentifier: string
  readonly kind: EndeavorKind
  readonly source: string
  readonly group: string | null
  /**
   * Raw priority supplied by Apple Reminders. `0` explicitly means "no
   * priority"; `null` means the cached shadow predates source-metadata
   * persistence and must fall back to its stored `kind`.
   */
  readonly appleReminderPriority: number | null
}

/** `Shadow(originalTitle:sourceIdentifier:kind:source:group:…)`. */
export const makeShadow = (params: {
  readonly originalTitle: string
  readonly sourceIdentifier: string
  readonly kind: EndeavorKind
  readonly source: string
  readonly group?: string | null
  readonly appleReminderPriority?: number | null
}): Shadow => ({
  originalTitle: params.originalTitle,
  sourceIdentifier: params.sourceIdentifier,
  kind: params.kind,
  source: params.source,
  group: params.group ?? null,
  appleReminderPriority: params.appleReminderPriority ?? null,
})

/**
 * `Shadow.nothing` — the empty sentinel canon vends for "shadowing nothing".
 * Built fresh on each call so no caller can share (and no caller can mutate)
 * a single instance.
 */
export const shadowNothing = (): Shadow =>
  makeShadow({
    originalTitle: '',
    sourceIdentifier: '',
    kind: 'task',
    source: '',
    group: null,
  })
