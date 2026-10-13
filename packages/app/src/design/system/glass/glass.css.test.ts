import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'glass.css'),
  'utf8',
)

describe('the pressed-in glass bezel', () => {
  it('stamps a selected surface with an inset outline, not a floating rim', () => {
    expect(CSS).toMatch(/\.kro-glass--pressed\s*\{[^}]*inset 0 0 0 1\.5px/)
  })

  it('puts a darker lip on the top edge so the card reads pushed into the field', () => {
    expect(CSS).toMatch(/\.kro-glass--pressed\s*\{[^}]*inset 0 2px 0 0/)
  })

  it('does not scale the selected state — scale is :active on interactive glass', () => {
    const pressed = CSS.match(/\.kro-glass--pressed\s*\{[^}]+\}/)?.[0] ?? ''
    expect(pressed).not.toContain('scale')
  })
})

describe('control glass', () => {
  it('lights the rim from a source instead of a uniform ring', () => {
    const glass = CSS.match(/\.kro-glass\s*\{[^}]+\}/)?.[0] ?? ''
    expect(glass).toContain('--kro-glass-light-rim')
    expect(glass).not.toContain('inset 0 0 0 1px var(--kro-glass-rim)')
  })

  it('rounds the popover like a menu row', () => {
    expect(CSS).toMatch(/\.kro-popover\.kro-glass\s*\{[^}]*--kro-radius-small/)
  })

  it('does not force a 44px floor — height belongs to the control', () => {
    const control = CSS.match(/\.kro-glass--control\s*\{[^}]+\}/)?.[0] ?? ''
    expect(control).not.toContain('min-height')
  })

  it('tints filled buttons with the live accent and the danger role', () => {
    expect(CSS).toContain('.kro-glass--accent')
    expect(CSS).toContain('.kro-glass--danger')
    expect(CSS).toContain('var(--kro-color-accent)')
    expect(CSS).toContain('var(--kro-color-banner-danger)')
  })
})

describe('the lit state', () => {
  it('lights on keyboard focus, on the script class and on a control press', () => {
    expect(CSS).toMatch(/\.kro-glass--lit,/)
    expect(CSS).toMatch(/:focus-visible\s*\n?\s*\)::after/)
    expect(CSS).toMatch(/:is\(:hover, :focus-visible, :active\)/)
    expect(CSS).toContain('.kro-glass:not(.kro-glass--bar):is(')
  })

  it('draws the lit rim with zero offsets so every edge glows alike', () => {
    const rim = CSS.match(/--kro-glass-lit-rim:([^;]+);/)?.[1] ?? ''
    expect(rim).toContain('inset 0 0 ')
    expect(rim).not.toMatch(/var\(--kro-glass-light-[xy]\)/)
  })

  it('centres the lit sheen instead of aiming it at a corner', () => {
    const sheen = CSS.match(/--kro-glass-lit-sheen:([^;]+);/)?.[1] ?? ''
    expect(sheen).toContain('at 50% 50%')
  })

  it('keeps the two-tone focus ring on interactive glass', () => {
    expect(CSS).toMatch(
      /\.kro-glass--interactive:focus-visible\s*\{[^}]*box-shadow: var\(--kro-ring\)/,
    )
  })
})

describe('the bar', () => {
  const bar = CSS.match(/\.kro-glass--bar::after\s*\{[^}]+\}/)?.[0] ?? ''

  it('draws no ring — top, left and right stay dark', () => {
    expect(bar).toContain('box-shadow: none')
  })

  it('anchors every light layer to the bottom edge', () => {
    const layers = bar.match(/ 100% \//g) ?? []
    expect(layers.length).toBeGreaterThanOrEqual(3)
    expect(bar).not.toMatch(/ 0 0 \//)
  })

  it('follows the pointer x along the edge', () => {
    expect(bar).toContain('var(--kro-glass-bar-x)')
  })

  it('lights the whole bottom edge when lit or when a control has focus', () => {
    expect(CSS).toMatch(
      /\.kro-glass--bar:is\(\.kro-glass--lit, :has\(:focus-visible\)\)::after/,
    )
  })
})

describe('glass.css — reduced transparency', () => {
  it('keeps the bar an opaque bottom hairline, lit or not, where every other rim goes dark', () => {
    const reduced = CSS.slice(
      CSS.indexOf('@media (prefers-reduced-transparency: reduce)'),
    )
    expect(reduced).toContain('background: none')
    expect(reduced).toMatch(
      /\.kro-glass--bar::after,\s*\.kro-glass--bar:is\([\s\S]*?\)\)::after\s*\{\s*background:\s*linear-gradient\(/,
    )
    expect(reduced.indexOf('.kro-glass--bar::after,')).toBeGreaterThan(
      reduced.indexOf('background: none'),
    )
  })
})
