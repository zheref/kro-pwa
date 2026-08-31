/**
 * `IconRepresentation` — canon `KroCore/Model/CommonConstructs.swift`.
 *
 * A two-case enum with associated values, ported as a discriminated union
 * (`RC-24`). The `glyph` payload is an **SF Symbol name**, which no browser
 * can render: the design-system child (#6) picks the web icon set once and
 * maps these names onto it. Carrying the canon names here rather than
 * inventing web ones keeps that mapping a single, reviewable table instead of
 * a per-surface guess.
 */

export type IconRepresentation =
  | { readonly type: 'glyph'; readonly name: string }
  | { readonly type: 'emoji'; readonly value: string }

/** `.glyph(name)` — an SF Symbol name awaiting the #6 web-icon mapping. */
export const glyphIcon = (name: string): IconRepresentation => ({
  type: 'glyph',
  name,
})

/** `.emoji(value)` — a literal emoji, renderable as-is on every platform. */
export const emojiIcon = (value: string): IconRepresentation => ({
  type: 'emoji',
  value,
})
