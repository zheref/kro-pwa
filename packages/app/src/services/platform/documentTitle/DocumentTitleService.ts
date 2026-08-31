/**
 * The browser tab's title, as a Service (`RC-6`, `RC-33`, `RC-59`).
 *
 * ## Why this exists, and why it is in the platform tier
 *
 * KroApple's macOS build keeps a running session visible outside the window
 * through a **menu-bar extra**. The web has no menu bar, and epic KC-IS-#1
 * names the substitute explicitly: *"menu-bar extra (no web counterpart — the
 * Session Pill and document-title timer carry it)"*. So while a session runs,
 * the tab reads `12:30 — Kro`, and the user can see the countdown from another
 * tab exactly as a macOS user sees it from another app.
 *
 * `document.title` is a DOM global, so it cannot live in `@kro/core`
 * (machine-enforced platform-free) and a feature may not touch it directly
 * (`RC-3`, `RC-6`). It is a platform boundary like the wake lock and the
 * notification queue, and it belongs beside them.
 *
 * **This Service is KC-IS-#21's, declared here because KC-IS-#34 did not ship
 * one.** The five services that issue delivered are notifications, audio, wake
 * lock, vibration and install; there is no document-title binding anywhere in
 * `services/platform/`. Adding a sixth is the smallest change that keeps the
 * session feature inside `RC-6`, and it is flagged in the PR as the one file
 * this issue adds outside its declared lane.
 *
 * ## The base title is remembered, not guessed
 *
 * Releasing the timer must restore whatever the app had set — the route's own
 * title, which the shell (#13) owns and this tier must not invent. The base is
 * captured on the **first** `set` and restored by `set(null)`, so a session
 * that starts on `/plan` and ends there leaves `/plan`'s title behind. Guessing
 * a constant `'Kro'` instead would silently rewrite every route's title the
 * first time a session ran.
 */
import fixtures from './documentTitle.fixtures.json'

export interface DocumentTitleService {
  /**
   * Shows `title` in the tab, or restores the title the app had before the
   * first override when given `null`. Idempotent in both directions.
   */
  set(title: string | null): Promise<void>
  /** What the tab currently reads. */
  current(): string
}

// ---------------------------------------------------------------------------
// Seams
// ---------------------------------------------------------------------------

/** The one `document` member this service uses. */
export interface TitledDocumentLike {
  title: string
}

export interface LiveDocumentTitleServiceOptions {
  readonly document?: TitledDocumentLike | null
}

const defaultDocument = (): TitledDocumentLike | null =>
  typeof document === 'undefined'
    ? null
    : (document as unknown as TitledDocumentLike)

export const makeLiveDocumentTitleService = (
  options: LiveDocumentTitleServiceOptions = {},
): DocumentTitleService => {
  const doc =
    options.document === undefined ? defaultDocument() : options.document

  // The title the app had before this service first overrode it. Captured
  // lazily so a server render (no `document`) never reads one.
  let baseTitle: string | null = null

  return {
    set: async (title) => {
      if (!doc) return
      if (title === null) {
        if (baseTitle !== null) {
          doc.title = baseTitle
          baseTitle = null
        }
        return
      }
      if (baseTitle === null) baseTitle = doc.title
      doc.title = title
    },

    current: () => doc?.title ?? '',
  }
}

// ---------------------------------------------------------------------------
// The stub
// ---------------------------------------------------------------------------

export interface StubbedDocumentTitleServiceOptions {
  readonly baseTitle?: string
}

export interface StubbedDocumentTitleService extends DocumentTitleService {
  /** Every value passed to `set`, in order — `null` included. */
  recordedTitles(): readonly (string | null)[]
}

const fixtureBaseTitle = fixtures.baseTitle as string

export const makeStubbedDocumentTitleService = (
  options: StubbedDocumentTitleServiceOptions = {},
): StubbedDocumentTitleService => {
  const document: TitledDocumentLike = {
    title: options.baseTitle ?? fixtureBaseTitle,
  }
  const recorded: (string | null)[] = []
  const inner = makeLiveDocumentTitleService({ document })

  return {
    set: async (title) => {
      recorded.push(title)
      await inner.set(title)
    },
    current: () => inner.current(),
    recordedTitles: () => recorded,
  }
}

export const liveDocumentTitleService: DocumentTitleService =
  makeLiveDocumentTitleService()

export const stubbedDocumentTitleService: DocumentTitleService =
  makeStubbedDocumentTitleService()
