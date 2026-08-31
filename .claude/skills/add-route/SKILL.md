---
name: add-route
description: Add a user-facing route to Kro Web the react-uzf-v1 way — feature slice in @kro/app, thin passive route file in apps/web. Use when adding or changing a navigable surface.
---

# Skill: add-route

Add a navigable surface to Kro Web. **The route file is the last and smallest thing you write.**
Almost everything lives in `packages/app`; `apps/web` is a thin shell (`RC-62`).

> **Lane check first.** `apps/web/src/app/**` is the exclusive lane of the shell child
> ([#13](https://github.com/zheref/kro-pwa/issues/13)). If you are not that child and your issue
> does not name that lane, build the feature in `packages/app` and stop — do not add the route
> file. Say so in the PR.

## 1. The feature (in `packages/app/src/features/<feature>/`)

Copy the shape of `features/greeting/` — it is the reference, and it is deleted once real
features exist. Six files:

| File | Holds | Rule |
|---|---|---|
| `<F>Feature.ts` | `createSlice`, the co-located `interface <F>State`, `initialState`, `reducers`, `extraReducers` | `RC-1`, `RC-24`, `RC-36` |
| `<F>Shifters.ts` | pure `with…(state, args): <F>State` | `RC-4`, `RC-19` |
| `<F>Selectors.ts` | `createSelector` over `RootState` | `RC-5` |
| `<F>Producer.ts` | `createAsyncThunk` resolving `Result<T, <F>Exception>` | `RC-3`, `RC-7`, `RC-25` |
| `<F>Mocks.ts` | canned `State` variants for stories **and** tests | `RC-31` |
| `use<F>.ts` | the headless hook: dispatch intent, read via Selectors, return a view model + callbacks. **No `useState`.** | `UZF-4`, `RC-10` |

Non-negotiables while writing them:

- Lifecycle is **one** discriminated field, not `isLoading` + `exception`.
- Event names say intent: `onViewLoaded`, `userDidTap…`, `child…Delegated…`. The thunk's type
  string is `'<feature>/on<Thing>Completed'`.
- The Producer takes **narrow inputs** (never `getState()`), reads its Service from `extra`, and
  passes `thunkAPI.signal` through so an abort exits silently.
- The mount effect returns `() => effect.abort()`; the `.rejected` arm returns early on
  `action.meta.aborted`.

## 2. Register it — exactly two lines

In `packages/app/src/library/store.ts`:

```ts
reducer: { greeting: greetingSlice.reducer, <feature>: <feature>Slice.reducer },
```

and, **only if** the feature needs a new Service, one field on `ThunkExtra` plus its binding in
`liveThunkExtra` and `stubbedThunkExtra`. There is no other registration mechanism (`RC-21`,
`RC-23`). A slice registered only in a test is not registered.

Export the feature's public surface from `packages/app/src/index.ts`. **Never export a Service
from that barrel** — a Service reaches a Producer only through `ThunkExtra`.

## 3. The render layer (in `packages/app`)

- **`<F>Page.tsx`** — the stateful container. The only artifact that calls
  `useAppSelector`/`useAppDispatch` for this feature. It owns no markup beyond its single
  Fragment call (`RC-37`).
- **`<F>Fragment.tsx`** — passive. May `useAppSelector`, **never dispatches a thunk**; intent
  arrives as callback props (`RC-15`).
- Reusable, domain-less pieces go under `design/` and import nothing from `react-redux`, a slice
  or a Producer (`RC-14`).
- The Page must **not** import a Next.js API — no `next/navigation`, `next/headers`, `next/image`,
  `next/link`, `next/font` (`RC-40`). `packages/app/scripts/check-uzf-boundaries.mjs` fails the
  lint task if you do.

## 4. The route file (in `apps/web/src/app/<segment>/page.tsx`)

Thin, passive, boring:

```tsx
// apps/web/src/app/<segment>/page.tsx — Server Component (RC-38)
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <FeaturePageClient id={id} />
}
```

- The Server Component resolves params (and optionally prefetches). **No hook, no dispatch.**
- The Client Page Wrapper (`…PageClient.tsx`) is `'use client'`, **≤10 lines**, and forwards
  props only (`RC-39`).
- Prefetched data enters the slice through a dedicated `on…Hydrated` event — never bypassing the
  Shifter (`RC-42`).
- The store is built once at the composition root and handed to `StoreProvider`; the route file
  never calls `makeStore` (`RC-41`).

## 5. Navigation

From a component: a declarative link. From logic: a Producer calling the injected
`NavigationService` (`RC-17`). Never `router.push` inside a component or a reducer.

## 6. Tests — before you call it done

- Reducer actions: ≥3 each (typical / boundary / no-op) directly against the slice reducer.
- Thunk lifecycle arms: ≥3 (happy / failure / edge) driven through the real thunk against
  `makeStore(stubbedThunkExtra)`.
- Selectors: ≥3 against a hand-built root-state slice. Shifters: ≥3, pure.
- Page and Fragment: ≥3 Storybook stories **and** ≥3 mirroring RTL render tests, both consuming
  the same `<F>Mocks`.
- The Server Page and Client Wrapper are **exempt** (`RC-57`).
- ≥80 % line coverage on every touched file.

The pre-commit guard refuses a new source file under `packages/*/src/**` or `apps/web/src/**`
that arrives without a test. That is the floor, not the target.

## 7. Verify

```
make lint && make typecheck && make test && make build
```

`make lint` runs both boundary checkers; a UZF breach fails there with the rule id, not in review.
