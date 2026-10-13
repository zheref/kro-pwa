/**
 * The platforms the sign-up offers, in the order the picker lists them: the
 * Apple devices first, the web, then what is still on the way.
 */
import type { KroPlatform } from '@kro/core'

export const EARLY_ACCESS_PLATFORM_ORDER: readonly KroPlatform[] = [
  'ios',
  'ipados',
  'macos',
  'watchos',
  'web',
  'android',
  'windows',
]
