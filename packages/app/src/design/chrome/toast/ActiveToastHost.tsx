import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ActiveToastLayer } from './ActiveToastLayer'
import {
  type ActiveToastInput,
  type ActiveToastModel,
  toActiveToast,
} from './activeToast'

/**
 * The Active Toast host — the one place a toast's lifetime lives.
 *
 * `RC-14` IS THE WHOLE DESIGN CONSTRAINT. This is a Component, so it may not
 * import `react-redux`, a slice or a Producer. The toast is therefore pure
 * component state behind a React context, and a feature reaches it the way a
 * feature reaches any Component — through an intent closure. When the shell
 * (`#13`) mounts this, a Fragment calls `useActiveToasts().enqueue(...)` from a
 * callback prop its Page gave it; nothing here ever learns that a store exists.
 *
 * ==========================================================================
 * `enqueue`, AND WHY THE QUEUE IS ONE DEEP
 * ==========================================================================
 *
 * `docs/Features/ActiveToast.md` § Presentation: "New toast immediately
 * replaces current toast by triggering exit and entry in sequence", and "Timer
 * restarts if a new toast replaces the current one". So canon has no queue — a
 * second toast supersedes the first rather than waiting behind it, which is the
 * right behaviour for feedback that is about what the user JUST did.
 *
 * The method is still called `enqueue` because that is the verb the caller
 * means ("put this up next") and because the alternative — `replace` — reads as
 * an instruction about the toast already on screen, which the caller usually
 * does not know about. The one-deep depth is stated here, asserted in the
 * suite, and shown in the `Replaced` story.
 *
 * ==========================================================================
 * THE TIMER
 * ==========================================================================
 *
 * Keyed on the toast's id, exactly as canon's `.task(id: toast.id)` is: a new
 * toast cancels the old timer and starts a fresh one, and a dismissal cancels
 * it outright. The duration is already clamped into the documented 3–12s
 * reading window by `toActiveToast`, so a caller cannot ask for a toast that
 * flashes past faster than it can be read.
 */

export interface ActiveToastController {
  /**
   * Shows a toast, replacing whatever is on screen. Returns its id so a caller
   * can dismiss exactly the toast it raised and not a later one.
   */
  enqueue: (input: ActiveToastInput) => string
  /** Dismisses `id`, or whatever is showing when `id` is omitted. */
  dismiss: (id?: string) => void
  /** The toast currently on screen, for a caller that needs to know. */
  readonly current: ActiveToastModel | null
}

const ActiveToastContext = createContext<ActiveToastController | null>(null)

export interface ActiveToastHostProps {
  readonly children?: ReactNode
  /** Whether the Session Pill is on screen — drives the lift-above-pill rule. */
  readonly isSessionPillVisible?: boolean
  readonly position?: 'fixed' | 'absolute'
  /**
   * The shell's bottom chrome inset, forwarded to the layer. Omit it and the
   * layer reads `var(--kro-shell-bottom-inset, 0px)` — see `ActiveToastLayer`.
   */
  readonly bottomInset?: number | string
}

export function ActiveToastHost({
  children,
  isSessionPillVisible = false,
  position = 'fixed',
  bottomInset,
}: ActiveToastHostProps) {
  const [toast, setToast] = useState<ActiveToastModel | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current === null) return
    clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const dismiss = useCallback((id?: string) => {
    setToast((showing) => {
      // A stale dismiss — an undo handler firing after a newer toast replaced
      // the one it belonged to — must not take the newer toast down with it.
      if (id !== undefined && showing?.id !== id) return showing
      return null
    })
  }, [])

  const enqueue = useCallback((input: ActiveToastInput) => {
    const next = toActiveToast(input)
    setToast(next)
    return next.id
  }, [])

  // One effect owns the timer, keyed on the toast's identity — so replacing a
  // toast restarts the countdown rather than inheriting the old one's remainder.
  useEffect(() => {
    clearTimer()
    if (!toast) return
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      setToast((showing) => (showing?.id === toast.id ? null : showing))
    }, toast.duration * 1000)
    return clearTimer
  }, [toast, clearTimer])

  const controller = useMemo<ActiveToastController>(
    () => ({ enqueue, dismiss, current: toast }),
    [enqueue, dismiss, toast],
  )

  return (
    <ActiveToastContext.Provider value={controller}>
      {children}
      <ActiveToastLayer
        toast={toast}
        isSessionPillVisible={isSessionPillVisible}
        position={position}
        {...(bottomInset === undefined ? {} : { bottomInset })}
      />
    </ActiveToastContext.Provider>
  )
}

/**
 * The imperative surface.
 *
 * Throws rather than returning a no-op controller when no host is mounted: a
 * silently-swallowed toast is a bug that only shows up as "the undo affordance
 * never appeared", which is exactly the kind of thing nobody notices in review.
 */
export function useActiveToasts(): ActiveToastController {
  const controller = useContext(ActiveToastContext)
  if (!controller) {
    throw new Error(
      'useActiveToasts() was called outside an <ActiveToastHost>. Mount the host once, in the shell.',
    )
  }
  return controller
}
