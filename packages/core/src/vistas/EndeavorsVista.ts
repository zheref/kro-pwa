/**
 * `EndeavorsVista` — canon `KroCore/Vistas/EndeavorsVista.swift`.
 *
 * The composite: an immutable `query` + a user-mutable `lens` + immutable
 * `capabilities` + immutable `presentation`, under one id. One vista answers
 * all four of the questions `docs/Features/EndeavorsVista.md` opens with —
 * where the data comes from, how it is narrowed, what can be done to a card,
 * and how the card looks — so a screen never reinvents any of them.
 *
 * ## What the port changes, and why
 *
 * Canon makes `lens` the one `var` and every other field a `let`; the composite
 * is mutable *because* the lens is. TypeScript objects are references, so the
 * same guarantee is spelled out the way the Endeavor domain already spells it:
 * every field is `readonly`, and the one sanctioned change — swapping the lens —
 * is `vistaWithLens`, which returns a **new** vista. That keeps the determinism
 * rule intact (`View = f(State)`): a screen's vista changes only by a named
 * transition, never by someone writing through a reference they happened to
 * hold.
 */
import type { EndeavorCapabilities } from './EndeavorCapabilities'
import type { EndeavorsLens } from './EndeavorsLens'
import { lensApplyingSnapshot } from './EndeavorsLens'
import type { EndeavorsLensSnapshot } from './EndeavorsLensSnapshot'
import type { EndeavorsQuery } from './EndeavorsQuery'
import type { PresentationStyle } from './PresentationStyle'

export interface EndeavorsVista {
  /** Stable per screen — also the key a persisted lens is stored under. */
  readonly id: string
  /** Screen title, where the screen shows one. `null` when it does not. */
  readonly title: string | null
  readonly query: EndeavorsQuery
  readonly lens: EndeavorsLens
  readonly capabilities: EndeavorCapabilities
  readonly presentation: PresentationStyle
}

export const makeEndeavorsVista = (params: {
  readonly id: string
  readonly title?: string | null
  readonly query: EndeavorsQuery
  readonly lens: EndeavorsLens
  readonly capabilities: EndeavorCapabilities
  readonly presentation: PresentationStyle
}): EndeavorsVista => ({
  id: params.id,
  title: params.title ?? null,
  query: params.query,
  lens: params.lens,
  capabilities: params.capabilities,
  presentation: params.presentation,
})

/** The one sanctioned transition: a copy carrying a different lens. */
export const vistaWithLens = (
  vista: EndeavorsVista,
  lens: EndeavorsLens,
): EndeavorsVista => ({ ...vista, lens })

/**
 * Restore a persisted snapshot onto a vista's default lens — what a screen does
 * on open, before it runs its query. The vista's `sort` and `exposes` survive,
 * so a save written when the screen exposed different toggles cannot change
 * which toggles it offers today.
 */
export const vistaApplyingSnapshot = (
  vista: EndeavorsVista,
  snapshot: EndeavorsLensSnapshot,
): EndeavorsVista =>
  vistaWithLens(vista, lensApplyingSnapshot(vista.lens, snapshot))
