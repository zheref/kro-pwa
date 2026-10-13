/**
 * Catalog entry → the props a device frame takes.
 *
 * The frames render one `<img>`; they take a single URL. The WebP sibling is
 * preferred (smaller, supported by every browser the app targets) and the PNG
 * is the catalog's guaranteed fallback when a shot has no sibling.
 */
import { type LandingAssetKey, landingAssets } from './LandingAssets'

export interface LandingShot {
  readonly src: string
  readonly alt: string
  readonly width: number
  readonly height: number
}

export function shotFor(key: LandingAssetKey): LandingShot {
  const asset = landingAssets[key]
  return {
    src: asset.src,
    alt: asset.alt,
    width: asset.width,
    height: asset.height,
  }
}
