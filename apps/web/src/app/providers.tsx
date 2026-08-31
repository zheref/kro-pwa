'use client'

/**
 * The one client composition root (`RC-41`, `RC-63`).
 *
 * Three things are wired here and nowhere else:
 *
 *   **Store** — `makeStore(...)` is called once per browser session, in a
 *   `useState` initialiser so a re-render never builds a second one. The
 *   instance is handed to `StoreProvider`, which takes a store and never
 *   constructs one (`RC-22`).
 *
 *   **Theme** — `next-themes` writing `data-theme`, which is the exact
 *   attribute the design system's tokens key their explicit overrides off
 *   (`THEME_ATTRIBUTE`). One mechanism, not two: no class list, no inline
 *   colours, and `system` hands the choice back to the OS.
 *
 *   **Navigation** — this file is the ONLY `next/navigation` importer in the
 *   repo. `RC-40` forbids `packages/app` from importing `next/*` (and
 *   `check-uzf-boundaries.mjs` fails the lint task on it), so the shared tier
 *   declares the contract and this composition root satisfies it with the
 *   live binding from `./liveNavigationService` — which is `RC-48`'s split for
 *   a platform-bound Service, and the shape `RC-41`'s own canon example shows.
 *   Producers then reach the router through `extra.navigation`, and no
 *   component ever navigates (`RC-17`).
 */
import { StoreProvider, liveThunkExtra, makeStore } from '@kro/app'
import { ThemeProvider } from 'next-themes'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { makeLiveNavigationService } from './liveNavigationService'

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  // The store is built once, with the live services plus this session's
  // router. A `useState` initialiser rather than a module-level singleton: a
  // singleton could only ever be wired to the live bindings, which is how a
  // suite ends up talking to the network (`RC-22`).
  const [store] = useState(() =>
    makeStore({
      ...liveThunkExtra,
      navigation: makeLiveNavigationService(router),
    }),
  )

  return (
    <StoreProvider store={store}>
      <ThemeProvider
        attribute="data-theme"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </StoreProvider>
  )
}
