/**
 * `KroPlatform` — the surfaces Kro ships (or is asked to ship) on.
 *
 * The landing page's early-access form asks a visitor which platform they want
 * Kro on, so the value crosses a wire (the form → `/api/early-access` → the
 * waitlist sink). That makes it domain vocabulary, not view copy: it lives in
 * the platform-free tier, and the wire form is checked with `isKroPlatform`
 * before it becomes one.
 *
 * Labels are the product names a visitor recognises, not the OS identifiers.
 */
export type KroPlatform =
  | 'ios'
  | 'ipados'
  | 'macos'
  | 'watchos'
  | 'android'
  | 'windows'
  | 'web'

const LABELS: Readonly<Record<KroPlatform, string>> = {
  ios: 'iPhone',
  ipados: 'iPad',
  macos: 'Mac',
  watchos: 'Apple Watch',
  android: 'Android',
  windows: 'Windows',
  web: 'Web',
}

/** Every platform, in the order a picker lists them. */
const ALL: readonly KroPlatform[] = [
  'ios',
  'ipados',
  'macos',
  'watchos',
  'android',
  'windows',
  'web',
]

export const KroPlatforms = {
  all: ALL,

  /** The name a visitor reads — `ios` is "iPhone", `macos` is "Mac". */
  label(platform: KroPlatform): string {
    return LABELS[platform]
  },

  /** Narrows an untrusted value (a form field, a wire string) to a platform. */
  isKroPlatform(value: unknown): value is KroPlatform {
    return (
      typeof value === 'string' && (ALL as readonly string[]).includes(value)
    )
  },
}

/** Free-function form of `KroPlatforms.isKroPlatform`, for call-site brevity. */
export const isKroPlatform = (value: unknown): value is KroPlatform =>
  KroPlatforms.isKroPlatform(value)
