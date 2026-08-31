/**
 * The browser-side half of the token surface.
 *
 * `tokenSource.ts` parses the stylesheet at test time and answers "what does
 * the file say". This module asks the engine and answers "what is painted right
 * now" — which is the only correct answer once a theme attribute, a user
 * accent or a `prefers-color-scheme` change is in play. The Storybook gallery
 * reads through here so the swatch it shows is the swatch the browser
 * computed, never a value re-typed from the CSS.
 */

import type { ColorRole, SemanticRole } from './roles'
import { COLOR_ROLE_VARS, SEMANTIC_ROLE_VARS } from './roles'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

/** The attribute the stylesheet keys its explicit overrides off. */
export const THEME_ATTRIBUTE = 'data-theme'

function rootOf(element?: Element | null): Element | null {
  if (element != null) return element
  return typeof document === 'undefined' ? null : document.documentElement
}

/**
 * The computed value of a custom property, trimmed.
 *
 * Returns `''` outside a browser rather than throwing: a story rendered under
 * SSR must not crash, and an empty swatch is a visible, debuggable outcome.
 */
export function readToken(name: string, element?: Element | null): string {
  const target = rootOf(element)
  if (target === null || typeof getComputedStyle !== 'function') return ''
  return getComputedStyle(target).getPropertyValue(name).trim()
}

/** The computed value of a base palette role. */
export function readColorRole(role: ColorRole, element?: Element | null): string {
  return readToken(COLOR_ROLE_VARS[role], element)
}

/** The computed value of a semantic role, after the browser follows the alias. */
export function readSemanticRole(role: SemanticRole, element?: Element | null): string {
  return readToken(SEMANTIC_ROLE_VARS[role], element)
}

/**
 * Which scheme is actually in force: the explicit attribute if one is set,
 * otherwise the OS preference. Mirrors the cascade in `tokens.css` exactly —
 * `[data-theme]` wins, `prefers-color-scheme` decides the rest.
 */
export function resolveTheme(element?: Element | null): ResolvedTheme {
  const target = rootOf(element)
  const explicit = target?.getAttribute(THEME_ATTRIBUTE)
  if (explicit === 'dark' || explicit === 'light') return explicit
  if (typeof matchMedia !== 'function') return 'light'
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Pins the scheme, or hands it back to the OS with `'system'`.
 *
 * Writing the attribute is the whole mechanism — no class list, no inline
 * colours. The stylesheet already exempts `[data-theme='light']` from the
 * `prefers-color-scheme` block, so the two paths can never fight.
 */
export function setThemePreference(
  preference: ThemePreference,
  element?: Element | null,
): void {
  const target = rootOf(element)
  if (target === null) return
  if (preference === 'system') target.removeAttribute(THEME_ATTRIBUTE)
  else target.setAttribute(THEME_ATTRIBUTE, preference)
}
