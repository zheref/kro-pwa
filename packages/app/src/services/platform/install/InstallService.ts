/**
 * PWA installation — a web-only boundary with no canon counterpart (an iOS app
 * is installed from the App Store), so the shape is derived from the platform
 * rather than ported (`RC-6`, `RC-33`, `RC-59`).
 *
 * The whole mechanism is one browser event. Chromium fires
 * `beforeinstallprompt` once the installability criteria are met (a manifest
 * with the right fields, a registered service worker, HTTPS), the page must
 * `preventDefault()` it to stop the browser's own mini-infobar, and the
 * captured event is the **only** way to raise the install dialog later. Safari
 * and Firefox never fire it; there the answer is "not available" and the user
 * installs through the browser's own Share menu, which no API can trigger.
 *
 * Two consequences shape this interface:
 *
 * - **The listener must be installed early.** The event does not replay, so a
 *   binding constructed after it fires has missed it for that page load. The
 *   live binding therefore attaches at construction (guarded on `window`, so
 *   it is inert under SSR), which is when `liveThunkExtra` is evaluated in the
 *   browser bundle.
 * - **`availability()` is three-valued, not a boolean.** `unavailable` (this
 *   browser will never offer it) and `unknown` (the event has not fired *yet*)
 *   are different states, and rendering an install button for the second is
 *   how a PWA ends up with a button that does nothing.
 */
import fixtures from './install.fixtures.json'

export type InstallAvailability =
  /** The event has not fired yet — it still might. */
  | 'unknown'
  /** A prompt is captured and `prompt()` will raise it. */
  | 'available'
  /** This browser will not offer a programmatic install. */
  | 'unavailable'
  /** Already running as an installed app. */
  | 'installed'

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

export interface InstallService {
  availability(): InstallAvailability
  /** Whether the document is running in an installed (standalone) window. */
  isStandalone(): boolean
  /** Raises the captured prompt. `unavailable` when there is none. */
  prompt(): Promise<InstallOutcome>
  /** Detaches the listeners. Idempotent. */
  dispose(): void
}

// ---------------------------------------------------------------------------
// Seams
// ---------------------------------------------------------------------------

/** The captured `BeforeInstallPromptEvent`, narrowed to what is used. */
export interface InstallPromptEventLike {
  preventDefault(): void
  prompt(): Promise<void>
  readonly userChoice: Promise<{ readonly outcome: string }>
}

/** The `window` members this service touches. */
export interface InstallWindowLike {
  addEventListener(type: string, listener: (event: unknown) => void): void
  removeEventListener(type: string, listener: (event: unknown) => void): void
  matchMedia?(query: string): { readonly matches: boolean }
}

export interface LiveInstallServiceOptions {
  readonly window?: InstallWindowLike | null
  /**
   * iOS Safari reports standalone through a non-standard `navigator` flag
   * rather than a display-mode media query. Injected so a suite can assert
   * both paths.
   */
  readonly isStandaloneNavigator?: () => boolean
}

const STANDALONE_QUERY = '(display-mode: standalone)'

const defaultWindow = (): InstallWindowLike | null =>
  typeof window === 'undefined'
    ? null
    : (window as unknown as InstallWindowLike)

const defaultIsStandaloneNavigator = (): boolean =>
  typeof navigator !== 'undefined' &&
  (navigator as Navigator & { standalone?: boolean }).standalone === true

export const makeLiveInstallService = (
  options: LiveInstallServiceOptions = {},
): InstallService => {
  const win = options.window === undefined ? defaultWindow() : options.window
  const isStandaloneNavigator =
    options.isStandaloneNavigator ?? defaultIsStandaloneNavigator

  let captured: InstallPromptEventLike | null = null
  let installed = false

  const onBeforeInstallPrompt = (event: unknown): void => {
    const candidate = event as InstallPromptEventLike
    candidate.preventDefault()
    captured = candidate
  }

  const onAppInstalled = (): void => {
    installed = true
    captured = null
  }

  if (win) {
    win.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    win.addEventListener('appinstalled', onAppInstalled)
  }

  const isStandalone = (): boolean => {
    if (installed) return true
    if (isStandaloneNavigator()) return true
    if (!win?.matchMedia) return false
    return win.matchMedia(STANDALONE_QUERY).matches
  }

  return {
    availability: () => {
      if (isStandalone()) return 'installed'
      if (captured !== null) return 'available'
      return win === null ? 'unavailable' : 'unknown'
    },

    isStandalone,

    prompt: async () => {
      const event = captured
      if (!event) return 'unavailable'
      // The captured event is single-use: the browser discards it once
      // `prompt()` resolves, so holding on to it would leave a button that
      // silently does nothing on the second press.
      captured = null
      await event.prompt()
      const choice = await event.userChoice
      return choice.outcome === 'accepted' ? 'accepted' : 'dismissed'
    },

    dispose: () => {
      if (!win) return
      win.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      win.removeEventListener('appinstalled', onAppInstalled)
    },
  }
}

// ---------------------------------------------------------------------------
// The stub
// ---------------------------------------------------------------------------

export interface StubbedInstallServiceOptions {
  readonly availability?: InstallAvailability
  readonly outcome?: InstallOutcome
}

export interface StubbedInstallService extends InstallService {
  /** How many times `prompt()` actually raised the dialog. */
  promptCount(): number
}

const fixtureAvailability = fixtures.availability as InstallAvailability
const fixtureOutcome = fixtures.outcome as InstallOutcome

export const makeStubbedInstallService = (
  options: StubbedInstallServiceOptions = {},
): StubbedInstallService => {
  let availability = options.availability ?? fixtureAvailability
  const outcome = options.outcome ?? fixtureOutcome
  let prompts = 0

  return {
    availability: () => availability,
    isStandalone: () => availability === 'installed',
    prompt: async () => {
      if (availability !== 'available') return 'unavailable'
      prompts += 1
      availability = outcome === 'accepted' ? 'installed' : 'unknown'
      return outcome
    },
    dispose: () => {},
    promptCount: () => prompts,
  }
}

export const liveInstallService: InstallService = makeLiveInstallService()

export const stubbedInstallService: InstallService = makeStubbedInstallService()
