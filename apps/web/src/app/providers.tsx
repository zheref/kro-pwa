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
 *
 *   **The auth-state observer** — `observeAuthState`, KC-IS-#71 item 7. It is
 *   here for the same reason navigation is: it needs the `ThunkExtra` this
 *   file builds, and a component may not reach one (`RC-6`). The *launch*
 *   restore is `ProfileControlPage`'s, because that is the surface that shows
 *   who you are; this is the LIVE subscription — a token refresh, a sign-out
 *   in a second tab, the PKCE exchange on the way back from a provider — and
 *   none of those has a surface to hang off.
 */
import {
  type AppStore,
  type ThunkExtra,
  StoreProvider,
  applyStoredAppearance,
  liveThunkExtra,
  makeStore,
  observeAuthState,
} from '@kro/app'
import { ThemeProvider, useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { makeLiveNavigationService } from './liveNavigationService'

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  // The store is built once, with the live services plus this session's
  // router. A `useState` initialiser rather than a module-level singleton: a
  // singleton could only ever be wired to the live bindings, which is how a
  // suite ends up talking to the network (`RC-22`).
  //
  // The extra is kept beside the store rather than rebuilt, because the
  // observer below has to be handed the SAME bindings the store's Producers
  // read — a second `liveThunkExtra` spread would subscribe to a different
  // Supabase client than the one every thunk uses.
  const [{ store, extra }] = useState(() => {
    const extra = {
      ...liveThunkExtra,
      navigation: makeLiveNavigationService(router),
    }
    return { store: makeStore(extra), extra }
  })

  /*
    The `onAuthStateChange` subscription, started once and stopped on unmount.

    `observeAuthState` returns its own teardown, which is why it is a
    subscription rather than a thunk (`RC-27`): the caller must be able to stop
    it, and React's effect cleanup is that caller. Nothing here decides
    anything — every event it sees is turned into a dispatch by the Producer.
  */
  useEffect(
    () =>
      observeAuthState({
        dispatch: store.dispatch,
        extra,
        now: () => new Date(),
      }),
    [store, extra],
  )

  return (
    <StoreProvider store={store}>
      <ThemeProvider
        attribute="data-theme"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AppearanceSync extra={extra} store={store} />
        {children}
      </ThemeProvider>
    </StoreProvider>
  )
}

/**
 * Paints the stored theme and palette onto the document, and keeps
 * `next-themes` in step so it cannot overwrite `data-theme` from its own
 * storage after a preference write.
 */
function AppearanceSync({
  extra,
  store,
}: {
  extra: ThunkExtra
  store: AppStore
}) {
  const { setTheme } = useTheme()

  useEffect(() => {
    const sync = () => {
      applyStoredAppearance(extra.localStore)
      const explicit = document.documentElement.getAttribute('data-theme')
      setTheme(
        explicit === 'light' || explicit === 'dark' ? explicit : 'system',
      )
    }
    sync()
    return store.subscribe(sync)
  }, [extra, store, setTheme])

  return null
}
