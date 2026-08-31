<!-- GENERATED from bankai-core@v0.11.2/handbooks/stacks/react-uzf-v1/rules/11-forbidden-patterns.md — DO NOT EDIT; change the handbook and re-run sync-canon. -->
<!-- Canonical source in bankai-core; product repos carry a generated mirror (CON-13). -->

# 11 — Forbidden Patterns (quick reference)

Reject any PR or generated code that contains a pattern below. This file is the
**single greppable reject list** for the React UZF stack — every other rule file
points back here. Each entry is tagged with its parent cross-platform **`UZF-{n}`**
concept (where one exists) and the React/Redux Toolkit stack binding **`RC-{n}`**
(the React-family analog of the Compose stack's `KT-{n}` / the SwiftUI stack's
`SW-{n}`). Codes are **stable and append-only** — never renumber. An `RC-{n}` may
tighten its `UZF-{n}` parent but never contradicts it.

Recall the key model: React web (apps/web, Next.js App Router) and React
Native/Expo (apps/mobile (absent, this repo is web-only)) **share** the RTK state-logic tier — slices,
reducers, selectors, shifters, producers, services, mappers — in
`packages/core`. Only the UI render layer differs, so most entries below apply
identically to both render targets; where one is render-target-specific it says so.

## Repo-specific placeholders

| Token | Illustrative value | What it is |
| --- | --- | --- |
| `kro` | `Kro` | Product/brand name; also the prefix of product-specific type names. |
| `packages/core` | `packages/core` | Shared package holding the RTK state-logic tier (slices, selectors, shifters, producers, services, mappers) consumed by both `apps/web` and `apps/mobile (absent, this repo is web-only)`. Must stay render-target-free — no JSX, no `next/*`, no `expo-*` imports. |
| `apps/web` | `apps/web` | Next.js App Router application — the web render target. |
| `apps/mobile (absent, this repo is web-only)` | `apps/mobile` | Expo Router application — the React Native (New Arch + Hermes) render target. |

> A token that appears in a rule file MUST be listed here. Adding or renaming a
> token is a Naruto G4 change (keep the generator's substitution map in lockstep).
> Stack-standard libraries (Redux Toolkit, RTK Query, reselect, Immer, Tamagui,
> Solito, Vitest/Jest, React Testing Library, Storybook) are **not** tokenized —
> they are the stack, the same way TCA is fixed on the SwiftUI stack.

---

## Architecture

- Cross-slice state imports — a slice, selector, shifter, or producer in one
  feature importing state or selectors from a sibling feature's slice module
  directly (`import { selectFoo } from '../otherFeature/otherFeatureSlice'`).
  Slices communicate only through selectors composed at the root `RootState`
  level. (UZF-6, UZF-7, RC-20)
- A Component (under `design/`) importing anything from `react-redux`, a slice,
  or a Producer. Components are domain-less and reusable across both render
  targets — RTK knowledge stops at the Fragment/Page boundary. (UZF-5, RC-14)
- A Fragment dispatching an async thunk. Fragments may read state via
  `useAppSelector` but receive intent only through callback props; dispatching
  the Producer-built effect is the Page's job. (UZF-4, UZF-7, RC-15)
- A "god" Page/Feature file mixing more than one slice's worth of reducer logic.
  Almost always means a missing child feature or a missing Producer split.
  (UZF-6, RC-32)

## React & hooks

- `useState` for anything that's part of feature state inside a Page or
  Fragment. If it needs to survive a re-render for a domain reason, it belongs
  in the slice, not local component state. (UZF-4, RC-4)
- Direct `fetch` / `axios` (or any HTTP client) call from a component or a Page,
  on either render target. Effects are built by Producers; components
  `dispatch(...)` a thunk instead. (UZF-13, UZF-16, RC-3)
- `useEffect(() => { fetch(...) }, [])` (or any variant performing I/O inside an
  effect hook) in a Page. Kick the load off via `dispatch(...Thunk())` from the
  Producer-owned lifecycle event instead. (UZF-12, UZF-13, RC-3)
- Using the `connect()` HOC. Only hooks-based bindings (`useAppSelector` /
  `useAppDispatch`) are permitted. (RC-10)
- Raw `useSelector` / `useDispatch` from `react-redux` instead of the typed
  `useAppSelector` / `useAppDispatch` wrappers. (RC-10)
- A selector defined inline inside a `useAppSelector(state => ...)` arrow
  function instead of a `createSelector` export in `…Selectors.ts`. (UZF-11,
  RC-5)
- Memoizing a list Adapter with a hand-rolled `useMemo`/`useCallback` chain
  instead of `React.memo` + stable keys, where a plain memo would do. (RC-18)

## Redux Toolkit — producers & reducers

- Throwing out of a `createAsyncThunk` payload creator. Normalize every
  outcome — success and failure alike — into `Result<T, …Exception>`; `.rejected`
  exists only as a defensive fallback, never the primary error path. (UZF-14,
  RC-7)
- A Producer (thunk) returning, or a reducer arm consuming, anything other than
  `Result<T, …Exception>` from an effect. (UZF-14, RC-7)
- A Producer that takes the entire `State` (or reaches into `getState()` beyond
  what one effect needs) instead of narrow, explicit inputs (ids, params,
  injected services). (UZF-15, RC-3)
- An action name lacking the `userDid…` / `on…` / `on…Completed` /
  `child…Delegated…` prefix, or named after the effect it triggers
  (`fetchProfile`, `loadData` instead of `userDidPullToRefresh`,
  `onProfileLoadCompleted`). (UZF-2, RC-2)
- A state mutation inside a reducer arm that isn't `Object.assign(state,
  withFoo(state, args))` (or a single primitive assignment) — hand-rolled
  multi-field Immer mutation instead of a pure, unit-tested Shifter. (UZF-10,
  RC-4)
- A `switch`/`if`-chain over an `Exception`'s discriminated cases with no
  terminal `assertNever(...)` exhaustiveness check. (UZF-9, RC-9)
- A reducer arm merged without ≥ 3 scenario-named unit tests in the same PR.
  (UZF-18, RC-12)

## Services & dependency injection

- A `Service` instantiated ad hoc inside a component or a thunk body instead of
  injected via the thunk `extra` argument configured in `configureStore`.
  (UZF-16, RC-6)
- A reducer or a Selector importing a `Service` directly. Only Producers
  receive services (through `extra`); reducers and selectors never see the
  world. (UZF-13, UZF-16, RC-6)
- A new `…Service` (including an RTK Query API slice) without a
  `stubbed…Service` companion **and** a fixture JSON backing it. (UZF-16, RC-33)
- RTK Query auto-generated hooks (`useGetXQuery`, `useCreateYMutation`) called
  directly inside a Page or Fragment on either render target. Expose a Producer
  thunk that delegates to the RTK Query endpoint under the hood instead.
  (UZF-16, RC-16)
- A Page importing anything from `packages/core/services`. Only Producers
  talk to services. (UZF-13, UZF-16, RC-6)
- Navigation invoked directly from a component (`router.push(...)`,
  `router.navigate(...)`) instead of from a Producer that treats the router as
  a Service. (UZF-16, RC-17)

## Data layer

- Wire-format `…Response` types, raw fetch/axios payloads, or a platform error
  object stored in `State`. Map to a domain type via a Mapper before the
  reducer ever sees it. (UZF-8, UZF-17, RC-24)
- `string` or `Error` used anywhere in `State` (or in a thunk's rejected value)
  to represent a user-facing problem instead of a discriminated `…Exception`
  union. (UZF-8, RC-8)
- Two or more parallel optional fields representing one lifecycle
  (`isLoading` + `error` + `data` as independent optionals) instead of one
  `Status` union (`{ kind: 'loading' } | { kind: 'loaded'; data } | { kind:
  'failed'; exception }`). (UZF-9, RC-24)

## Models & mocks

- Domain models with fewer than 7 `mock` variations in `__mocks__/*.mocks.ts`.
  (UZF-18, RC-13)
- A Page or test constructing `State` inline instead of via the feature's mocks
  file. (UZF-18, RC-31)

## Testing

- A test name that doesn't describe a real scenario (`test_state`, `it('works')`).
  (UZF-20, RC-34)
- Fewer than 3 Storybook stories for a Page/Fragment, or stories that don't
  mirror the same states as the snapshot tests. (UZF-18, RC-11)
- Live `fetch`/`axios` calls (or a live RTK Query base query) reaching the
  network from a Vitest/Jest test instead of the `stubbed…Service`. (UZF-16,
  RC-35)

## Commit messages

- `Co-Authored-By: Claude …`, `Co-Authored-By: GPT …`, `Co-Authored-By: Gemini …`,
  `Co-Authored-By: Copilot …`, or any `Co-Authored-By:` trailer crediting an LLM
  model. Commits are clean Conventional Commits attributed to the human author
  only. (bankai `_conventions.md`)
- Multi-page commit bodies with exhaustive bullet lists rehashing what the diff
  already shows. Subject ≤ 72 chars; the body (when present) is one or two
  short paragraphs explaining the *why*. (bankai `_conventions.md`)
