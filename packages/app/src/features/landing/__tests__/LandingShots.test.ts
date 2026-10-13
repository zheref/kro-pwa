import { describe, expect, it } from 'vitest'
import { type LandingAssetKey, landingAssets } from '../LandingAssets'
import { shotFor } from '../LandingShots'

describe('shotFor', () => {
  it('serves the catalog WebP', () => {
    const shot = shotFor('webMyDayDesktopLight')
    expect(shot.src).toBe(landingAssets.webMyDayDesktopLight.src)
    expect(shot.src.endsWith('.webp')).toBe(true)
  })

  it('carries the catalog size and its real alt text', () => {
    const shot = shotFor('iosPlanTimeline')
    expect(shot.width).toBe(landingAssets.iosPlanTimeline.width)
    expect(shot.height).toBe(landingAssets.iosPlanTimeline.height)
    expect(shot.alt).toBe(landingAssets.iosPlanTimeline.alt)
    expect(shot.alt.length).toBeGreaterThan(20)
  })

  it('serves the catalog src as is — the WebP is the only file shipped', () => {
    for (const key of Object.keys(landingAssets) as LandingAssetKey[]) {
      expect(shotFor(key).src).toBe(landingAssets[key].src)
    }
    expect(shotFor('watchosFeatured').src).toMatch(/\.webp$/)
  })
})
