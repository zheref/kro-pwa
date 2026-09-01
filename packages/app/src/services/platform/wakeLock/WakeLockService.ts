/**
 * Screen wake lock — canon `Kro/Dependencies/ScreenWakeClient.swift`
 * (`setKeepAwake(_ enabled: Bool)`), honouring `session.keepScreenAwake`
 * (`RC-6`, `RC-33`, `RC-59`).
 *
 * The operation is canon's, verbatim: **one boolean of desired state**, not
 * `acquire`/`release`. Canon can afford a bare setter because
 * `UIApplication.isIdleTimerDisabled` is a latch the OS holds until it is
 * unset. The Screen Wake Lock API is not a latch — the browser **releases the
 * sentinel automatically** whenever the document stops being visible, and the
 * page must request a fresh one when it comes back. So the same one-boolean
 * surface is implemented here by a small state machine:
 *
 * ```
 *              setKeepAwake(true)                setKeepAwake(false)
 *   released ─────────────────────▶ held ──────────────────────────▶ released
 *      ▲                             │
 *      │  document hidden            │  document visible again
 *      └── (browser auto-releases) ──┴──▶ re-request ──▶ held
 * ```
 *
 * Canon's dispatch points map onto it unchanged, and this is why the desired
 * state is kept separately from whether a sentinel is held:
 *
 * - session enters `running`/`break` → `setKeepAwake(true)` (canon's
 *   `onChange(of: \.phase)` arm)
 * - session pauses / concludes / aborts, or the sheet disappears →
 *   `setKeepAwake(false)`
 * - reopening onto a live session → `setKeepAwake(true)` again (canon
 *   re-asserts the hold on `onAppear`; here it is idempotent)
 *
 * Visibility loss is *not* a session transition, so it never changes the
 * desired state — it only drops the sentinel, which the listener re-acquires.
 * Getting that distinction wrong is the whole bug this file exists to avoid:
 * a tab switch would otherwise permanently end the hold for a session that is
 * still running.
 */
import fixtures from './wakeLock.fixtures.json'

export interface WakeLockService {
  /** Whether this browser exposes the Screen Wake Lock API at all. */
  isSupported(): boolean
  /** Canon's `setKeepAwake`. Idempotent in both directions. */
  setKeepAwake(enabled: boolean): Promise<void>
  /** Whether a sentinel is held **right now** (false while hidden). */
  isHeld(): boolean
  /** Whether the caller has asked for the screen to stay awake. */
  isKeepAwakeRequested(): boolean
}

// ---------------------------------------------------------------------------
// Seams
// ---------------------------------------------------------------------------

export interface WakeLockSentinelLike {
  release(): Promise<void>
}

export interface WakeLockApiLike {
  request(type: 'screen'): Promise<WakeLockSentinelLike>
}

/** The two `document` members the visibility half needs. */
export interface VisibilityDocumentLike {
  readonly visibilityState: string
  addEventListener(type: 'visibilitychange', listener: () => void): void
  removeEventListener(type: 'visibilitychange', listener: () => void): void
}

export interface LiveWakeLockServiceOptions {
  readonly wakeLock?: WakeLockApiLike | null
  readonly document?: VisibilityDocumentLike | null
  /** Where a refused request is reported. Defaults to `console.warn`. */
  readonly log?: (message: string, reason: unknown) => void
}

const defaultWakeLock = (): WakeLockApiLike | null => {
  if (typeof navigator === 'undefined') return null
  const api = (navigator as Navigator & { wakeLock?: WakeLockApiLike }).wakeLock
  return api ?? null
}

const defaultDocument = (): VisibilityDocumentLike | null =>
  typeof document === 'undefined'
    ? null
    : (document as unknown as VisibilityDocumentLike)

const defaultLog = (message: string, reason: unknown): void => {
  // A refused wake lock is advisory — canon surfaces no failure for it either
  // (fire-and-forget), so a log is the only signal. Injectable, so a suite
  // asserts on it instead of on the console.
  console.warn(message, reason)
}

export const makeLiveWakeLockService = (
  options: LiveWakeLockServiceOptions = {},
): WakeLockService => {
  const wakeLock =
    options.wakeLock === undefined ? defaultWakeLock() : options.wakeLock
  const doc =
    options.document === undefined ? defaultDocument() : options.document
  const log = options.log ?? defaultLog

  let requested = false
  let sentinel: WakeLockSentinelLike | null = null
  let listening = false

  const isVisible = (): boolean =>
    doc === null || doc.visibilityState === 'visible'

  let acquiring = false

  const acquire = async (): Promise<void> => {
    if (!wakeLock || sentinel !== null || acquiring || !isVisible()) return
    acquiring = true
    try {
      const fresh = await wakeLock.request('screen')
      // The await can resolve AFTER a setKeepAwake(false) or a visibility
      // loss: the lock is no longer desired, so release the fresh sentinel
      // instead of holding it against the caller's wishes.
      if (!requested || !isVisible()) {
        try {
          await fresh.release()
        } catch {
          // A dead sentinel needs no release; nothing to do.
        }
        return
      }
      sentinel = fresh
    } catch (reason) {
      // A refused request (battery saver, a hidden document racing us) leaves
      // `requested` true, so the next visibility change retries.
      log('Kro: the screen wake lock was refused.', reason)
      sentinel = null
    } finally {
      acquiring = false
    }
  }

  const release = async (): Promise<void> => {
    const held = sentinel
    sentinel = null
    if (!held) return
    try {
      await held.release()
    } catch (reason) {
      log('Kro: the screen wake lock could not be released.', reason)
    }
  }

  const onVisibilityChange = (): void => {
    if (!requested) return
    if (isVisible()) {
      void acquire()
      return
    }
    // The browser has already dropped the sentinel; forget the handle so the
    // next visible turn requests a new one rather than releasing a dead lock.
    sentinel = null
  }

  const startListening = (): void => {
    if (listening || !doc) return
    doc.addEventListener('visibilitychange', onVisibilityChange)
    listening = true
  }

  const stopListening = (): void => {
    if (!listening || !doc) return
    doc.removeEventListener('visibilitychange', onVisibilityChange)
    listening = false
  }

  return {
    isSupported: () => wakeLock !== null,

    setKeepAwake: async (enabled) => {
      requested = enabled
      if (enabled) {
        startListening()
        await acquire()
        return
      }
      stopListening()
      await release()
    },

    isHeld: () => sentinel !== null,
    isKeepAwakeRequested: () => requested,
  }
}

// ---------------------------------------------------------------------------
// The stub
// ---------------------------------------------------------------------------

export interface StubbedWakeLockServiceOptions {
  readonly supported?: boolean
}

export interface StubbedWakeLockService extends WakeLockService {
  /** Every `setKeepAwake` argument, in order. */
  recordedRequests(): readonly boolean[]
}

const fixtureSupported = fixtures.supported as boolean

export const makeStubbedWakeLockService = (
  options: StubbedWakeLockServiceOptions = {},
): StubbedWakeLockService => {
  const supported = options.supported ?? fixtureSupported
  const requests: boolean[] = []
  let requested = false

  return {
    isSupported: () => supported,
    setKeepAwake: async (enabled) => {
      requests.push(enabled)
      requested = enabled
    },
    isHeld: () => supported && requested,
    isKeepAwakeRequested: () => requested,
    recordedRequests: () => requests,
  }
}

export const liveWakeLockService: WakeLockService = makeLiveWakeLockService()

export const stubbedWakeLockService: WakeLockService =
  makeStubbedWakeLockService()
