import { describe, expect, it } from 'vitest'
import {
  TOKENS_CSS,
  darkDeclarations,
  darkPreferenceDeclarations,
  declarationsFor,
  declaredTokenNames,
  directAlias,
  lightDeclarations,
  parseBlocks,
  parseDeclarations,
  resolveToken,
  stripComments,
} from './tokenSource'

describe('parseBlocks', () => {
  it('reads a plain rule', () => {
    const blocks = parseBlocks(':root { --a: 1px; }')
    expect(blocks).toEqual([
      { selector: ':root', body: ' --a: 1px; ', within: null },
    ])
  })

  it('reaches into an at-rule so a media-wrapped rule is addressable', () => {
    const blocks = parseBlocks('@media (min-width: 1px) { .x { color: red; } }')
    expect(blocks).toHaveLength(1)
    expect(blocks[0]?.selector).toBe('.x')
    expect(blocks[0]?.within).toBe('@media (min-width: 1px)')
  })

  it('normalises whitespace in a selector so a wrapped one still matches', () => {
    expect(parseBlocks(':root:not([data-theme])\n  {  }')[0]?.selector).toBe(
      ':root:not([data-theme])',
    )
  })
})

describe('parseDeclarations', () => {
  it('splits on the outermost semicolons only', () => {
    expect(parseDeclarations('--a: rgb(1, 2, 3); --b: 4px;')).toEqual({
      '--a': 'rgb(1, 2, 3)',
      '--b': '4px',
    })
  })

  it('keeps a multi-line value intact and collapses its whitespace', () => {
    expect(
      parseDeclarations('--g: linear-gradient(\n  180deg,\n  red,\n  blue\n);'),
    ).toEqual({ '--g': 'linear-gradient( 180deg, red, blue )' })
  })

  it('tolerates a trailing declaration with no semicolon', () => {
    expect(parseDeclarations('--a: 1px')).toEqual({ '--a': '1px' })
  })
})

describe('stripComments', () => {
  it('removes block comments so a commented-out token is never parsed as live', () => {
    expect(
      stripComments(':root { /* --dead: 1px; */ --live: 2px; }'),
    ).not.toContain('--dead')
  })
})

describe('tokens.css', () => {
  it('declares the roles under :root', () => {
    const names = declaredTokenNames()
    expect(names).toContain('--kro-color-back')
    expect(names).toContain('--kro-role-kind-task')
    expect(names).toContain('--kro-space-medium')
  })

  it('keeps the media-query dark block and the [data-theme] dark block identical', () => {
    // Two blocks exist only because a @media rule cannot be reused as a
    // selector. If they ever diverge, the manual theme toggle silently stops
    // agreeing with the OS preference — a bug nobody sees until dark mode
    // looks wrong on one path and right on the other.
    expect(darkPreferenceDeclarations()).toEqual(darkDeclarations())
  })

  it('overrides nothing in dark that light never declared', () => {
    const light = lightDeclarations()
    const orphans = Object.keys(darkDeclarations()).filter(
      (name) => name.startsWith('--') && light[name] === undefined,
    )
    expect(
      orphans,
      'a dark-only token has no light value to fall back to',
    ).toEqual([])
  })

  it('resolves a theme by layering dark over light, so scales survive the flip', () => {
    const dark = declarationsFor('dark')
    expect(dark['--kro-color-back']).toBe('#2a2a2a')
    // Spacing is scheme-independent and is declared only once.
    expect(dark['--kro-space-medium']).toBe('16px')
  })

  it('follows a var() alias to the value a browser would paint', () => {
    expect(resolveToken('--kro-role-kind-task', 'light')).toBe('#1a5bc7')
    expect(resolveToken('--kro-role-kind-task', 'dark')).toBe('#5c9eff')
  })

  it('reports the declared alias target without guessing from equal values', () => {
    expect(directAlias('--kro-color-accent')).toBe('--kro-color-kro')
    // Same value in light mode, no declared alias between them.
    expect(directAlias('--kro-color-snow')).toBeNull()
  })

  it('throws on an unknown token instead of returning a plausible default', () => {
    expect(() => resolveToken('--kro-color-nope', 'light')).toThrow(
      /declares no/,
    )
  })

  it('ships the reduced-transparency and Safari notes it claims to', () => {
    expect(TOKENS_CSS).toContain('--kro-glass-surface-opaque')
    expect(TOKENS_CSS).toContain('--kro-opacity-disabled')
  })

  it('keys its themes off an attribute, never off :root, so a subtree can be themed', () => {
    // `:root[data-theme='dark']` would make the document the only unit a theme
    // can apply to, and the token gallery shows both schemes side by side on
    // one page. Checked against the parsed selectors, not the file text, so
    // prose in a comment cannot fail it.
    const selectors = parseBlocks(stripComments(TOKENS_CSS)).map(
      (block) => block.selector,
    )
    expect(selectors.filter((s) => s.includes(':root[data-theme'))).toEqual([])
    expect(selectors).toContain('[data-theme="dark"]')
  })

  it('makes the light values reachable through [data-theme="light"], not only :root', () => {
    // Otherwise a light subtree nested in a dark document inherits dark values
    // and only its `color-scheme` flips.
    const blocks = parseBlocks(stripComments(TOKENS_CSS))
    const lightColours = blocks.find(
      (block) => block.selector === ':root, [data-theme="light"]',
    )
    expect(lightColours, 'no shared light block').toBeDefined()
    expect(
      parseDeclarations(lightColours?.body ?? '')['--kro-color-back'],
    ).toBe('#fafafa')
  })
})
