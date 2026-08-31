<!-- GENERATED from bankai-core@v0.11.2/handbooks/stacks/react-uzf-v1/rules/02-store-setup.md — DO NOT EDIT; change the handbook and re-run sync-canon. -->
<!-- Canonical source in bankai-core; product repos carry a generated mirror (CON-13). -->

# 02 — Store Setup (`library/store.ts`, `library/hooks.ts`, `library/result.ts`, `assertNever`)

Every project on this stack provides **one** shared, **project-agnostic** `library/` module that
every feature slice sits on top of. Because React web (Next.js) and React Native/Expo **share the
same RTK state-logic tier** (KEY MODEL — see stack overview), this module lives in
`packages/core` and is imported unchanged by both the `apps/web` and `apps/mobile (absent, this repo is web-only)` render
targets — nothing in it may import a DOM API, a React Native API, or a UI framework. It has four
files: the `Result<T, E>` contract, the `assertNever` exhaustiveness helper, the typed store
(`configureStore` + service injection + slice registration), and the typed
`useAppSelector`/`useAppDispatch` hooks (implements `UZF-6`, `UZF-13`, `UZF-14`, `UZF-16`).

## Repo-specific placeholders

- `packages/core` — the shared package both render targets depend on; `library/` lives at
  `packages/core/src/library/`.
- `apps/web` — the Next.js App Router app directory that consumes `packages/core`.
- `apps/mobile (absent, this repo is web-only)` — the Expo Router app directory that consumes the same `packages/core`.
- `kro` — product name, used only to illustrate the *forbidden* product-namespaced
  import that must never appear inside `library/`.

---

## 1. The whole module at a glance

The module is portable: everything here compiles against a bare `@reduxjs/toolkit` +
`react-redux` install, with no feature code and no product code.

```
packages/core/src/library/
    result.ts                # Result<T, E> — the canonical success/failure container
    assertNever.ts           # compile-time exhaustiveness helper
    store.ts                 # ThunkExtra, makeStore(), AppStore/RootState/AppDispatch types
    hooks.ts                 # typed useAppSelector / useAppDispatch
```

---

## 2. `Result<T, E>` (`library/result.ts`)

```ts
// packages/core/src/library/result.ts

/**
 * Canonical UZF `Result<T, E>` discriminated union.
 * Use this in every Action payload that holds the outcome of an Effect.
 */
export type Result<T, E> =
    | { readonly ok: true;  readonly value: T }
    | { readonly ok: false; readonly error: E };

export const ok    = <T>(value: T): Result<T, never> => ({ ok: true,  value });
export const err   = <E>(error: E): Result<never, E> => ({ ok: false, error });
export const isOk  = <T, E>(r: Result<T, E>): r is { ok: true;  value: T } => r.ok;
export const isErr = <T, E>(r: Result<T, E>): r is { ok: false; error: E } => !r.ok;
```

**RC-7 — `Result<T, E>` is the sole contract between a Producer and a Reducer.** A `createAsyncThunk`
payload creator returns `Promise<Result<Success, …Exception>>`; it never `throw`s and its
`.rejected` arm is a defensive fallback only, never the primary path (implements `UZF-3`, `UZF-14`).
A thunk that resolves anything other than a `Result` — a bare value, a bare `Error`, `void` — is a
review-blocking finding.

---

## 3. `assertNever` (`library/assertNever.ts`)

```ts
// packages/core/src/library/assertNever.ts

/**
 * Compile-time exhaustiveness check. Pass the discriminated-union value to the
 * default branch of a switch so TypeScript fails the build if a new case is added.
 */
export function assertNever(value: never): never {
    throw new Error(`Unhandled discriminated-union case: ${JSON.stringify(value)}`);
}
```

**RC-9 — Every `switch` over a discriminated union ends in `assertNever`.** This covers `…Event`
unions handled outside `createSlice`'s `reducers` map (e.g. a `switch` inside a Mapper or a
non-RTK consumer) and every `…Exception["kind"]` switch (implements `UZF-9`). Inside `createSlice`
`reducers`/`extraReducers`, TypeScript's own case-key exhaustiveness on the action map is the
equivalent guarantee — `assertNever` is for hand-written `switch` statements elsewhere, not a
requirement to bolt an unreachable default onto every slice. (Same rule as
`00-architecture-overview.md`'s core rule 9 and `01-feature-and-events.md`'s exhaustiveness
section — this file owns the canonical `library/assertNever.ts` implementation.)

---

## 4. Service injection — `ThunkExtra` (the thunk `extra` argument)

```ts
// packages/core/src/library/store.ts  (excerpt — see §5 for the full file)

import type { ProfileService } from "../services/network/ProfileService";

/** Extra argument passed to every thunk — UZF "Services" injected via DI. */
export interface ThunkExtra {
    readonly profileService: ProfileService;
}
```

**RC-6 — A Producer reaches a Service only through the thunk `extra` argument, never through a
module-level import.** `createAsyncThunk<Return, Args, { extra: ThunkExtra }>(...)` destructures
`{ extra }` from its second parameter; reducers never see `extra` at all (implements `UZF-13`,
`UZF-16`). A Producer file with a top-level `import { profileService } from ".../ProfileService"`
instead of reading `extra.profileService` is forbidden — it breaks stub substitution in tests and
Storybook.

**RC-21 — `ThunkExtra` is the single, closed manifest of every injectable service in the app.**
Adding a service operation means: add the method to the Service interface, add it to **both**
`live…Service` and `stubbed…Service`, and — if it's a new service, not a new method — add the field
to `ThunkExtra`. There is no second injection mechanism (no service locator, no ambient singleton
import) alongside `ThunkExtra` (refines `UZF-16`).

---

## 5. `configureStore` + slice registration (`library/store.ts`)

```ts
// packages/core/src/library/store.ts

import { configureStore } from "@reduxjs/toolkit";
import { userProfileSlice } from "../features/userProfile/UserProfileFeature";
import { settingsSlice } from "../features/settings/SettingsFeature";
import { liveProfileService, type ProfileService } from "../services/network/ProfileService";

/** Extra argument passed to every thunk — UZF "Services" injected via DI. */
export interface ThunkExtra {
    readonly profileService: ProfileService;
}

/**
 * The single store-construction path. Real app code calls `makeStore()` with no
 * arguments (the live services default in); tests and Storybook call it with a
 * stub-populated `extra` to substitute deterministic doubles.
 */
export const makeStore = (extra: ThunkExtra = { profileService: liveProfileService }) =>
    configureStore({
        reducer: {
            userProfile: userProfileSlice.reducer,
            settings: settingsSlice.reducer,
        },
        middleware: (getDefault) =>
            getDefault({ thunk: { extraArgument: extra } }),
    });

export type AppStore    = ReturnType<typeof makeStore>;
export type RootState   = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
```

**RC-22 — There is exactly one store-construction path: `makeStore(extra)` in `library/store.ts`.**
No feature, page, test, or Storybook preview calls `configureStore(...)` directly — they call
`makeStore(...)` (or a thin wrapper around it, e.g. `makeStoreWith(service)` in tests) so every
consumer shares the same reducer map and middleware wiring (refines `UZF-6`: `library/store.ts` is
the cross-feature aggregation point; a second hand-assembled store is a duplicated core layer).

**RC-23 — Slice registration is closed to `library/store.ts`'s `reducer` map.** A new feature adds
one line — `<name>: <name>Slice.reducer` — to that map and nowhere else. A slice whose reducer is
wired into a store only inside a test file or a Storybook decorator, and never here, is not
actually registered in the app.

### Why `makeStore` is a factory, not a module-level singleton

A bare exported `export const store = configureStore(...)` cannot take a stub `ThunkExtra` — every
test and every Storybook story would share one process-wide store wired to the **live**
`profileService`, making network calls in CI. The factory defers construction: production code
(`apps/web`'s root layout, `apps/mobile (absent, this repo is web-only)`'s root layout) calls `makeStore()` with the default
(live) `extra`; a test calls `makeStore({ profileService: stubbedProfileService })` or its own
`makeStoreWith(...)` helper. Both paths run the identical reducer map and middleware — only the
injected services differ.

### Registering a second service

```ts
// Adding a `settingsService` alongside `profileService`:
export interface ThunkExtra {
    readonly profileService: ProfileService;
    readonly settingsService: SettingsService;
}

export const makeStore = (
    extra: ThunkExtra = { profileService: liveProfileService, settingsService: liveSettingsService },
) => configureStore({ /* ... */ });
```

Every existing thunk's `{ extra: ThunkExtra }` generic parameter is unaffected — it only reads the
keys it declares a dependency on.

---

## 6. Typed hooks (`library/hooks.ts`)

```ts
// packages/core/src/library/hooks.ts

import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import type { AppDispatch, RootState } from "./store";

export const useAppDispatch: () => AppDispatch        = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

**RC-10 — `useAppSelector` / `useAppDispatch` are the only Redux-React binding surface.** Every
Page, Fragment, and Adapter imports these two from `library/hooks.ts`; a raw `import { useSelector
} from "react-redux"` (or `useDispatch`) anywhere outside this file is forbidden (implements the
React-family hard rule; ties to `UZF-4`'s stateful-wrapper boundary — the typed hooks are the only
door between a component and `RootState`/`AppDispatch`).

---

## 7. Forbidden

- Importing a live service (`profileService`, or any concrete `…Service` implementation) at module
  scope inside a Producer, a slice file, a Page, or a Fragment. Services reach a Producer only via
  the thunk `extra` argument (`RC-6`).
- A second injection mechanism alongside `ThunkExtra` — a service-locator singleton, an ambient
  module-level `let currentService`, or a service imported straight from `services/` inside a
  reducer or component (`RC-6`, `RC-21`).
- Calling `configureStore(...)` anywhere other than inside `makeStore` in `library/store.ts` —
  including "just for this one test" or "just for this one story" (`RC-22`).
- Registering a slice's reducer in a store built ad hoc in a test/story file instead of adding it
  to `library/store.ts`'s `reducer` map (`RC-23`).
- Importing `useSelector` / `useDispatch` from `react-redux` directly instead of
  `useAppSelector`/`useAppDispatch` from `library/hooks.ts` (`RC-10`).
- A `createAsyncThunk` payload creator that can `throw` on an expected failure path instead of
  resolving `err(...)`. Only a *programmer* error (a bug) should ever reach `.rejected` (`RC-7`;
  implements `UZF-14`).
- A hand-written `switch` over a `…Event` or `…Exception["kind"]` union with a `default: break` or
  `default: return state` instead of `default: return assertNever(value)` (`RC-9`).
- Putting project-specific code under `library/`: product-namespaced types (e.g.
  `kro…`), app-shell types, brand names, or domain types. The module is portable
  across both render targets — only content that compiles against a bare `@reduxjs/toolkit` +
  `react-redux` install may live here.
