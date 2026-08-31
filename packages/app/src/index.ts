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
