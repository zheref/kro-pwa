<!-- GENERATED from bankai-core@v0.11.2/handbooks/stacks/react-uzf-v1/rules/00-architecture-overview.md — DO NOT EDIT; change the handbook and re-run sync-canon. -->
<!-- Canonical source in bankai-core; product repos carry a generated mirror (CON-13). -->

# UZF Architecture Overview — React + Redux Toolkit

> **This file is the `RC-{n}` numbering anchor for the whole `react-uzf-v1`
> handbook.** `RC-1` through `RC-20` below are canonical and stable — every
> other file in this `rules/` folder, plus the stack's condensed
> `../architecture.md`, cites these same numbers rather than minting its own.
> The full registry (`RC-1`…`RC-63`, including every rule contributed by other
> files) lives in [`README.md`](README.md).

**Applies to:** every React 19 + Redux Toolkit feature in kro, across
**both** render targets — apps/web (Next.js 15 App Router) and apps/mobile (absent, this repo is web-only)
(Expo SDK 55 / React Native 0.84, New Arch + Hermes).

## Repo-specific placeholders

- `kro` — the product these rules govern. Illustrative example: `Acme`.
- `packages/core` — the shared package holding the entire RTK state-logic tier
  (slices, reducers, selectors, shifters, producers/thunks, services, mappers)
  consumed by **both** render targets. Illustrative example: `packages/core`.
- `apps/web` — the Next.js App Router app that renders packages/core to the
  DOM. Illustrative example: `apps/web`.
- `apps/mobile (absent, this repo is web-only)` — the Expo Router app that renders packages/core to native
  views. Illustrative example: `apps/mobile`.
- `packages/app` — the shared cross-render-target UI package (Tamagui
  components, Solito navigation glue) that both `apps/web` and
  `apps/mobile (absent, this repo is web-only)` import. Illustrative example: `packages/app` (per
  `08-monorepo-and-sharing.md`'s RC-51, the founding topology rule for this
  token — see `rules/README.md`'s token-reconciliation note for why
  `packages/app`, not `packages/ui`, is canonical).
- `docs/Features` — where feature specs (UZF-21) live. Illustrative example:
  `docs/Features`.
- `.github/workflows/pr.yml` — the CI workflow running Vitest/Jest + React Testing
  Library + Storybook. Illustrative example: `test.yml`.
- `featureFlags.ts` — the feature-flag registry type (UZF-22). Illustrative
  example: `FeatureFlag`.

---

UZF (Unidirectional Z Flow) is the application architecture for all upcoming and
existing React features in kro. It is **not** "just Redux," **not**
"Flux with extra steps," and **not** free-form `useState`/Context wiring. Its core
rules are non-negotiable and documented below; sibling rule files in this
handbook refine them further. React 19, Redux Toolkit 2.x, TypeScript 5.5+,
Expo Router, Next.js 15 App Router, Solito v5, Tamagui, `reselect`, Immer, and
RTK Query are canonical stack primitives — they are part of the architecture,
not per-product choices.

> **One stack family, two render targets.** apps/web and apps/mobile (absent, this repo is web-only) share
> the **entire** RTK state-logic tier in packages/core — slices, reducers,
> selectors, shifters, producers/thunks, services, mappers. Only the UI render
> layer differs: apps/web renders DOM via Next.js, apps/mobile (absent, this repo is web-only) renders
> native views via Expo Router. A feature's Page/Fragment is authored once per
> render target against the **same** slice; the state-logic tier never forks.
> This is the lens for every rule below: if a rule concerns state, effects, or
> selection, it lives in packages/core and binds identically on both targets.

## The flow (canonical)

```
User taps/types   ─▶ Page/Fragment dispatches userDidX / onX        [an Event]
                   ─▶ dispatch(slice.actions.x(...)) or dispatch(xThunk(...))
                   ─▶ …Slice reducer arm (100% pure)                 [Reducer]
                         │
                         ├─▶ Shifter: withFoo(state, args)
                         │        └─▶ new State ─▶ store ─▶ useAppSelector
                         │                                    └─▶ Page/Fragment re-renders
                         │
                         └─▶ dispatch(fetchXThunk(...))             [Producer]
                                 └─▶ …Producer.ts calls …Service.operation()
                                         ├─▶ Result<T, …Exception> resolved
                                         │       └─▶ thunk dispatches
                                         │           feature/onXCompleted(result)
                                         │               └─▶ …Slice reducer
                                         │                   (extraReducers) → Shifter → State
                                         └─▶ router.navigate(...) — invoked from the
                                             Producer, never the component (RC-17)
```

Everything funnels through `dispatch` and back into one slice's reducer (UZF-1).
There is no separate "UI effect" channel in this stack — a `Result`-carrying
completion action **is** the one loop-closing event; navigation and other
one-shot view concerns are Service-tier calls made *from* a Producer (RC-17), not
a second event bus.

## Core rules every contributor must hold

1. **One slice per feature** (RC-1, UZF-6). `userProfileSlice = createSlice({ name:
   "userProfile", … })`, filename `…Feature.ts`, co-located with its selectors,
   shifters, and producer in one feature folder. Register the slice in
   `packages/core/library/store.ts`.

2. **Event/action names encode intent, never mechanism** (RC-2, UZF-2). Reducer
   keys and dispatched actions read `userDidPullToRefresh`, `onViewLoaded`,
   `userDidTapEdit`, `childXDelegatedY`. `createAsyncThunk` type strings follow
   `feature/onSomethingCompleted`, with the lifecycle suffix (`.pending` /
   `.fulfilled` / `.rejected`) supplied by RTK. Naming a case after the effect it
   triggers (`fetchProfile`, `loadData`) is forbidden.

3. **Effects are built only by Producers** (RC-3, UZF-12, UZF-15). Components
   never call `fetch`/`axios` directly — they `dispatch(fetchProfileThunk(...))`.
   The thunk body lives in `…Producer.ts`, not inline in a component or a
   reducer.

4. **State mutations go through Shifters** (RC-4, UZF-10). Inside a reducer arm,
   `Object.assign(state, withFoo(state, args))` — a pure `with…(state, args)`
   function in `…Shifters.ts` — is the only allowed mutation pattern unless the
   change is a single primitive assignment.

5. **Selectors live in `…Selectors.ts`**, built with `createSelector` (RC-5,
   UZF-11). No selector logic is written inline inside a `useAppSelector` arrow
   function — that is a Selector escaping its file.

6. **Services are injected via the thunk `extra` argument** (RC-6, UZF-16).
   Define a Service interface; inject it through `configureStore({ middleware:
   (gd) => gd({ thunk: { extraArgument } }) })`. Reducers never import a Service
   directly — only Producers do.

7. **Thunks return `Result<T, E>`; they never throw** (RC-7, UZF-14). UZF's
   `Result` is the contract between Producer and Reducer. A thunk's `.rejected`
   arm exists only as a defensive fallback, never the primary error path.

8. **`Exception` is a discriminated union** (RC-8, UZF-3, UZF-14). State and
   completion events never carry a raw `string` or `Error` to represent a
   user-facing problem — only a typed `…Exception`.

9. **Exhaustiveness check with `assertNever(action)`** at the end of every
   hand-written switch over event/exception kinds (RC-9). This is the
   TypeScript-idiom enforcement of UZF-9's "model exclusive states as one type"
   — a missing arm is a compile error, not a runtime surprise. Inside
   `createSlice`'s own `reducers`/`extraReducers` map, TypeScript's case-key
   exhaustiveness on the action map is already the equivalent guarantee —
   `assertNever` is required for hand-written `switch` statements elsewhere (a
   Mapper's `toException`, an `…Exception["kind"]` check outside the slice),
   not an unreachable default bolted onto every reducer arm.

10. **`useAppSelector` + `useAppDispatch` (typed wrappers) only** (RC-10, UZF-4).
    Never raw `useSelector` / `useDispatch` — the typed wrappers are the
    project's binding of UZF-4's stateful-wrapper boundary.

11. **Pages and Fragments ship ≥ 3 Storybook stories** mirroring the snapshot
    tests (RC-11, UZF-18, UZF-26).

12. **Reducers carry ≥ 3 unit tests per action**, each named after a real-world
    scenario (RC-12, UZF-18, UZF-20).

13. **Domain models declare ≥ 7 mock variations** in `__mocks__/*.mocks.ts`
    (RC-13, UZF-18).

14. **Components (domain-less) live under `design/`** and use no RTK hooks
    (RC-14, UZF-5). Domain-bound reusable UI is a Fragment, not a Component.

15. **Fragments may `useAppSelector` but never dispatch async thunks** (RC-15,
    UZF-4, UZF-7). A Fragment receives its intent callbacks via props; only a
    Page (or a Producer beneath it) dispatches an effect-bearing thunk.

## Supporting rules folded in from the synthesis canon

- **RTK Query endpoints are Service-tier** (RC-16, extends UZF-16, UZF-17).
  Their auto-generated hooks (`useGetXQuery`, …) are **forbidden inside Pages**;
  expose a `Producer` thunk that delegates to the RTK Query endpoint under the
  hood instead, so Pages keep one dispatch surface.
- **The router is a Service** (RC-17, extends UZF-13, UZF-16). `router.navigate(...)`
  is invoked from a Producer, never from a component — navigation is a
  side-effecting boundary like any other Service operation.
- **Memoize Adapters** with `React.memo` and stable keys (RC-18, extends UZF-7's
  active/passive split — an Adapter is passive and must not re-render on
  unrelated state changes).
- **Immer mutation syntax is scoped, not default** (RC-19, extends UZF-10). Use
  Immer's draft-mutation style only when nested state deeply benefits from it;
  flat slice state still goes through pure Shifters so the mutation stays
  unit-testable in isolation.
- **Slices never cross-import** (RC-20, extends UZF-6). Slices communicate only
  through selectors composed at the root level — a slice importing another
  slice's state shape directly is a finding.

## Folder layout per feature

```
packages/core/features/<feature>/
    <feature>Feature.ts        # createSlice({ name: '<feature>' })                 (RC-1)
    <feature>State.ts          # interface <Feature>State, co-located with the slice (RC-1)
    <feature>Selectors.ts      # createSelector(...) selectors                      (RC-5)
    <feature>Shifters.ts       # pure with…(state, args) functions                  (RC-4)
    <feature>Producer.ts       # createAsyncThunk factories                         (RC-3, RC-6)
    <feature>Mocks.ts          # ≥7 domain-model mock variations, build-excluded    (RC-13)
    __tests__/                 # ≥3 tests per reducer arm / selector / producer     (RC-12)

apps/web/app/<route>/
    page.tsx                   # thin Next.js route — mounts the shared Page
    <Feature>Page.tsx          # stateful wrapper: useAppSelector / useAppDispatch
    <Feature>Fragment.tsx      # domain-bound, selector-read-only, dispatch via props (RC-15)

apps/mobile (absent, this repo is web-only)/app/<route>/
    index.tsx                  # Expo Router screen — same <Feature>Page/Fragment,
                                # native renderer, same packages/core slice

design/
    <Component>.tsx            # domain-less, no RTK hooks                          (RC-14)
```

The canonical UZF runtime (`library/store.ts`, `library/hooks.ts`,
`library/result.ts`, `library/assertNever.ts`) lives in packages/core, not in
any feature folder — it is cross-feature, not per-feature.

## Hard "never"s — memorize these

1. **Never** call `useState` for anything that is part of feature state — put it
   in the slice. (RC-1, RC-10.)
2. **Never** call `fetch`/`axios` directly from a component or a Page. (RC-3.)
3. **Never** throw out of a `createAsyncThunk` payload creator, or return
   anything other than a `Result` from a Producer. (RC-7.)
4. **Never** write `useEffect(() => { fetch(...) }, [])` inside a Page — that is
   an effect escaping the Producer. (RC-3.)
5. **Never** use the `connect()` HOC — hooks-based bindings only. (RC-10.)
6. **Never** import one slice's state shape from another slice — communicate
   through root-level selectors. (RC-20.)
7. **Never** write selector logic inline inside a `useAppSelector` callback —
   promote it to `…Selectors.ts`. (RC-5.)
8. **Never** dispatch an async thunk from a Fragment — Fragments take intent via
   props only. (RC-15.)
9. **Never** ship a new `…Service` without a matching `stubbed…Service` and a
   fixture JSON file. (RC-6.)
10. **Never** land a reducer arm without a corresponding test in the same PR, or
    an action name missing the `userDid…` / `on…` / `child…Delegated…` prefix.
    (RC-2, RC-12.)

## Glossary at a glance (UZF ↔ React + Redux Toolkit)

| UZF | React + RTK |
| --- | --- |
| Page | `function …Page()` connected via `useAppSelector` / `useAppDispatch` |
| Fragment | `function …Fragment()` — selector access OK, dispatch only via callback props |
| Component | Plain `function …()` under `design/`, no Redux |
| Adapter | `React.memo`-wrapped `function …Adapter({ item, onTap })` |
| Theme | `theme.ts` exporting design tokens + a `useAppTheme()` hook |
| Interactor | `createSlice({ name: '…' })` exported as `…Slice` |
| State | `interface …State` co-located with the slice |
| Event | An action object (auto-generated by `createSlice`) or a thunk action |
| Reducer | `reducers` + `extraReducers` blocks of `createSlice` — 100% pure |
| Shifter | Pure `with…(state, args)` function in `…Shifters.ts` |
| Selector | `createSelector(...)` in `…Selectors.ts`, consumed via `useAppSelector` |
| Producer | Module exporting `createAsyncThunk(...)` factories |
| Effect | The promise returned by an async thunk |
| Service | TS interface + `live…Service` + `stubbed…Service` implementations |
| Operation | A method on a Service interface |
| Repository | Plain TS class wrapping multiple services |
| Provider | Module exporting synchronous helpers (`EnvironmentProvider.current()`) |
| Task | A `…Task` wrapper around `AbortController` + Promise |
| Result | The `Result<T, E>` type from `library/result.ts` |
| Exception | Discriminated union (`ProfileException`) |
| Mapper | `…Mapper` module exporting `toDomain` / `fromDomain` |
| Context | React Context — non-UZF concerns only (theme, locale); never feature state |

When in doubt, re-read this file. Every other rule file in this handbook is a
refinement of the rules above.
