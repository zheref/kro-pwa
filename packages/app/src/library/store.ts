/**
 * The single store-construction path (`RC-22`) and the closed service manifest
 * (`RC-21`).
 *
 * `configureStore` is called here and nowhere else — not in a test, not in a
 * story, not in a route file. Production code calls `makeStore()` and gets the
 * live bindings; a test calls `makeStore(stubbedThunkExtra)` and gets
 * deterministic doubles through the exact same reducer map and middleware chain.
 * That is why the factory exists instead of a module-level `export const store`:
 * a singleton could only ever be wired to the live services, so every suite in
 * CI would talk to the network.
 *
 * Registering a feature is one line in the `reducer` map below (`RC-23`) plus one
 * field in `ThunkExtra` per new Service (`RC-21`). There is no second injection
 * mechanism — no service locator, no ambient singleton import.
 */
import type { LocalStore } from '@kro/core'
import { configureStore, isPlain } from '@reduxjs/toolkit'
import { captureSlice } from '../features/capture/CaptureFeature'
import { doSlice } from '../features/do/DoFeature'
import { greetingSlice } from '../features/greeting/GreetingFeature'
import {
  type GreetingService,
  liveGreetingService,
  stubbedGreetingService,
} from '../services/greeting/GreetingService'
import { stubbedLocalStore } from '../services/localStore/InMemoryLocalStore'
import { liveLocalStore } from '../services/localStore/liveLocalStore'

/**
 * Every injectable Service in the app, in one closed manifest. A Producer reads
 * `extra.<service>`; a reducer never sees `extra` at all.
 */
export interface ThunkExtra {
  readonly greetingService: GreetingService
  /**
   * On-device storage (#10) — the eight ports in one bundle rather than eight
   * fields, because they are always wired together (one database, one sign-out)
   * and a Producer needing two of them should not have to declare both.
   * `RC-21`'s single closed manifest is satisfied either way; the bundle is
   * what keeps this interface readable as the store count grows.
   */
  readonly localStore: LocalStore
}

/** The production bindings — the default `makeStore()` argument. */
export const liveThunkExtra: ThunkExtra = {
  greetingService: liveGreetingService,
  localStore: liveLocalStore,
}

/**
 * The fixture-backed bindings every test and story uses. Exported here, beside
 * the manifest, so a suite never has to reach into `services/` itself.
 *
 * `stubbedLocalStore` is **empty**. A suite that needs rows builds its own with
 * `makeInMemoryLocalStore({ endeavors: [...] })` and passes it in, so no two
 * suites can see each other's fixtures through a shared module-level store.
 */
export const stubbedThunkExtra: ThunkExtra = {
  greetingService: stubbedGreetingService,
  localStore: stubbedLocalStore,
}

export const makeStore = (extra: ThunkExtra = liveThunkExtra) =>
  configureStore({
    reducer: {
      greeting: greetingSlice.reducer,
      do: doSlice.reducer,
      capture: captureSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: { extraArgument: extra },
        // Domain models carry real domain types, so a `Date` in state is correct
        // (`RC-24`/`UZF-8`) — a wire string there would be the bug. The check is
        // widened to accept `Date` and nothing else; class instances, functions
        // and promises still fail it.
        serializableCheck: {
          isSerializable: (value: unknown) => value instanceof Date || isPlain(value),
        },
      }),
  })

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
