import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const PALETTES = readFileSync(join(here, 'palettes.css'), 'utf8')
const STYLES = readFileSync(join(here, '../styles.css'), 'utf8')

describe('appearance palettes stylesheet', () => {
  it('is pulled into the one design-system entry', () => {
    expect(STYLES).toContain('./tokens/palettes.css')
  })

  it('paints green as a deepened forest ramp, not the badge tint', () => {
    expect(PALETTES).toContain('[data-palette="green"]')
    expect(PALETTES).toContain('--kro-color-header-gradient-indigo: #1b7d3e')
    expect(PALETTES).toContain('--kro-color-header-gradient-grape: #0b4f2a')
  })

  it('repeats every dark ramp on the explicit theme attribute', () => {
    expect(PALETTES).toContain('[data-theme="dark"][data-palette="green"]')
    expect(PALETTES).toContain('[data-theme="dark"][data-palette="orange"]')
    expect(PALETTES).toContain('[data-theme="dark"][data-palette="red"]')
  })
})
