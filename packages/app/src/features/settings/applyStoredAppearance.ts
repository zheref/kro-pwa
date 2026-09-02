/**
 * Apply the stored theme and palette to the document.
 *
 * The Appearance pane writes `general.appearance` and `general.palette` through
 * the ordinary preference path. Something still has to paint them: this is
 * that something, called from the composition root on boot and from the
 * settings write Producer after a successful change. It reads the preference
 * store, never the network.
 */
import {
  type LocalStore,
  appearanceOption,
  appearancePaletteOption,
  makePreferences,
} from '@kro/core'
import { applyAppearanceValues } from '../../design/system/tokens/readToken'

export interface StoredAppearance {
  readonly theme: string | null
  readonly palette: string | null
}

/** The two stored choices the composition root paints. */
export const readStoredAppearance = (
  localStore: LocalStore,
): StoredAppearance => {
  const preferences = makePreferences(localStore.preferences)
  const theme = preferences.read(appearanceOption)
  const palette = preferences.read(appearancePaletteOption)
  return {
    theme: typeof theme === 'string' ? theme : null,
    palette: typeof palette === 'string' ? palette : null,
  }
}

/** Stable identity of a stored pair, so a store subscriber can no-op. */
export const storedAppearanceKey = (stored: StoredAppearance): string =>
  `${stored.theme ?? ''}|${stored.palette ?? ''}`

export const applyStoredAppearance = (
  localStore: LocalStore,
): StoredAppearance => {
  const stored = readStoredAppearance(localStore)
  applyAppearanceValues(stored.theme, stored.palette)
  return stored
}
