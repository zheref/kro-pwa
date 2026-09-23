import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const STYLES = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'styles.css'),
  'utf8',
)

describe('the Chromium field-outline reset', () => {
  it('kills the user-agent outline on inputs', () => {
    expect(STYLES).toMatch(
      /:where\(input, textarea, select\)\s*\{[^}]*outline:\s*none/,
    )
  })

  it('repeats that kill on :focus, which is where Chromium paints it', () => {
    expect(STYLES).toMatch(
      /:where\(input, textarea, select\):focus[\s\S]*?outline:\s*none/,
    )
  })

  it('repeats it on :focus-visible, so a keyboard tab cannot restore the ring', () => {
    expect(STYLES).toMatch(
      /:where\(input, textarea, select\):focus-visible[\s\S]*?outline:\s*none/,
    )
  })

  it('keeps the browser text box unringed, and paints the FAB glow lime on the field', () => {
    expect(STYLES).toMatch(
      /:where\(input, textarea, select\):focus-visible[\s\S]*?box-shadow:\s*none/,
    )
    expect(STYLES).toMatch(
      /:where\(\[data-slot="input"\], \[data-slot="textarea"\]\):focus-visible[\s\S]*?box-shadow:\s*0 0 0 3px var\(--kro-color-glow-lime\)/,
    )
    expect(STYLES).toContain('var(--kro-color-glow-lime)')
  })
})

describe('the HIG control recipes', () => {
  it('pulls hig.css in through the one stylesheet, so a component never side-effect-imports CSS', () => {
    expect(STYLES).toContain('@import "../hig/hig.css"')
  })

  it('does not layer hig.css — those recipes are not meant to lose to a utility', () => {
    expect(STYLES).not.toMatch(/hig\.css"\s+layer/)
  })
})

describe('the Fluent 2 control recipes', () => {
  it('pulls fluent.css in through the one stylesheet', () => {
    expect(STYLES).toContain('@import "../fluent/fluent.css"')
  })

  it('does not layer fluent.css', () => {
    expect(STYLES).not.toMatch(/fluent\.css"\s+layer/)
  })
})
