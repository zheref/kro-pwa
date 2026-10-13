import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  type LandingAsset,
  type LandingAssetKey,
  type LandingPlatform,
  landingAssets,
  landingAssetsByPlatform,
} from '../LandingAssets'

const PUBLIC_DIR = join(__dirname, '../../../../../../apps/web/public')
const entries = Object.entries(landingAssets) as [
  LandingAssetKey,
  LandingAsset,
][]

const onDisk = (url: string): string => join(PUBLIC_DIR, url)

describe('landingAssets catalog', () => {
  it('every src exists in apps/web/public — a renamed file fails here, not on the page', () => {
    for (const [key, asset] of entries) {
      expect(existsSync(onDisk(asset.src)), `${key}: ${asset.src}`).toBe(true)
    }
  })

  it('every webp sibling named in the catalog exists on disk', () => {
    for (const [key, asset] of entries) {
      if (asset.webp === undefined) continue
      expect(existsSync(onDisk(asset.webp)), `${key}: ${asset.webp}`).toBe(true)
    }
  })

  it('width and height match the PNG header, so a re-captured image cannot leave the catalog stale', () => {
    for (const [key, asset] of entries) {
      const header = readFileSync(onDisk(asset.src)).subarray(0, 24)
      expect(header.subarray(1, 4).toString('latin1'), `${key} is a PNG`).toBe(
        'PNG',
      )
      expect(header.readUInt32BE(16), `${key} width`).toBe(asset.width)
      expect(header.readUInt32BE(20), `${key} height`).toBe(asset.height)
    }
  })

  it('every alt text is long enough to describe the screen to a screen-reader user', () => {
    for (const [key, asset] of entries) {
      expect(asset.alt.length, key).toBeGreaterThanOrEqual(30)
    }
  })

  it('every key and every src is unique', () => {
    const keys = entries.map(([key]) => key)
    const sources = entries.map(([, asset]) => asset.src)
    expect(new Set(keys).size).toBe(keys.length)
    expect(new Set(sources).size).toBe(sources.length)
  })

  it('src is a root-relative /landing path and the webp sibling mirrors it', () => {
    for (const [key, asset] of entries) {
      expect(asset.src.startsWith('/landing/'), key).toBe(true)
      if (asset.webp !== undefined) {
        expect(asset.webp, key).toBe(asset.src.replace(/\.png$/, '.webp'))
      }
    }
  })
})

describe('landingAssetsByPlatform', () => {
  it('returns only the requested platform — the web captures are not mixed with iOS goldens', () => {
    const web = landingAssetsByPlatform('web')
    expect(web.length).toBeGreaterThanOrEqual(10)
    expect(web.every((asset) => asset.platform === 'web')).toBe(true)
  })

  it('partitions the catalog — every asset appears under exactly one platform', () => {
    const platforms: LandingPlatform[] = [
      'web',
      'ios',
      'ipados',
      'watchos',
      'android',
    ]
    const total = platforms.reduce(
      (sum, platform) => sum + landingAssetsByPlatform(platform).length,
      0,
    )
    expect(total).toBe(entries.length)
  })

  it('every platform in the family has at least one screenshot', () => {
    for (const platform of [
      'web',
      'ios',
      'ipados',
      'watchos',
      'android',
    ] as const) {
      expect(
        landingAssetsByPlatform(platform).length,
        platform,
      ).toBeGreaterThan(0)
    }
  })
})
