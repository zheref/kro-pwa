import { describe, expect, it } from 'vitest'
import { landingAssets } from '../LandingAssets'
import { shotFor } from '../LandingShots'

describe('shotFor', () => {
  it('prefers the WebP sibling when the catalog has one', () => {
    const shot = shotFor('webMyDayDesktopDark')
    expect(shot.src).toBe(landingAssets.webMyDayDesktopDark.webp)
    expect(shot.src.endsWith('.webp')).toBe(true)
  })

  it('carries the catalog size and its real alt text', () => {
    const shot = shotFor('iosPlanTimeline')
    expect(shot.width).toBe(landingAssets.iosPlanTimeline.width)
    expect(shot.height).toBe(landingAssets.iosPlanTimeline.height)
    expect(shot.alt).toBe(landingAssets.iosPlanTimeline.alt)
    expect(shot.alt.length).toBeGreaterThan(20)
  })

  it('falls back to the PNG for an asset with no WebP', () => {
    const entries = Object.entries(landingAssets).filter(
      ([, a]) => a.webp === undefined,
    )
    for (const [key, asset] of entries) {
      expect(shotFor(key as keyof typeof landingAssets).src).toBe(asset.src)
    }
    expect(shotFor('watchosFeatured').src).toMatch(/\.(png|webp)$/)
  })
})
