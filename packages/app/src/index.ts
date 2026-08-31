/**
 * `@kro/app` — the shared UZF state + feature tier.
 *
 * Layout:
 *   `library/`   the store (`makeStore`, `ThunkExtra`), the typed hooks and the
 *                `StoreProvider` — the whole Redux ↔ React seam (`RC-10`, `RC-21`,
 *                `RC-22`).
 *   `services/`  Service interfaces with their `live…` / `stubbed…` pair. NOT
 *                exported from this barrel on purpose: a Service reaches a
 *                Producer only through `ThunkExtra`, so no component can import
 *                one (`RC-6`).
 *   `features/`  one folder per feature — slice, Shifters, Selectors, Producer,
 *                mocks and the headless hook (`RC-1`).
 *
 * `apps/web` is a thin shell over this package: it builds the store once at its
 * composition root, wraps the tree in `StoreProvider`, and renders. It owns no
 * slice, no selector and no producer (`RC-62`).
 */

export { StoreProvider, type StoreProviderProps } from './library/StoreProvider'
export { useAppDispatch, useAppSelector } from './library/hooks'
export {
  type AppDispatch,
  type AppStore,
  type RootState,
  type ThunkExtra,
  liveThunkExtra,
  makeStore,
  stubbedThunkExtra,
} from './library/store'

/*
 * No Service is exported here, including the navigation one (`RC-6`). The
 * *live* navigation binding cannot be built inside this package anyway —
 * `RC-40` forbids it from importing `next/*` — so, exactly as `RC-48`
 * prescribes for a platform-bound Service, the interface lives here and
 * `apps/web` authors the live implementation at its own composition root. It
 * needs no import to do so: `ThunkExtra['navigation']` is the contract.
 */

/**
 * The navigation shell (KC-IS-#13) — the responsive contract, the destination
 * model, the two shells and the Pages `apps/web`'s route files mount. The
 * route tree is the shell's; a feature child replaces a destination's body
 * without touching `apps/web` at all.
 */
export * from './features/main'

/*
 * Feature render tiers, one line each. A feature's LOGIC stays unexported —
 * `apps/web` never reads a slice — so only the Pages a route file mounts and
 * the overlay the shell hosts cross this boundary.
 */
// KC-IS-#30 — Find, All Tasks and the global Endeavor Detail overlay.
export * from './features/find/pages'
export * from './features/endeavorDetail/pages'
/**
 * The Earn destination (`KC-IS-#28`) — the catalog, the claim flow and the
 * Add-Reward form. `EarnPage` is what the `/earn` route mounts in place of
 * the shell's placeholder; the rest of the barrel is exported for its own
 * stories/tests and for a sibling that composes one of its pieces directly.
 */
export * from './features/earn'
/**
 * The Plan timeline (KC-IS-#19) — the Page `/plan` mounts, its Fragments and
 * the pure modules behind them. The Plan *slice* stays unexported for the same
 * reason every other slice does: a component reaches it through this Page, not
 * through the store's shape.
 *
 * One line on a shared barrel, added by the child that first needed it — the
 * same seam `design/endeavor/index.ts` and `design/chrome/index.ts` describe
 * for themselves. KC-IS-#20 needs no second line; it extends this Page's
 * destination slots.
 */
export * from './features/plan/pages'
/**
 * The Capture & Inbox render tier (KC-IS-#24) — the capture prompt, the Inbox
 * in all three of its presentations, and the `CaptureOverlays` mount the shell
 * wrapper anchors in one line. A feature child that wants to open the prompt
 * dispatches `userDidRequestCapture`; it needs nothing from here.
 */
export * from './features/capture/pages'

// SCAFFOLDING — the demo feature proving the loop. Feature children replace it.
export {
  type GreetingLoadState,
  type GreetingState,
  childDetailDelegatedClose,
  greetingSlice,
  initialGreetingState,
  onViewLoaded,
  userDidTapGreeting,
  userDidTapRetry,
} from './features/greeting/GreetingFeature'
export { fetchGreetingThunk } from './features/greeting/GreetingProducer'
export {
  selectGreeting,
  selectGreetingException,
  selectGreetingHeadline,
  selectIsGreetingDetailOpen,
  selectIsGreetingLoading,
} from './features/greeting/GreetingSelectors'
export { type GreetingViewModel, useGreeting } from './features/greeting/useGreeting'

/**
 * Auth + Settings UI (KC-IS-#32) — the Settings hub and its panes, the profile
 * popover, and the auth surface.
 *
 * Appended as its own block rather than folded above, for the same
 * anti-contention reason `features/main`'s block gives: a parallel child adds
 * its own block below instead of contending for a line in an existing one.
 *
 * Only `SettingsHubPage` is reachable from `apps/web` (the `/adjust` route
 * mounts it); everything else is exported because a story, a test or the shell
 * composes it. The auth *slice* stays KC-IS-#31's and is not re-exported here.
 */
export {
  type AccountPane,
  type AccountSectionFragmentProps,
  type IntegrationsSectionFragmentProps,
  type PreferencesSectionFragmentProps,
  type ProfilePopoverFragmentProps,
  type SettingsHubFragmentProps,
  AccountSectionFragment,
  IntegrationsSectionFragment,
  PreferencesSectionFragment,
  ProfileControlPage,
  ProfilePopoverFragment,
  SettingsHubFragment,
  SettingsHubPage,
  SettingsSectionId,
  settingsSections,
} from './features/settings'
export {
  type AuthSurfaceFragmentProps,
  type AuthSurfacePageProps,
  type LocalDataDialogFragmentProps,
  AuthSurfaceFragment,
  AuthSurfacePage,
  LocalDataDialogFragment,
} from './features/auth/pages'

/**
 * The Triage render tier (KC-IS-#26) — the carousel that mounts **inside** the
 * Inbox surface, its form, and the two pure modules they sit on.
 *
 * Appended as its own block rather than folded above, for the same
 * anti-contention reason the `features/main` and Settings blocks give: a
 * parallel child adds its own block below instead of contending for a line in
 * an existing one.
 *
 * `apps/web` reaches none of it. Triage has no route by canon's own decision,
 * and the Inbox's two Pages mount `TriageCarouselPage` into their `overlay`
 * slot — so the barrel exists for stories, tests, and a sibling that composes
 * one of the pieces.
 */
export * from './features/triage/pages'
