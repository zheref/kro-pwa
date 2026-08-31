/**
 * The scaffolding every capture story and suite sits on.
 *
 * Under `__tests__/` rather than beside the surfaces for the same reason
 * `design/system/primitives/__tests__/radixEnvironment.tsx` is: it is test
 * scaffolding, not shipped code — and, unlike shipped code, it is allowed to
 * reach a Service module directly (`check-uzf-boundaries.mjs` exempts test and
 * story files, `RC-6`). A seeded `LocalStore` is the only honest way to give a
 * Page a pool: every Inbox Page loads through `loadCaptureContextThunk` on
 * mount, so a store seeded here produces its rows through the real Producer,
 * the real Shifter and the real reconcile pass rather than a hand-built slice.
 *
 * Nothing here constructs a `CaptureState`, and nothing constructs a thunk's
 * lifecycle action by hand: the states come from `CaptureMocks`, and the pool
 * arrives the way it arrives in the browser.
 */

import type { EndeavorRecord } from '@kro/core'
import { type ReactNode, useEffect } from 'react'
import { StoreProvider } from '../../../../library/StoreProvider'
import { type ThunkExtra, makeStore, stubbedThunkExtra } from '../../../../library/store'
import { makeInMemoryLocalStore } from '../../../../services/localStore/InMemoryLocalStore'
import {
  onDestinationRouteMounted,
  onShellMounted,
} from '../../../main/MainFeature'
import { desktopSurface, handheldSurface } from '../../../main/MainMocks'
import {
  DestinationKind,
  type SidebarDestination,
} from '../../../main/SidebarDestination'
import type { DoSurface } from '../../../main/DoSurfaceLayout'
import { CAPTURE_MOCK_NOW, captureFixtureRecords } from '../../CaptureMocks'

export { desktopSurface, handheldSurface }
export { CAPTURE_MOCK_NOW }

/**
 * jsdom implements neither `matchMedia` nor `crypto.randomUUID` reliably, and
 * both are on the path of every surface here — the first through
 * `useInputCapability` (the row's swipe/hover split), the second through the
 * prompt's own Add. Installed per suite, torn down after, so no file leaks a
 * stub into the next.
 */
export function installCaptureEnvironment(options?: {
  readonly pointer?: 'coarse' | 'fine'
}): () => void {
  const pointer = options?.pointer ?? 'fine'
  const originalMatchMedia = window.matchMedia
  const originalUuid = globalThis.crypto?.randomUUID

  window.matchMedia = ((query: string) =>
    ({
      matches:
        query.includes('pointer: fine') || query.includes('any-pointer: fine')
          ? pointer === 'fine'
          : query.includes('min-width'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
      onchange: null,
    }) as unknown as MediaQueryList) as typeof window.matchMedia

  let counter = 0
  if (globalThis.crypto !== undefined) {
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      configurable: true,
      writable: true,
      value: () => `capture-${(counter += 1)}` as `${string}-${string}`,
    })
  }

  return () => {
    window.matchMedia = originalMatchMedia
    if (globalThis.crypto !== undefined && originalUuid !== undefined) {
      Object.defineProperty(globalThis.crypto, 'randomUUID', {
        configurable: true,
        writable: true,
        value: originalUuid,
      })
    }
  }
}

export interface CaptureStoreOptions {
  /** Stored rows the pool is built from. Defaults to the whole fixture set. */
  readonly endeavors?: readonly EndeavorRecord[]
  /** Which row of the ported decision table the shell resolves to. */
  readonly surface?: DoSurface
  /**
   * Where the user is standing. Defaults to All Tasks, which is the shape of
   * destination canon's `default:` quick-action branch covers — the shell's own
   * initial selection is My Day, and My Day owns its own FAB (KC-IS-#17), so a
   * suite that wants the default disc has to say where it is.
   */
  readonly destination?: SidebarDestination
  /** Anything else a suite wants to swap — a recording navigation service, say. */
  readonly extra?: Partial<ThunkExtra>
}

/**
 * A store wired to an in-memory `LocalStore` holding `endeavors`, with the
 * shell already measured at `surface` and standing on `destination`.
 */
export function makeCaptureStore(options: CaptureStoreOptions = {}) {
  const store = makeStore({
    ...stubbedThunkExtra,
    localStore: makeInMemoryLocalStore({
      endeavors: [...(options.endeavors ?? captureFixtureRecords())],
    }),
    ...options.extra,
  })
  store.dispatch(
    onShellMounted({
      surface: options.surface ?? desktopSurface,
      isDevelopment: false,
    }),
  )
  store.dispatch(
    onDestinationRouteMounted({
      destination: options.destination ?? { kind: DestinationKind.allTasks },
    }),
  )
  return store
}

export type CaptureStore = ReturnType<typeof makeCaptureStore>

/**
 * A scheme, applied where a portal can see it.
 *
 * `storyStage.tsx`'s `Stage` puts `data-theme` on a `div`, which is enough for
 * a component rendered inline. Both surfaces here are Radix dialogs, and a
 * dialog portals to `document.body` — outside any story container — so the
 * attribute has to go on the document element or the panel renders in the light
 * palette no matter what the story asked for. Restored on unmount so one story
 * cannot leave the next one dark.
 */
export function ThemeScope({
  theme,
  children,
}: {
  readonly theme: 'light' | 'dark'
  readonly children: ReactNode
}) {
  useEffect(() => {
    const root = document.documentElement
    const previous = root.getAttribute('data-theme')
    root.setAttribute('data-theme', theme)
    return () => {
      if (previous === null) root.removeAttribute('data-theme')
      else root.setAttribute('data-theme', previous)
    }
  }, [theme])

  return (
    <div
      data-theme={theme}
      style={{
        minHeight: 420,
        background: 'var(--kro-color-back)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {children}
    </div>
  )
}

/** The provider wrapper every Page story and Page test renders inside. */
export function CaptureStoreStage({
  store,
  children,
}: {
  readonly store: CaptureStore
  readonly children: ReactNode
}) {
  return <StoreProvider store={store}>{children}</StoreProvider>
}
