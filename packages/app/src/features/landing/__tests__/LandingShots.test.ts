import { describe, expect, it } from 'vitest'
import { landingAssets } from '../LandingAssets'
import { shotFor } from '../LandingShots'

describe('shotFor', () => {
  it('serves the catalog WebP', () => {
    const shot = shotFor('webMyDayDesktopDark')
    expect(shot.src).toBe(landingAssets.webMyDayDesktopDark.src)
    expect(shot.src.endsWith('.webp')).toBe(true)
  })

  it('carries the catalog size and its real alt text', () => {
    const shot = shotFor('iosPlanTimeline')
    expect(shot.width).toBe(landingAssets.iosPlanTimeline.width)
    expect(shot.height).toBe(landingAssets.iosPlanTimeline.height)
    expect(shot.alt).toBe(landingAssets.iosPlanTimeline.alt)
    expect(shot.alt.length).toBeGreaterThan(20)
  })

  it('prefers an explicit webp override and otherwise falls back to src', () => {
    for (const [key, asset] of Object.entries(landingAssets)) {
      expect(shotFor(key as keyof typeof landingAssets).src).toBe(
        asset.webp ?? asset.src,
      )
    }
    expect(shotFor('watchosFeatured').src).toMatch(/\.webp$/)
  })
})
