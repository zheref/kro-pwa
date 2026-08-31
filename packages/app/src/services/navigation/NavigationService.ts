/**
 * `NavigationService` — the router as a Service (`RC-17`, `RC-59`, `RC-63`;
 * implements `UZF-16`).
 *
 * The rule this exists to make structural: **navigation is invoked from a
 * Producer, never from a component**. A sidebar row dispatches
 * `navigateToDestinationThunk`; the thunk reads `extra.navigation` and calls
 * it. No Page, Fragment or Component in this repo knows a URL exists.
 *
 * ## Where `next/navigation` lives, and why it is not here
 *
 * This is `RC-48`'s platform-bound Service, exactly: **the interface and the
 * `stubbed…` binding live here; the `live…` implementation is authored beside
 * the platform that owns the API** — `apps/web/src/app/liveNavigationService.ts`,
 * injected at that app's own composition root. It has to be that way round:
 * `RC-40` forbids `packages/app` from importing `next/*`, and
 * `scripts/check-uzf-boundaries.mjs` fails the lint task on it, so a
 * `next/navigation` import in this file would not build. (The same script also
 * refuses to let this module be re-exported from the package barrel, which is
 * `RC-6` holding: nothing a component could import.)
 *
 * `apps/web` needs no import from here to satisfy the contract —
 * `ThunkExtra['navigation']` **is** the contract. `apps/web/src/app/providers.tsx`
 * is therefore the single `next/navigation` importer in the repo, and this
 * module stays framework-blind, which is what keeps a Producer testable with a
 * recording double instead of a router.
 *
 * ## No fixture JSON
 *
 * `RC-33` wants a `stubbed…Service` plus a fixture JSON. There is a stub here
 * and it is used by every suite, but there is no fixture: a fixture backs a
 * Service that *returns* wire data, and this one returns nothing at all — it
 * is a pure command boundary. `stubbedLocalStore` is the same shape and the
 * same reasoning (KC-IS-#10).
 */

/**
 * What the shell needs from a router. Three commands, no reads: a Producer
 * that needs to know where it is reads the destination from state, which the
 * route file put there (`onDestinationRouteMounted`).
 */
export interface NavigationService {
  /** Push a new entry — the ordinary case. */
  navigate(path: string): void
  /** Replace the current entry, leaving no back step. */
  replace(path: string): void
  /** Step back, if there is one. */
  back(): void
}

/**
 * The default binding — does nothing, on purpose.
 *
 * `makeStore()` is called with the live `ThunkExtra` before the composition
 * root has a router (and in a server render there is no router at all). A
 * no-op is the honest default: it cannot navigate, and it cannot throw in the
 * middle of a Producer either. The composition root replaces it as soon as it
 * has one.
 */
export const stubbedNavigationService: NavigationService = {
  navigate: () => {},
  replace: () => {},
  back: () => {},
}

/** One recorded call. */
export interface NavigationCall {
  readonly kind: 'navigate' | 'replace' | 'back'
  readonly path: string | null
}

export interface RecordingNavigationService extends NavigationService {
  /** Every call so far, in order. */
  readonly calls: readonly NavigationCall[]
}

/**
 * The test double.
 *
 * A factory, never a module-level singleton: a shared recorder would let one
 * suite see another's calls, which is the same objection `makeStore` answers
 * (`RC-22`).
 */
export const makeRecordingNavigationService = (): RecordingNavigationService => {
  const calls: NavigationCall[] = []

  return {
    calls,
    navigate: (path) => {
      calls.push({ kind: 'navigate', path })
    },
    replace: (path) => {
      calls.push({ kind: 'replace', path })
    },
    back: () => {
      calls.push({ kind: 'back', path: null })
    },
  }
}
