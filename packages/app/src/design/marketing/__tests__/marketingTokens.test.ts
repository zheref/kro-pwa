import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  parseBlocks,
  parseDeclarations,
  stripComments,
} from '../../system/tokens/tokenSource'

const HERE = dirname(fileURLToPath(import.meta.url))
const read = (relative: string) => readFileSync(join(HERE, relative), 'utf8')

const TOKENS = read('../../system/tokens/tokens.css')
const MARKETING = read('../marketing.css')
const STYLES = read('../../system/styles.css')

const EXPECTED: Record<string, string> = {
  '--kro-text-hero': 'clamp(2.75rem, 1.4rem + 6.4vw, 6.5rem)',
  '--kro-text-display-1': 'clamp(2.5rem, 1.6rem + 3.6vw, 4.5rem)',
  '--kro-text-display-2': 'clamp(2rem, 1.4rem + 2.2vw, 3rem)',
  '--kro-text-lede': 'clamp(1.125rem, 1rem + 0.5vw, 1.375rem)',
  '--kro-text-body-marketing': '1.0625rem',
  '--kro-tracking-display': '-0.045em',
  '--kro-tracking-title': '-0.03em',
  '--kro-container-narrow': '720px',
  '--kro-container': '1120px',
  '--kro-container-wide': '1320px',
  '--kro-section-gap': 'clamp(4rem, 10vw, 8rem)',
  '--kro-radius-device': '44px',
  '--kro-nav-h': '48px',
}

describe('marketing tokens', () => {
  const blocks = parseBlocks(stripComments(TOKENS))
  const rootBlock = blocks.find(
    (block) =>
      block.selector === ':root' && block.body.includes('color-scheme'),
  )

  it('declares every marketing token in the scheme-free :root block', () => {
    const declared = parseDeclarations(rootBlock?.body ?? '')
    for (const [name, value] of Object.entries(EXPECTED)) {
      expect(declared[name], name).toBe(value)
    }
  })

  it('keeps them out of the light and dark scheme blocks', () => {
    for (const block of blocks) {
      if (block === rootBlock) continue
      for (const name of Object.keys(EXPECTED)) {
        expect(block.body, `${block.selector} leaks ${name}`).not.toContain(
          `${name}:`,
        )
      }
    }
  })
})

describe('marketing.css', () => {
  it('is imported by the design system stylesheet', () => {
    expect(STYLES).toContain('@import "../marketing/marketing.css";')
  })

  it('defines the classes the components render', () => {
    for (const selector of [
      '.kro-display-hero',
      '.kro-display-1',
      '.kro-display-2',
      '.kro-lede',
      '.kro-eyebrow',
      '.kro-marketing-section',
      '.kro-marketing-container',
      '.kro-reveal',
      '.kro-gradient-text',
      '.kro-glow-blob',
      '.kro-hairline-grid',
    ]) {
      expect(MARKETING, selector).toContain(selector)
    }
  })

  it('reads colours from tokens and never retypes a hex value', () => {
    expect(MARKETING).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('honours reduced motion on the reveal', () => {
    expect(MARKETING).toMatch(
      /@media \(prefers-reduced-motion: no-preference\)\s*\{\s*\.kro-reveal\.is-armed/,
    )
  })

  it('keeps the reveal visible by default (only is-armed hides)', () => {
    expect(MARKETING).not.toMatch(/\.kro-reveal\s*\{[^}]*opacity:\s*0/)
  })
})
