import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
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
const PAGES_DIR = join(__dirname, '../pages')
const entries = Object.entries(landingAssets) as [
  LandingAssetKey,
  LandingAsset,
][]

const onDisk = (url: string): string => join(PUBLIC_DIR, url)

/** Pixel size of a WebP file, read from its RIFF header (lossy, lossless or extended). */
function webpSize(
  bytes: Buffer,
  label: string,
): { width: number; height: number } {
  expect(bytes.subarray(0, 4).toString('latin1'), `${label} RIFF`).toBe('RIFF')
  expect(bytes.subarray(8, 12).toString('latin1'), `${label} WEBP`).toBe('WEBP')
  const chunk = bytes.subarray(12, 16).toString('latin1')
  if (chunk === 'VP8 ') {
    return {
      width: bytes.readUInt16LE(26) & 0x3fff,
      height: bytes.readUInt16LE(28) & 0x3fff,
    }
  }
  if (chunk === 'VP8L') {
    const bits = bytes.readUInt32LE(21)
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  if (chunk === 'VP8X') {
    return {
      width: bytes.readUIntLE(24, 3) + 1,
      height: bytes.readUIntLE(27, 3) + 1,
    }
  }
  throw new Error(`${label}: unknown WebP chunk "${chunk}"`)
}

/** Every non-test source under the landing pages, concatenated. */
function pageSources(dir: string): string {
  let text = ''
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      if (name !== '__tests__') text += pageSources(path)
    } else if (/\.tsx?$/.test(name) && !/\.(test|stories)\./.test(name)) {
      text += readFileSync(path, 'utf8')
    }
  }
  return text
}

describe('landingAssets catalog', () => {
  it('every src exists in apps/web/public — a renamed file fails here, not on the page', () => {
    for (const [key, asset] of entries) {
      expect(existsSync(onDisk(asset.src)), `${key}: ${asset.src}`).toBe(true)
    }
  })

  it('every src is a .webp — no PNG master is served', () => {
    for (const [key, asset] of entries) {
      expect(asset.src.endsWith('.webp'), `${key}: ${asset.src}`).toBe(true)
    }
  })

  it('width and height match the WebP header, so a re-captured image cannot leave the catalog stale', () => {
    for (const [key, asset] of entries) {
      const size = webpSize(readFileSync(onDisk(asset.src)), key)
      expect(size.width, `${key} width`).toBe(asset.width)
      expect(size.height, `${key} height`).toBe(asset.height)
    }
  })

  it('every catalog key is used by a section — an unused image does not ship', () => {
    const sources = pageSources(PAGES_DIR)
    for (const [key] of entries) {
      expect(sources.includes(`shotFor('${key}')`), key).toBe(true)
    }
  })

  it('every alt text is long enough to describe the screen to a screen-reader user', () => {
    for (const [key, asset] of entries) {
      expect(asset.alt.length, key).toBeGreaterThanOrEqual(30)
    }
  })

  it('no alt text contradicts its theme field', () => {
    for (const [key, asset] of entries) {
      if (
        asset.alt.includes('dark theme') ||
        asset.alt.includes('dark screen')
      ) {
        expect(asset.theme, key).toBe('dark')
      }
      if (asset.alt.includes('light theme')) {
        expect(asset.theme, key).toBe('light')
      }
    }
  })

  it('every key and every src is unique', () => {
    const keys = entries.map(([key]) => key)
    const sources = entries.map(([, asset]) => asset.src)
    expect(new Set(keys).size).toBe(keys.length)
    expect(new Set(sources).size).toBe(sources.length)
  })

  it('src is a root-relative /landing path', () => {
    for (const [key, asset] of entries) {
      expect(asset.src.startsWith('/landing/'), key).toBe(true)
    }
  })
})

describe('webpSize', () => {
  const header = (chunk: string): Buffer => {
    const b = Buffer.alloc(40)
    b.write('RIFF', 0, 'latin1')
    b.write('WEBP', 8, 'latin1')
    b.write(chunk, 12, 'latin1')
    return b
  }

  it('reads a lossy VP8 frame', () => {
    const b = header('VP8 ')
    b.writeUInt16LE(461, 26)
    b.writeUInt16LE(1000, 28)
    expect(webpSize(b, 'lossy')).toEqual({ width: 461, height: 1000 })
  })

  it('reads a lossless VP8L frame', () => {
    const b = header('VP8L')
    b.writeUInt32LE((300 - 1) | ((200 - 1) << 14), 21)
    expect(webpSize(b, 'lossless')).toEqual({ width: 300, height: 200 })
  })

  it('reads an extended VP8X canvas', () => {
    const b = header('VP8X')
    b.writeUIntLE(1999, 24, 3)
    b.writeUIntLE(999, 27, 3)
    expect(webpSize(b, 'extended')).toEqual({ width: 2000, height: 1000 })
  })

  it('refuses a file that is not a WebP, naming it', () => {
    expect(() => webpSize(Buffer.alloc(40), 'notAnImage')).toThrow()
  })
})

describe('landingAssetsByPlatform', () => {
  const PLATFORMS: LandingPlatform[] = ['web', 'ios', 'watchos', 'android']

  it('returns only the requested platform — the web captures are not mixed with iOS goldens', () => {
    const web = landingAssetsByPlatform('web')
    expect(web).toHaveLength(2)
    expect(web.every((asset) => asset.platform === 'web')).toBe(true)
  })

  it('partitions the catalog — every asset appears under exactly one platform', () => {
    const total = [...PLATFORMS, 'ipados' as const].reduce(
      (sum, platform) => sum + landingAssetsByPlatform(platform).length,
      0,
    )
    expect(total).toBe(entries.length)
  })

  it('every platform the page shows has at least one screenshot (iPadOS included)', () => {
    for (const platform of PLATFORMS) {
      expect(
        landingAssetsByPlatform(platform).length,
        platform,
      ).toBeGreaterThan(0)
    }
    expect(landingAssetsByPlatform('ipados')).toHaveLength(1)
  })
})
