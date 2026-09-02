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

  it('pairs that kill with the design-system ring, so keyboard focus stays visible', () => {
    expect(STYLES).toMatch(
      /:where\(input, textarea, select\):focus-visible[\s\S]*?box-shadow:\s*var\(--kro-ring\)/,
    )
  })
})
