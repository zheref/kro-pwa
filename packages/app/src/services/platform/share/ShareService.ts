/**
 * The share hand-off — `navigator.share`, with the clipboard behind it.
 *
 * `spec/architecture/web.md` § 4 is explicit that a one-shot platform
 * capability is a Service behind `ThunkExtra`, invoked from a Producer
 * (`RC-3`, `RC-6`) — *"sounds, notifications, wake lock and clipboard are
 * Services, not view code"*. Two surfaces had been waiting for this one:
 * Triage carried `pages/triageShare.ts`, a stand-in shaped to be deleted, and
 * `FindOperations` named the gap in its own binding table. Both are answered
 * here (KC-IS-#71 item 18).
 *
 * ## What it does, and why the fallback is not a nicety
 *
 * Canon presents `UIActivityViewController` over the still-mounted screen and
 * pops the child when the sheet is dismissed *"(cancel or completion)"* — the
 * two outcomes are deliberately not distinguished. `navigator.share()` is the
 * web equivalent: it resolves on completion and rejects with an `AbortError`
 * on cancel, and both end the hand-off.
 *
 * It is also **absent** on every desktop Firefox and on any non-secure origin,
 * which is a large fraction of Kro Web's surface. With no sheet, putting the
 * blurb where the user can paste it is the closest thing to handing it off, so
 * the clipboard is the fallback rather than a failure.
 *
 * A share that **fails** (not one the user cancelled) still falls back: a
 * failed hand-off with nothing on the clipboard leaves the user with neither.
 * A cancel does not — the user said no, and silently copying would be a second
 * action they did not ask for.
 *
 * ## The outcome is a value, never a throw
 *
 * `RC-33` puts the `Result` boundary in the Producer, and this Service honours
 * that by never throwing at all: every path it can take is one of four named
 * outcomes. A Producer still wraps it, because a Service *may* throw and a
 * caller must not have to know which ones do not.
 *
 * `ShareOutcome` is `@kro/core`'s, not this file's: a Producer has to name the
 * value it resolves and may not import anything under `services/` (`RC-6`), so
 * the union is domain vocabulary and this only produces it.
 */
import { ShareOutcome } from '@kro/core'
import fixtures from './share.fixtures.json'

export interface ShareService {
  /** Whether a system share sheet exists on this platform at all. */
  isSupported(): boolean
  /** Hands `text` off, falling back to the clipboard. Never throws. */
  share(text: string): Promise<ShareOutcome>
}

/**
 * The two browser capabilities this needs, as one injectable surface.
 *
 * Both are optional because both genuinely are: `navigator.share` is absent on
 * every desktop Firefox and on any non-secure origin, and `navigator.clipboard`
 * is absent on a non-secure origin too.
 */
export interface ShareNavigatorLike {
  readonly share?: (data: { readonly text: string }) => Promise<void>
  readonly writeText?: (text: string) => Promise<void>
}

/**
 * The live bindings — the browser's own APIs, **bound** to `navigator`.
 *
 * Bound rather than referenced: `navigator.share` throws `Illegal invocation`
 * if it is called detached, which is the classic way a "share is available"
 * check passes and the share itself still fails.
 */
export const browserShareNavigator = (): ShareNavigatorLike => {
  if (typeof navigator === 'undefined') return {}
  const canShare = typeof navigator.share === 'function'
  const canWrite = typeof navigator.clipboard?.writeText === 'function'
  return {
    share: canShare
      ? (data) => navigator.share({ text: data.text })
      : undefined,
    writeText: canWrite
      ? (text) => navigator.clipboard.writeText(text)
      : undefined,
  }
}

/** Whether a rejection is the user closing the sheet rather than a failure. */
const isAbort = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'name' in error &&
  (error as { name?: unknown }).name === 'AbortError'

/** The one implementation both bindings run: the order is canon's intent. */
const shareWith = async (
  nav: ShareNavigatorLike,
  text: string,
): Promise<ShareOutcome> => {
  if (nav.share !== undefined) {
    try {
      await nav.share({ text })
      return ShareOutcome.shared
    } catch (error) {
      if (isAbort(error)) return ShareOutcome.dismissed
      // fall through to the clipboard
    }
  }

  if (nav.writeText !== undefined) {
    try {
      await nav.writeText(text)
      return ShareOutcome.copied
    } catch {
      return ShareOutcome.unavailable
    }
  }

  return ShareOutcome.unavailable
}

export interface LiveShareServiceOptions {
  readonly navigator?: ShareNavigatorLike
}

export const makeLiveShareService = (
  options: LiveShareServiceOptions = {},
): ShareService => {
  const nav = options.navigator ?? browserShareNavigator()
  return {
    isSupported: () => nav.share !== undefined,
    share: (text) => shareWith(nav, text),
  }
}

// ---------------------------------------------------------------------------
// The stub
// ---------------------------------------------------------------------------

export interface StubbedShareServiceOptions {
  /** Whether a share sheet exists. Defaults to the fixture. */
  readonly canShare?: boolean
  /** Whether the clipboard exists. Defaults to the fixture. */
  readonly canWriteText?: boolean
  /** Makes the sheet reject, so the fallback and the cancel path are drivable. */
  readonly shareRejectsWith?: unknown
}

export interface StubbedShareService extends ShareService {
  /** Every text actually handed off, in order. */
  sharedTexts(): readonly string[]
  /** Every text that landed on the clipboard instead. */
  copiedTexts(): readonly string[]
}

export const makeStubbedShareService = (
  options: StubbedShareServiceOptions = {},
): StubbedShareService => {
  const canShare = options.canShare ?? (fixtures.canShare as boolean)
  const canWriteText =
    options.canWriteText ?? (fixtures.canWriteText as boolean)
  const shared: string[] = []
  const copied: string[] = []

  const nav: ShareNavigatorLike = {
    share: canShare
      ? async (data) => {
          if (options.shareRejectsWith !== undefined) {
            throw options.shareRejectsWith
          }
          shared.push(data.text)
        }
      : undefined,
    writeText: canWriteText
      ? async (text) => {
          copied.push(text)
        }
      : undefined,
  }

  return {
    isSupported: () => canShare,
    share: (text) => shareWith(nav, text),
    sharedTexts: () => shared,
    copiedTexts: () => copied,
  }
}

export const liveShareService: ShareService = makeLiveShareService()

export const stubbedShareService: ShareService = makeStubbedShareService()
