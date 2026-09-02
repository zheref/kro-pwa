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

export const applyStoredAppearance = (localStore: LocalStore): void => {
  const preferences = makePreferences(localStore.preferences)
  const theme = preferences.read(appearanceOption)
  const palette = preferences.read(appearancePaletteOption)
  applyAppearanceValues(
    typeof theme === 'string' ? theme : null,
    typeof palette === 'string' ? palette : null,
  )
}
