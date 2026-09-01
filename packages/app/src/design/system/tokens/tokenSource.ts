/**
 * Reads `tokens.css` — the shipped stylesheet, not a copy of it — and exposes
 * the token values per colour scheme.
 *
 * Why parse CSS instead of declaring the values in TypeScript and generating
 * the stylesheet: a generator makes the CSS a build artefact, and every
 * consumer of a design system reads the CSS. Keeping the stylesheet as the
 * source and parsing it here means the contrast suite measures exactly what a
 * browser will paint. There is no second copy to drift.
 *
 * NODE ONLY. This module reads the file from disk, so it belongs to the test
 * tier and is deliberately absent from `design/index.ts` — importing it from a
 * component would drag `node:fs` into the browser bundle. The browser-side
 * equivalent is `readToken.ts`, which asks the engine for the *computed* value
 * and therefore answers for the live theme.
 *
 * (A `?raw` import would have been tidier, but Vitest replaces CSS modules
 * with empty strings unless `test.css` is enabled, and that flag lives in a
 * config this change does not own.)
 *
 * The parser is deliberately small and total: it understands nested blocks,
 * at-rules and declarations, and nothing else. It never has to handle
 * arbitrary CSS — only this file, whose shape is asserted by
 * `tokenSource.test.ts`.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Resolved through `node:path` rather than `new URL('./tokens.css',
// import.meta.url)`: under jsdom the `URL` constructor in scope is jsdom's,
// which resolves a relative specifier against the *document* base and hands
// back `http://localhost:3000/…`. `import.meta.url` itself is a correct
// `file:` URL, so converting it once and joining is unambiguous.
const tokensCss = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'tokens.css'),
  'utf8',
)

export type Theme = 'light' | 'dark'

/** A parsed rule: its selector (or at-rule prelude) and its own declarations. */
export interface CssBlock {
  readonly selector: string
  readonly body: string
  /** The at-rule prelude this block sits inside, if any. */
  readonly within: string | null
}

/** The raw stylesheet text, exported so tests can assert against the source. */
export const TOKENS_CSS: string = tokensCss

/**
 * The selector each theme's declarations live under.
 *
 * `light` is matched against every top-level block whose selector LIST
 * contains `:root` — the scales and the light colours are declared separately
 * so the light values can also be reached through `[data-theme="light"]`.
 */
export const THEME_SELECTORS = {
  light: ':root',
  darkPreference: ':root:not([data-theme="light"])',
  darkAttribute: '[data-theme="dark"]',
} as const

export const DARK_PREFERENCE_AT_RULE = '@media (prefers-color-scheme: dark)'

const COMMENT = /\/\*[\s\S]*?\*\//g

export function stripComments(css: string): string {
  return css.replace(COMMENT, '')
}

/**
 * Splits a stylesheet into its blocks, recursing one level into at-rules so a
 * `@media`-wrapped rule is reachable by its own selector.
 */
export function parseBlocks(
  css: string,
  within: string | null = null,
): CssBlock[] {
  const blocks: CssBlock[] = []
  let prelude = ''
  let index = 0

  while (index < css.length) {
    const char = css[index]

    if (char === '{') {
      let depth = 1
      let cursor = index + 1
      while (cursor < css.length && depth > 0) {
        if (css[cursor] === '{') depth += 1
        else if (css[cursor] === '}') depth -= 1
        cursor += 1
      }
      const body = css.slice(index + 1, cursor - 1)
      const selector = prelude.trim().replace(/\s+/g, ' ')

      if (selector.startsWith('@')) {
        blocks.push(...parseBlocks(body, selector))
      } else {
        blocks.push({ selector, body, within })
      }

      prelude = ''
      index = cursor
      continue
    }

    prelude += char
    index += 1
  }

  return blocks
}

/**
 * Splits a rule body into `name -> value`, ignoring anything nested. Values
 * keep their internal commas and parentheses; only the outermost `;` splits.
 */
export function parseDeclarations(body: string): Record<string, string> {
  const declarations: Record<string, string> = {}
  let depth = 0
  let buffer = ''

  const flush = () => {
    const text = buffer.trim()
    buffer = ''
    if (text === '') return
    const colon = text.indexOf(':')
    if (colon === -1) return
    const name = text.slice(0, colon).trim()
    const value = text
      .slice(colon + 1)
      .trim()
      .replace(/\s+/g, ' ')
    if (name !== '') declarations[name] = value
  }

  for (const char of body) {
    if (char === '(') depth += 1
    else if (char === ')') depth -= 1

    if (char === ';' && depth === 0) {
      flush()
      continue
    }
    buffer += char
  }
  flush()

  return declarations
}

/** Splits a selector list into its individual, whitespace-normalised selectors. */
function selectorList(selector: string): string[] {
  return selector.split(',').map((part) => part.trim())
}

/**
 * Every block whose selector list contains `selector`, in source order.
 *
 * A list rather than a single match because the light values are split across
 * two rules on purpose — the scales under `:root` alone, the colours under
 * `:root, [data-theme="light"]` so a subtree can be themed.
 */
function blockBodies(selector: string, within: string | null): string[] {
  const source = stripComments(TOKENS_CSS)
  const matches = parseBlocks(source).filter(
    (block) =>
      block.within === within &&
      selectorList(block.selector).includes(selector),
  )
  if (matches.length === 0) {
    throw new Error(
      `tokens.css has no "${selector}" block${within === null ? '' : ` inside ${within}`}`,
    )
  }
  return matches.map((block) => block.body)
}

function mergedDeclarations(selector: string, within: string | null) {
  return blockBodies(selector, within).reduce<Record<string, string>>(
    (all, body) => Object.assign(all, parseDeclarations(body)),
    {},
  )
}

let lightCache: Record<string, string> | null = null
let darkCache: Record<string, string> | null = null

/** Every declaration that applies in light — the shared scales plus the colours. */
export function lightDeclarations(): Record<string, string> {
  lightCache ??= mergedDeclarations(THEME_SELECTORS.light, null)
  return lightCache
}

/** The `[data-theme="dark"]` overrides. Only the roles that actually flip. */
export function darkDeclarations(): Record<string, string> {
  darkCache ??= mergedDeclarations(THEME_SELECTORS.darkAttribute, null)
  return darkCache
}

/** The overrides carried by the `prefers-color-scheme` block. */
export function darkPreferenceDeclarations(): Record<string, string> {
  return mergedDeclarations(
    THEME_SELECTORS.darkPreference,
    DARK_PREFERENCE_AT_RULE,
  )
}

/** The declarations a browser would compute for `theme`, dark falling back to light. */
export function declarationsFor(theme: Theme): Record<string, string> {
  return theme === 'light'
    ? { ...lightDeclarations() }
    : { ...lightDeclarations(), ...darkDeclarations() }
}

const VAR_REFERENCE = /^var\(\s*(--[a-z0-9-]+)\s*\)$/

/**
 * The value a browser would land on for `name` in `theme`, following `var()`
 * aliases (the semantic roles are one hop off a badge fill).
 *
 * Throws rather than returning a default: an unresolvable token in the
 * contrast suite is a typo, and a silent fallback would report a passing
 * ratio for a colour that does not exist.
 */
export function resolveToken(name: string, theme: Theme): string {
  const declarations = declarationsFor(theme)
  const seen = new Set<string>()
  let current = name

  while (true) {
    if (seen.has(current)) {
      throw new Error(
        `tokens.css: "${name}" resolves in a cycle via "${current}"`,
      )
    }
    seen.add(current)

    const value = declarations[current]
    if (value === undefined) {
      throw new Error(
        `tokens.css declares no "${current}" (following "${name}")`,
      )
    }

    const alias = VAR_REFERENCE.exec(value)
    if (alias?.[1] === undefined) return value
    current = alias[1]
  }
}

/** Every custom property declared in `:root`, in source order. */
export function declaredTokenNames(): string[] {
  return Object.keys(lightDeclarations()).filter((name) =>
    name.startsWith('--'),
  )
}

/**
 * The custom property `name` points at, if its whole value is one `var()`.
 *
 * Coverage bookkeeping follows declared aliases and never value equality:
 * `--kro-color-snow` and `--kro-color-absolute` are both `#ffffff` in light
 * mode and are nonetheless different roles with different duties.
 */
export function directAlias(name: string): string | null {
  const value = lightDeclarations()[name]
  if (value === undefined) return null
  const alias = VAR_REFERENCE.exec(value)
  return alias?.[1] ?? null
}
