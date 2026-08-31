import type { ThunkExtra } from '@kro/app'

/**
 * The live `NavigationService` binding (`RC-48`, `RC-63`).
 *
 * `RC-48` splits a platform-bound Service in two: the interface and its
 * `stubbed…` twin are single-sourced in the shared package, and the `live…`
 * implementation is authored **beside the platform that owns the API**. This
 * is that half — and it has to be, because `RC-40` forbids `packages/app` from
 * importing `next/*` at all.
 *
 * It takes the router rather than reading one: `useRouter()` is a hook, so
 * only a component can call it, and the composition root
 * (`app/providers.tsx`) is the one component allowed to. That file is
 * therefore the single `next/navigation` importer in the repo; this one names
 * no framework and is testable without a router.
 *
 * The contract is `ThunkExtra['navigation']` — no import from the Service
 * module is needed (or possible: the package barrel deliberately exports no
 * Service, `RC-6`).
 */
export type NavigationService = ThunkExtra['navigation']

/** The three methods this needs from a router. Next's `useRouter()` has them. */
export interface RouterPort {
  push(path: string): void
  replace(path: string): void
  back(): void
}

export const makeLiveNavigationService = (
  router: RouterPort,
): NavigationService => ({
  navigate: (path) => router.push(path),
  replace: (path) => router.replace(path),
  back: () => router.back(),
})
