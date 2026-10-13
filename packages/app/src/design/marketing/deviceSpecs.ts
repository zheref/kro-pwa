/**
 * Device geometry, in the device's own logical points.
 *
 * A frame is drawn once in these units and scaled to its column by CSS
 * container units, so a bezel is the same fraction of the screen at 240px wide
 * as at 412px wide. `outerWidth` is what a frame asks for at `scale` 1 — the
 * screen plus a bezel on each side — and the screenshot always fills the screen
 * rect (`object-fit: cover`), never the other way round.
 */
export interface DeviceSpec {
  /** Screen width, pt. */
  readonly screenWidth: number
  /** Screen height, pt. */
  readonly screenHeight: number
  /** Bezel on each side, pt. */
  readonly bezel: number
}

export const IPHONE: DeviceSpec = {
  screenWidth: 390,
  screenHeight: 844,
  bezel: 11,
}

export const ANDROID_PHONE: DeviceSpec = {
  screenWidth: 412,
  screenHeight: 892,
  bezel: 7,
}

/** An 11-inch iPad, portrait. */
export const IPAD: DeviceSpec = {
  screenWidth: 820,
  screenHeight: 1180,
  bezel: 18,
}

/** A 45 mm Apple Watch: the 198 x 242 pt screen. */
export const WATCH_45MM: DeviceSpec = {
  screenWidth: 198,
  screenHeight: 242,
  bezel: 16,
}

/** The macOS window the web app runs in, content area. */
export const MAC_WINDOW = { contentWidth: 1440, contentHeight: 900 } as const

export function outerWidth(spec: DeviceSpec): number {
  return spec.screenWidth + spec.bezel * 2
}

/** Rendered width in px for a device shown at `scale` of its logical size. */
export function renderedWidth(spec: DeviceSpec, scale: number): number {
  return Math.round(outerWidth(spec) * scale)
}
