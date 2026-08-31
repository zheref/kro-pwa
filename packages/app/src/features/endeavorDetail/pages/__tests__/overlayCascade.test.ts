/**
 * The one property the Detail overlay cannot assert from jsdom.
 *
 * `DetailOverlays` presents through the design system's `Sheet` and `Dialog`,
 * both of which are `kro-glass` **and** ask for `fixed` positioning with a
 * Tailwind utility. Unlayered CSS beats layered CSS, Tailwind emits every
 * utility inside `@layer utilities`, and `.kro-glass` sets `position: relative`
 * — so while `glass.css` was imported unlayered, every glass overlay in the app
 * rendered **inline in the document flow** instead of over it.
 *
 * jsdom applies no stylesheets, so no render test could see that: the sheet
 * mounted, announced itself as a dialog, and was still in the wrong place. It
 * took a production build with a real browser to surface it, which is exactly
 * the gap `UZF-26`'s visual evidence exists to close.
 *
 * The fix is one word in `styles.css` (`layer(components)`), and this is its
 * regression guard — read from the stylesheet on disk, the same way the design
 * system's own contrast suite reads `tokens.css`, because the property is a
 * fact about the CSS rather than about any component.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const STYLES = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../design/system/styles.css',
)

const source = readFileSync(STYLES, 'utf8')

/** Only the `@import` lines — the header prose names the same files. */
const imports = source
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.startsWith('@import'))

describe('the glass material must lose to a utility on the same element', () => {
  it('imports glass.css into a cascade layer, so `fixed` can beat `relative`', () => {
    const glass = imports.find((line) => line.includes('glass.css'))
    expect(glass).toBeDefined()
    expect(glass).toContain('layer(components)')
  })

  it('puts it in `components`, which Tailwind orders BEFORE `utilities`', () => {
    const glass = imports.find((line) => line.includes('glass.css')) ?? ''
    // `layer(utilities)` would tie with Tailwind's own utilities and resolve by
    // source order — a coin flip. `components` is the layer Tailwind declares
    // for exactly this: a default a utility may override.
    expect(glass).toMatch(/layer\(components\)/)
    expect(glass).not.toMatch(/layer\(utilities\)/)
  })

  it('leaves the token declarations unlayered — no utility competes with them', () => {
    const tokens = imports.find((line) => line.includes('tokens.css'))
    expect(tokens).toBeDefined()
    expect(tokens).not.toContain('layer(')
  })
})

describe('the glass rules this depends on are still there', () => {
  const glassSource = readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      '../../../../design/system/glass/glass.css',
    ),
    'utf8',
  )

  it('still sets the position a `fixed` overlay has to override', () => {
    // If this ever stops being true the layer is harmless; if it silently
    // becomes `position: fixed` the overlays would break the other way, so the
    // assertion names what the layering is FOR.
    expect(glassSource).toMatch(/\.kro-glass\s*\{[^}]*position:\s*relative/)
  })

  it('still sets the radius a sheet overrides for its top-only corners', () => {
    expect(glassSource).toMatch(/\.kro-glass\s*\{[^}]*border-radius:/)
  })
})
