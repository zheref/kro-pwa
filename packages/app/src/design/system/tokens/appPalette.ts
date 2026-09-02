/**
 * The four selectable appearance palettes — canon `KroUI/Theme/AppPalette`.
 *
 * Stops are transcribed from KroApple's Palette colorsets. Purple's light
 * ramp is byte-identical to the indigo→grape header the app already ships,
 * so a user who never opens Appearance sees no change.
 */

export const PALETTE_ATTRIBUTE = 'data-palette'

export const AppPaletteId = {
  purple: 'purple',
  green: 'green',
  orange: 'orange',
  red: 'red',
} as const

export type AppPaletteId = (typeof AppPaletteId)[keyof typeof AppPaletteId]

export const APP_PALETTE_IDS: readonly AppPaletteId[] = [
  AppPaletteId.purple,
  AppPaletteId.green,
  AppPaletteId.orange,
  AppPaletteId.red,
]

export const DEFAULT_APP_PALETTE: AppPaletteId = AppPaletteId.purple

export interface AppPaletteRamp {
  readonly start: string
  readonly end: string
  readonly accent: string
}

export interface AppPaletteSpec {
  readonly id: AppPaletteId
  readonly label: string
  readonly light: AppPaletteRamp
  readonly dark: AppPaletteRamp
}

export const APP_PALETTES: Readonly<Record<AppPaletteId, AppPaletteSpec>> = {
  purple: {
    id: AppPaletteId.purple,
    label: 'Purple',
    light: { start: '#5856d6', end: '#663399', accent: '#5856d6' },
    dark: { start: '#3b3a94', end: '#42216b', accent: '#9c99f7' },
  },
  green: {
    id: AppPaletteId.green,
    label: 'Green',
    light: { start: '#1b7d3e', end: '#0b4f2a', accent: '#1b7d3e' },
    dark: { start: '#12542a', end: '#07351c', accent: '#34c759' },
  },
  orange: {
    id: AppPaletteId.orange,
    label: 'Orange',
    light: { start: '#c2410c', end: '#7c2d12', accent: '#c2410c' },
    dark: { start: '#822c08', end: '#531e0c', accent: '#ffa21f' },
  },
  red: {
    id: AppPaletteId.red,
    label: 'Red',
    light: { start: '#b7162f', end: '#7a0f22', accent: '#b7162f' },
    dark: { start: '#7b0f1f', end: '#520a17', accent: '#ff7373' },
  },
}

/** Resolves a stored raw value, falling back to Purple for anything unknown. */
export const appPaletteNamed = (
  raw: string | null | undefined,
): AppPaletteId =>
  raw === AppPaletteId.green ||
  raw === AppPaletteId.orange ||
  raw === AppPaletteId.red ||
  raw === AppPaletteId.purple
    ? raw
    : DEFAULT_APP_PALETTE
