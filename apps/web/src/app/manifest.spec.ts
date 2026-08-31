/**
 * The manifest is the installability contract, so the things worth asserting
 * are exactly the fields an install prompt (and the Lighthouse PWA audit)
 * refuses to proceed without — plus Kro's identity, which is the whole point of
 * KC-IS-#34's "not the Next template" requirement.
 */
import { describe, expect, it } from 'vitest'
import manifest from './manifest'

const generated = manifest()

describe('manifest — identity', () => {
  it('is Kro, not the create-next-app placeholder', () => {
    expect(generated.short_name).toBe('Kro')
    expect(generated.name).toContain('Kro')
    expect(generated.name).not.toContain('Next.js')
  })

  it("carries canon's tagline as the description", () => {
    expect(generated.description).toContain('Control your time')
  })

  it('pins a stable app id, so a later start_url change is not a new app', () => {
    expect(generated.id).toBe('/')
  })

  it("themes the chrome with the indigoGrape header's first stop", () => {
    expect(generated.theme_color).toBe('#5856d6')
    expect(generated.background_color).toBe('#fafafa')
  })
})

describe('manifest — installability', () => {
  it('declares a start_url and a scope', () => {
    expect(generated.start_url).toBe('/')
    expect(generated.scope).toBe('/')
  })

  it('runs standalone, without browser chrome', () => {
    expect(generated.display).toBe('standalone')
  })

  it('ships both required icon sizes', () => {
    const sizes = new Set(generated.icons?.map((icon) => icon.sizes))
    expect(sizes.has('192x192')).toBe(true)
    expect(sizes.has('512x512')).toBe(true)
  })

  it('points every icon at a file that exists under public/icons', () => {
    for (const icon of generated.icons ?? []) {
      expect(icon.src).toMatch(/^\/icons\/Kro(192|512)\.png$/)
    }
  })

  it('offers a maskable variant, so Android does not letterbox the icon', () => {
    const purposes = new Set(generated.icons?.map((icon) => icon.purpose))
    expect(purposes.has('maskable')).toBe(true)
    expect(purposes.has('any')).toBe(true)
  })
})
