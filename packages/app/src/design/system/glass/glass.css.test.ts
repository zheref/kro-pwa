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
