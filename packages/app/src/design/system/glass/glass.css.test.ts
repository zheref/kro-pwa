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
