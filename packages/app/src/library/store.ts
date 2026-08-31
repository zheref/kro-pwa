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
import {
  type FeatureFlagService,
  type LocalStore,
  type SignOutWipe,
  makeHardcodedFeatureFlagService,
} from '@kro/core'
import { configureStore, isPlain } from '@reduxjs/toolkit'
import { authSlice } from '../features/auth/AuthFeature'
import { captureSlice } from '../features/capture/CaptureFeature'
import { doSlice } from '../features/do/DoFeature'
import { earnSlice } from '../features/earn/EarnFeature'
import { endeavorDetailSlice } from '../features/endeavorDetail/EndeavorDetailFeature'
import { findSlice } from '../features/find/FindFeature'
import { greetingSlice } from '../features/greeting/GreetingFeature'
import { mainSlice } from '../features/main/MainFeature'
import { planSlice } from '../features/plan/PlanFeature'
import { triageSlice } from '../features/triage/TriageFeature'
import {
  type AuthService,
  makeLiveAuthService,
  stubbedAuthService,
} from '../services/auth/AuthService'
import {
  type GreetingService,
  liveGreetingService,
  stubbedGreetingService,
} from '../services/greeting/GreetingService'
import { stubbedLocalStore } from '../services/localStore/InMemoryLocalStore'
import { liveLocalStore } from '../services/localStore/liveLocalStore'
import { signOutWipe } from '../services/localStore/signOutWipe'
import {
  type NavigationService,
  stubbedNavigationService,
} from '../services/navigation/NavigationService'
import { liveSupabaseClientProvider } from '../services/supabase/SupabaseClientProvider'
import { makeLiveEndeavorCloudTransport } from '../services/sync/EndeavorCloudTransport'
import {
  type EndeavorSyncService,
  makeEndeavorSyncService,
  stubbedEndeavorSyncService,
  supabaseHostingGate,
} from '../services/sync/EndeavorSyncService'
import {
  type SettingsSyncService,
  makeLiveSettingsSyncService,
  stubbedSettingsSyncService,
} from '../services/sync/SettingsSyncService'

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
  /**
   * The sign-out wipe (#10). A field of its own rather than a method on
   * `LocalStore`, because it is the one operation that spans every store and
   * the port deliberately keeps it outside the per-store interfaces — see
   * `SignOutWipe` in `@kro/core`. A Producer cannot import it directly
   * (`RC-6`), so it arrives here.
   */
  readonly signOutWipe: SignOutWipe
  /**
   * The `UZF-22` flag registry (#11). A `Provider` in UZF terms (`RC-47`) —
   * synchronous, so a Selector may read it — but injected rather than imported
   * because it holds runtime overrides and a module-level singleton would make
   * every suite in CI share one (the same objection `makeStore` answers).
   */
  readonly featureFlags: FeatureFlagService
  /** Supabase Auth (#31): session, the provider flows, sign-out. */
  readonly authService: AuthService
  /** The cloud-scoped preference subset's transport (#31). */
  readonly settingsSync: SettingsSyncService
  /**
   * The endeavor sync engine (#31) — push (tombstones included) then pull,
   * gated behind `supabaseHosting`, which is OFF at `statusQuo`.
   */
  readonly endeavorSync: EndeavorSyncService
  /**
   * The router, as a Service (#13). `RC-17`/`RC-63`: navigation is invoked
   * from a Producer, never from a component, so the router arrives here like
   * any other boundary. The default binding is the no-op stub — the live one
   * is built at `apps/web`'s composition root, which is the only file in the
   * repo that imports `next/navigation`.
   */
  readonly navigation: NavigationService
}

/**
 * The live flag service.
 *
 * Built once here so the endeavor engine's gate and any Selector reading a flag
 * see the same overrides within one browser session. `apps/web` will hand the
 * same instance down when the composition root lands (#13).
 */
const liveFeatureFlags: FeatureFlagService = makeHardcodedFeatureFlagService()

/** The production bindings — the default `makeStore()` argument. */
export const liveThunkExtra: ThunkExtra = {
  greetingService: liveGreetingService,
  localStore: liveLocalStore,
  signOutWipe,
  featureFlags: liveFeatureFlags,
  authService: makeLiveAuthService({ clientProvider: liveSupabaseClientProvider }),
  settingsSync: makeLiveSettingsSyncService({
    clientProvider: liveSupabaseClientProvider,
  }),
  endeavorSync: makeEndeavorSyncService({
    localStore: liveLocalStore,
    transport: makeLiveEndeavorCloudTransport(liveSupabaseClientProvider),
    isCloudEnabled: supabaseHostingGate(liveFeatureFlags),
  }),
  // The no-op default: `makeStore()` runs before — and during a server render,
  // entirely without — a router. `apps/web/src/app/providers.tsx` builds the
  // live binding and passes it in.
  navigation: stubbedNavigationService,
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
  signOutWipe,
  // `statusQuo` by default, so a suite that asserts on shipping behaviour gets
  // shipping behaviour — `supabaseHosting` disabled, exactly like canon.
  featureFlags: makeHardcodedFeatureFlagService(),
  authService: stubbedAuthService,
  settingsSync: stubbedSettingsSyncService,
  endeavorSync: stubbedEndeavorSyncService,
  // A suite that asserts on navigation passes its own
  // `makeRecordingNavigationService()`; the shared default records nothing, so
  // no two suites can see each other's calls.
  navigation: stubbedNavigationService,
}

export const makeStore = (extra: ThunkExtra = liveThunkExtra) =>
  configureStore({
    reducer: {
      greeting: greetingSlice.reducer,
      do: doSlice.reducer,
      capture: captureSlice.reducer,
      triage: triageSlice.reducer,
      plan: planSlice.reducer,
      find: findSlice.reducer,
      endeavorDetail: endeavorDetailSlice.reducer,
      earn: earnSlice.reducer,
      auth: authSlice.reducer,
      main: mainSlice.reducer,
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
