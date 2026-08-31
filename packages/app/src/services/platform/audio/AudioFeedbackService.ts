/**
 * Session audio feedback — canon
 * `Kro/Dependencies/AudioFeedbackClient.swift` (`SessionSoundType` +
 * `playSound`) with `SystemRinger.swift` behind it (`RC-6`, `RC-33`, `RC-59`).
 *
 * Canon plays four **system** sounds by `SystemSoundID`. The web has no system
 * sound table, so each role maps to a bundled asset under
 * `apps/web/public/sounds/`:
 *
 * | role | canon sound | web asset | note |
 * |---|---|---|---|
 * | `sessionComplete` | 1304 Modern Chime | `videogame_success.mp3` | celebratory completion — the closest seed in character |
 * | `breakComplete` | 1016 Choo Choo | `break_complete.mp3` | **gap** — no seed matches a playful two-tone cue; the path is declared, the asset is not shipped |
 * | `taskCompleteDuringSession` | 1310 Tink | `progress_ding.mp3` | light and non-disruptive, as Tink is mid-session |
 * | `taskCompleteOutsideSession` | 1003 SMS Sent | `start_ping.mp3` | **provisional** — a short confirmation ping, but the seed reads as a *start* cue; re-record when a Kro sound set exists |
 *
 * A declared-but-missing asset is not a crash and not an error the user sees:
 * `play` resolves silently and logs once, so a session still concludes
 * correctly with no sound. That is the same posture as canon's own audio path,
 * which is fire-and-forget with no failure surface.
 *
 * **Silencing is the caller's job, not this Service's.** Canon gates at the
 * reducer — `state.soundOnEnd ? producePlaySessionCompleteAudioEffect() : .none`
 * — so the preference read stays in the feature tier where it is testable, and
 * this boundary stays a dumb "play this role". `PlatformProducer` holds the
 * `session.soundOnEnd` check.
 */
import fixtures from './audio.fixtures.json'

/** Canon's `SessionSoundType`, name for name. */
export type SessionSoundRole =
  | 'sessionComplete'
  | 'breakComplete'
  | 'taskCompleteDuringSession'
  | 'taskCompleteOutsideSession'

/** Every role, in canon's declaration order. */
export const sessionSoundRoles: readonly SessionSoundRole[] = [
  'sessionComplete',
  'breakComplete',
  'taskCompleteDuringSession',
  'taskCompleteOutsideSession',
]

/**
 * The role → asset map. Every role has a path, including the roles whose asset
 * is not shipped yet: a UI child needs the path to know what to drop in, and a
 * missing file exercises the fallback rather than a `undefined` src.
 */
export const sessionSoundAssets: Record<SessionSoundRole, string> = {
  sessionComplete: '/sounds/videogame_success.mp3',
  breakComplete: '/sounds/break_complete.mp3',
  taskCompleteDuringSession: '/sounds/progress_ding.mp3',
  taskCompleteOutsideSession: '/sounds/start_ping.mp3',
}

/**
 * The roles whose asset is **not** in `apps/web/public/sounds/` yet. Declared
 * rather than discovered so the gap is greppable, reviewable and testable —
 * this tier cannot read the filesystem.
 */
export const sessionSoundAssetGaps: readonly SessionSoundRole[] = [
  'breakComplete',
]

export interface AudioFeedbackService {
  /**
   * Plays the role's asset. Resolves even when the asset is missing, the
   * element cannot decode it, or autoplay policy blocks it — an unplayable
   * cue never becomes a user-visible failure.
   */
  play(role: SessionSoundRole): Promise<void>
}

// ---------------------------------------------------------------------------
// Seams
// ---------------------------------------------------------------------------

/** The `HTMLAudioElement` members this service uses. */
export interface AudioElementLike {
  play(): Promise<void>
}

export interface LiveAudioFeedbackServiceOptions {
  /** Builds the element for a source. Defaults to `new Audio(src)`. */
  readonly createAudio?: (source: string) => AudioElementLike | null
  /** Where a failed cue is reported. Defaults to `console.warn`. */
  readonly log?: (message: string, reason: unknown) => void
  readonly assets?: Record<SessionSoundRole, string>
}

const defaultCreateAudio = (source: string): AudioElementLike | null =>
  typeof Audio === 'undefined' ? null : new Audio(source)

const defaultLog = (message: string, reason: unknown): void => {
  // An unplayable cue has no user-facing surface by design (canon is
  // fire-and-forget), so a log is the only signal. Injectable, so a suite
  // asserts on it instead of on the console.
  console.warn(message, reason)
}

export const makeLiveAudioFeedbackService = (
  options: LiveAudioFeedbackServiceOptions = {},
): AudioFeedbackService => {
  const createAudio = options.createAudio ?? defaultCreateAudio
  const log = options.log ?? defaultLog
  const assets = options.assets ?? sessionSoundAssets

  return {
    play: async (role) => {
      const source = assets[role]
      try {
        const element = createAudio(source)
        if (!element) return
        await element.play()
      } catch (reason) {
        log(`Kro: session sound "${role}" (${source}) could not play.`, reason)
      }
    },
  }
}

// ---------------------------------------------------------------------------
// The stub
// ---------------------------------------------------------------------------

export interface StubbedAudioFeedbackServiceOptions {
  /**
   * The asset paths this stub pretends exist. A role whose path is absent
   * takes the missing-asset path, so a suite can prove the fallback is silent
   * without a real media decoder.
   */
  readonly availableAssets?: readonly string[]
}

export interface StubbedAudioFeedbackService extends AudioFeedbackService {
  /** Every role actually played, in order. */
  playedRoles(): readonly SessionSoundRole[]
  /** Every role whose asset was missing, in order. */
  missedRoles(): readonly SessionSoundRole[]
}

const fixtureAvailableAssets = fixtures.availableAssets as readonly string[]

export const makeStubbedAudioFeedbackService = (
  options: StubbedAudioFeedbackServiceOptions = {},
): StubbedAudioFeedbackService => {
  const available = new Set(options.availableAssets ?? fixtureAvailableAssets)
  const played: SessionSoundRole[] = []
  const missed: SessionSoundRole[] = []

  return {
    play: async (role) => {
      if (available.has(sessionSoundAssets[role])) played.push(role)
      else missed.push(role)
    },
    playedRoles: () => played,
    missedRoles: () => missed,
  }
}

export const liveAudioFeedbackService: AudioFeedbackService =
  makeLiveAudioFeedbackService()

export const stubbedAudioFeedbackService: AudioFeedbackService =
  makeStubbedAudioFeedbackService()
