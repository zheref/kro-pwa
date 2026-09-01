# Architecture — Web lane (Next.js 15 App Router)

> How the UZF law is realized on the web. The law itself is the generated mirror at
> [`.claude/rules/00-uzf-core.md`](../../.claude/rules/00-uzf-core.md) (`UZF-{n}`) and
> [`.claude/rules/react-uzf-v1/`](../../.claude/rules/react-uzf-v1/) (`RC-1`…`RC-63`) — canon,
> pinned to `bankai-core@v0.11.2`, never restated here. This file records only what is
> **true of this repo**: which of those rules are already realized in code, where, and by
> which enforcement. Where the repo diverges from canon, this file says so and says why.
>
> **The whole solution is this one lane.** Stack Matrix Scenario 5 (Web Only) — there is no
> second render target, so every "both render targets" sentence in the canon collapses to one
> here. See § 7.

---

## 1. Store flavor & event names

**Flavor.** Redux Toolkit `configureStore`, built exactly once by a factory:

- `makeStore(extra: ThunkExtra = liveThunkExtra)` in `packages/app/src/library/store.ts` is the
  **only** call site of `configureStore` in the repo (`RC-22`). Production calls
  `makeStore()`; a test or story calls `makeStore(stubbedThunkExtra)` and gets deterministic
  doubles through the identical reducer map and middleware chain (`RC-35`).
- There is no module-level `export const store`. A singleton could only ever be wired to the
  live services, which is how a suite ends up talking to the network.
- `ThunkExtra` is the single closed service manifest (`RC-21`). Registering a feature is one
  line in the `reducer` map plus one field on `ThunkExtra`; there is no second injection
  mechanism, no service locator, no ambient singleton import (`RC-6`, `RC-23`).
- `serializableCheck` is widened to accept `Date` and nothing else: `State` carries domain
  types, so a `Date` there is correct and a wire string would be the bug (`RC-24`, `UZF-8`).
- `useAppSelector` / `useAppDispatch` in `packages/app/src/library/hooks.ts` (built with
  `react-redux@9`'s `.withTypes<…>()`) are the only Redux↔React binding surface (`RC-10`).
- `StoreProvider` in `packages/app/src/library/StoreProvider.tsx` takes a store **instance**;
  it never builds one. `apps/web`'s composition root decides when to call `makeStore(...)`.

**Event names encode intent, never mechanism (`RC-2`).** Reducer keys are `on…` (lifecycle),
`userDid…` (user intent) or `child…Delegated…` (a child talking back). The demo feature's real
names: `onViewLoaded`, `userDidTapRetry`, `userDidTapGreeting`, `childDetailDelegatedClose`.

An effect is **not** an event. A Producer thunk's *type string* is the event name, and its
three lifecycle actions are the one completion event (`UZF-3`, `RC-25`):

```ts
createAsyncThunk<Result<Greeting, GreetingException>, { recipient: string }, { extra: ThunkExtra }>(
  'greeting/onGreetingFetchCompleted',   // an event name — never 'greeting/fetchGreeting'
  async ({ recipient }, { extra, signal }) => { … },
)
```

Exported thunk factories carry the `…Thunk` suffix — `fetchGreetingThunk` (`RC-58`).

---

## 2. Module & file layout

Three workspace members (`pnpm-workspace.yaml`: `apps/*`, `packages/*`), wired by `workspace:*`
only — never a relative `../../packages/core/src/...` reach-through (`RC-49`).

```
packages/core/       @kro/core   — platform-free domain tier
  src/library/       result.ts · exception.ts · assertNever.ts        (RC-7, RC-8, RC-9)
  src/models/        Greeting · GreetingResponse · GreetingException · GreetingMapper
  src/models/__mocks__/  ≥7 mock variants per model                   (RC-13)
  src/model/Session/ SessionConfig · SessionFragment · SessionTypes
  src/utils/         durations · numberEnhancements

packages/app/        @kro/app    — shared UZF state + feature tier
  src/library/       store.ts (makeStore · ThunkExtra) · hooks.ts · StoreProvider.tsx
  src/services/      <X>Service interface + live<X>Service / stubbed<X>Service + fixtures
  src/features/<f>/  <F>Feature.ts · <F>Shifters.ts · <F>Selectors.ts · <F>Producer.ts
                     <F>Mocks.ts · use<F>.ts · __tests__/

apps/web/            @kro/web    — the Next.js 15 App Router shell
  src/app/           routes, layout, manifest, API route handlers
  src/progressive/   service-worker registration, push subscriptions, actions
```

`apps/web` owns **no** presentation any more. `src/components/ui/` held 56 vendored Chakra
snippets serving the pre-parity routes; the design system (#6) replaced them in
`packages/app/src/design/`, and #79 deleted them with the `(legacy)` group that was their last
importer. A component belongs in `packages/app`, never here.

Dependencies point one way: `apps/web` → `@kro/app` → `@kro/core`. Nothing points back.

**Enforced, not merely stated:**

| Boundary | Enforcement | Rules |
|---|---|---|
| `@kro/core` imports no react/next/DOM/Node | `scripts/check-platform-free.mjs` (its `lint` task) + `lib: ["ES2022"]`, `types: []` | `RC-50` |
| `configureStore` only in `library/store.ts` | `packages/app/scripts/check-uzf-boundaries.mjs` | `RC-22` |
| `react-redux` only in `hooks.ts` / `StoreProvider.tsx` | same | `RC-10` |
| A Service module imported only by `store.ts` + tests | same | `RC-6`, `RC-21` |
| `fetch(` only under `src/services/**` | same | `RC-3` |
| `createSlice` / `createAsyncThunk` / `createSelector` only in `…Feature.ts` / `…Producer.ts` / `…Selectors.ts` | same | `RC-1`, `RC-3`, `RC-5` |
| `@kro/app` imports no `next/*` | same | `RC-40` |

Both scripts run as their package's `lint` task, so `make lint` (and therefore `pr.yml`) fails
on a violation. That is what makes "components cannot fetch" a structural fact.

> **Citation note.** The last row is `RC-40` — *"the shared Page never imports a Next.js API"* —
> because the rule governs `packages/app`, the shared render layer. `RC-50` is the neighbouring
> rule that `packages/core` carries **zero** platform imports (the first row), which is why the
> two are easy to confuse. `check-uzf-boundaries.mjs` printed `RC-50` in that one violation
> message until KC-IS-#71 item 5; both the header comment and the message say `RC-40` now.

**Divergence from `RC-50`, recorded.** The canon puts the whole `library/` runtime — including
`store.ts` and `hooks.ts` — inside `{{CORE_PACKAGE}}`. Here `result.ts` / `exception.ts` /
`assertNever.ts` live in `packages/core/src/library`, but `store.ts`, `hooks.ts` and
`StoreProvider.tsx` live in `packages/app/src/library`, because they import `react-redux` and
would breach `@kro/core`'s platform-free contract. Ruled that way in the delivery PR for #5;
`packages/core/src/index.ts` carries the same note.

---

## 3. Building-block realization

| UZF building block | Realized here as | File shape | Rules |
|---|---|---|---|
| Feature / Interactor | `createSlice({ name })`, one per feature, registered once in the store's `reducer` map | `<F>Feature.ts` | `RC-1`, `RC-23`, `RC-32` |
| State | `interface <F>State`, domain types only, lifecycle as ONE discriminated field (`load: {kind:'idle'\|'loading'\|'loaded'\|'failed'}`) — never `isLoading` + `exception` in parallel | co-located in `<F>Feature.ts` | `RC-24`, `UZF-9` |
| Event | slice reducer keys (`onViewLoaded`, `userDidTap…`, `child…Delegated…`) and thunk type strings | — | `RC-2`, `RC-36` |
| Reducer | `reducers` (sync events) and `extraReducers` (thunk lifecycle) — separate surfaces that never mix | `<F>Feature.ts` | `RC-36`, `RC-26` |
| Shifter | pure `with…(state, args) => State` returning a brand-new object; applied as `Object.assign(state, withThing(state, args))`. Only a single primitive assignment may be inlined | `<F>Shifters.ts` | `RC-4`, `RC-19` |
| Selector | `createSelector` over `RootState`; a `useAppSelector` callback may do an O(1) field read and nothing more | `<F>Selectors.ts` | `RC-5`, `RC-20` |
| Producer | `createAsyncThunk` factory; takes narrow inputs, reads services from `extra`, passes `thunkAPI.signal` to the Service, **never throws** | `<F>Producer.ts` | `RC-3`, `RC-6`, `RC-25` |
| Effect | the promise `createAsyncThunk` builds, resolving `Result<T, <F>Exception>` | — | `RC-7`, `RC-25` |
| Result | `Result<T,E> = {ok:true,value} \| {ok:false,error}` with `ok()` / `err()` / `isOk` / `isErr` | `@kro/core` `library/result.ts` | `RC-7` |
| Exception | `Exception<Kind> = {kind, message, recoverable}` in a closed union + an `<X>Exceptions` factory; user copy derived per `kind`, never read from `message` | `models/<X>Exception.ts` | `RC-8`, `RC-9` |
| Service | `interface <X>Service` + `live<X>Service` / `stubbed<X>Service` pair + a backing fixture; returns the **wire** shape and may throw — the `Result` boundary is the Producer's | `services/<x>/<X>Service.ts` | `RC-33`, `RC-59` |
| Mapper | plain object of pure functions `toDomain` / `fromDomain` / `toException` — the only wire↔domain↔exception conversion site | `models/<X>Mapper.ts` | `RC-30` |
| Model / Response | domain types only, one per file / wire format mirrored exactly, never imported outside Service→Producer→Mapper | `models/` | `RC-28`, `RC-29` |
| Stateful wrapper | headless `use<F>()` hook — dispatches intent, reads through named Selectors, returns a view model + callbacks, holds **no** `useState` | `use<F>.ts` | `UZF-4`, `RC-10` |
| Page (stateful container) | the only artifact calling `useAppSelector`/`useAppDispatch` for a feature; owns no markup beyond its single Fragment call | `<F>Page.tsx` | `RC-37`, `RC-61` |
| Fragment (passive) | may `useAppSelector`, never dispatches a thunk; intent arrives via callback props | `<F>Fragment.tsx` | `RC-15`, `RC-61` |
| Component (domain-less) | reusable, imports nothing from `react-redux`, a slice or a Producer | `design/` | `RC-14` |
| Route entry | `apps/web/src/app/**/page.tsx` — a passive Server Component: param resolution + optional prefetch, no hook, no dispatch; a `…PageClient.tsx` wrapper ≤10 lines forwards props | `apps/web` | `RC-38`, `RC-39`, `RC-62` |
| Composition root | `app/layout.tsx` passive; one client `providers.tsx` wires Store + Theme + Navigation and is the one place `makeStore(...)` is called | `apps/web` | `RC-41` |
| Navigation | a `NavigationService` behind `ThunkExtra`; `router.navigate(...)` is invoked from a Producer, never a component | `RC-17`, `RC-63` |

**Realized today:** every row. Feature down to Stateful wrapper by the `greeting` scaffolding
feature (`packages/app/src/features/greeting/`) — the reference a feature child copies; Component
by the design system (#6); and Page / Fragment / route entry / composition root /
`NavigationService` by the shell (#13), whose `packages/app/src/features/main/` is the reference
for the render tier. A feature child replaces a destination's body in `packages/app` and does not
touch `apps/web` at all.

---

## 4. One-shot UI effects

A one-shot (a toast, a navigation, a haptic, a sound) is **never** a boolean left in `State` for
a view to notice and reset. Two sanctioned routes, both dispatched:

1. **Navigation** — a Producer calls the injected `NavigationService`. Components never
   navigate (`RC-17`). The Next.js `useRouter`/`redirect` APIs stay inside `apps/web`; the
   shared tier is framework-blind (`RC-40`, `RC-50`).
2. **Everything else** — a Service behind `ThunkExtra` invoked from a Producer (`RC-3`,
   `RC-6`): sounds, notifications, wake lock and clipboard are Services, not view code.
   `00-architecture-overview.md` states this directly: one-shot view concerns are Service-tier
   calls made *from* a Producer.

Where a one-shot must survive into render (an undo toast with a deadline, the ~8 s capture
Undo in the parity canon), it is modelled as **state with an explicit expiry in the domain**
and cleared by a named event — never by a view side effect.

SSR-prefetched data enters a slice only through a dedicated `on…Hydrated` event, never
bypassing the Shifter (`RC-42`). Server Actions and route handlers are Producers: they call
Services and return a `Result` (`RC-43`).

**Cancellation is the one silent exit** (`UZF-14`). `use<F>()` returns `() => effect.abort()`
from its mount effect; the `.rejected` arm returns early on `action.meta.aborted` so a
superseded request never paints an exception.

---

## 5. Codegen inputs

**There is no codegen in this repo today, and `make codegen` says so rather than pretending.**
The Scenario 5 template assumes a TypeSpec contract and Style Dictionary tokens; neither is
wired here, and no dependency for either is installed.

| Would-be generator | Status | Wired by |
|---|---|---|
| API types (TypeSpec → `packages/api`) | **Not wired, and not planned in this shape.** Kro's backend is Kro Cloud (Supabase), whose schema is owned by `zheref/KroApple`; this repo is a client. Types come from the Supabase client + a Mapper at the boundary (`RC-29`, `RC-30`). See `spec/05-api-contract.md`. | #31 (auth & cloud sync) |
| Design tokens (Style Dictionary → CSS vars) | **Not wired.** `make tokens` is a documented no-op. KroTokens/KroGlass land as authored CSS custom properties + a Tailwind v4 theme. See `spec/06-design-tokens.md`. | #6 (design system) |
| The canon mirror (`.claude/rules/`) | **Wired.** `bankai-core@v0.11.2` + `.claude/canon-values.yml` → `sync_canon`. Generated, drift-checked, never hand-edited (`CON-13`). | this issue (#4) |

So: the only generated tree in the repo is `.claude/rules/`. Anything else described as
"generated" would be a claim this repo cannot currently back.

---

## 6. Tests & minimums

**Toolbox** — Vitest + `@testing-library/react` in all three members; Playwright for E2E;
Storybook + its test-runner as the `UZF-26` visual-evidence carrier (`RC-53`, `RC-11`). No
device snapshot runner: this is a headless web stack.

**Per-artifact minimums (`RC-12`, `RC-54`…`RC-57`, `UZF-18`):**

| Artifact | Minimum |
|---|---|
| Reducer action (sync `reducers` case) | ≥3 cases — typical / boundary / no-op — called directly against the slice reducer |
| Reducer arm for a thunk lifecycle | ≥3 cases — happy / failure / edge — driven through the real thunk against a stubbed Service |
| Selector | ≥3 cases — typical / edge / empty — against a hand-built root-state slice, never a real store |
| Shifter | ≥3 cases — typical / boundary / no-op — pure: no store, dispatch, timers or I/O |
| Producer | ≥3 cases using the `stubbed…Service` injected via `extra` — never a mocked `fetch` |
| Mapper | ≥3 cases each for `toDomain` / `fromDomain` / `toException` |
| Page / Fragment | ≥3 Storybook stories **and** ≥3 mirroring RTL render tests, both consuming the same `<F>Mocks` |
| Route handler / Server Action | ≥3 cases asserting on the returned `Result` |
| Domain model | ≥7 mock variants in `__mocks__/<Model>.mocks.ts` |
| Server Page / Client Wrapper | **exempt** — passive shells (`RC-57`); coverage lives in the shared Page |

**Floor:** ≥80% line coverage on every touched file (`UZF-19`); name exemptions in the PR.

**Never:** a test that reaches the live network (`RC-35`), a `State` constructed inline instead
of from `<F>Mocks.ts` (`RC-31`), or a test named `it('works')` — names describe a real scenario
(`RC-34`).

**Local half of the same gate.** `lefthook` runs Biome + `tsc --noEmit` + `.bankai/hooks/guard.sh`
pre-commit, commitlint on the message, and `turbo run test` pre-push. The guard refuses a new
source file under `apps/web/src/**` or `packages/*/src/**` that arrives without a test, an
unjustified suppression, or a hardcoded credential. `--no-verify` is never acceptable (`SEC-14`).

---

## 7. Scenario-5 divergences from `react-uzf-v1` canon

The canon describes one stack family with **two** render targets. This repo is Scenario 5 —
Web Only. Each divergence below is deliberate, and each is bound in `.claude/canon-values.yml`
so the generated mirror reads truthfully rather than describing a repo that does not exist.

| Canon | Here | Why |
|---|---|---|
| `RC-49` — exactly four workspace members incl. `apps/mobile` | Three: `packages/core`, `packages/app`, `apps/web`. `{{MOBILE_APP}}` binds to `apps/mobile (absent, this repo is web-only)` | Scenario 5 has no native target. **Open handbook question [BC-IS-#900](https://github.com/zheref/bankai-core/issues/900)** — does `RC-49` bind a web-only repo? Until it is ruled, this repo assumes three. |
| `RC-51` — `{{APP_PACKAGE}}` is the shared Tamagui + Solito render layer | `packages/app` is the shared **state + feature** tier; no Tamagui, no Solito | With one render target there is nothing to abstract across. The locked Scenario 5 stack is Next.js + Tailwind v4 + shadcn/ui. |
| `RC-50` — the whole `library/` runtime lives in `{{CORE_PACKAGE}}` | `store.ts` / `hooks.ts` / `StoreProvider.tsx` live in `packages/app` | They import `react-redux`; `@kro/core` is machine-enforced platform-free. See § 2. |
| `RC-53` — Storybook 8 | Storybook 10 | Storybook 8 cannot run on Next 15.3 (upstream-fixed in 9.x). Filed as **[BC-IS-#905](https://github.com/zheref/bankai-core/issues/905)**. |
| `RC-44`/`RC-45` — Expo Router route files, `app/_layout.tsx` | N/A | No native target. |
| `{{CI_TEST_WORKFLOW}}` = `test.yml` | `.github/workflows/pr.yml` | One workflow carries lint + typecheck + test + build here. |

`RC-26` vs `RC-3` (does a cancelled thunk's `.rejected` reach the exception Shifter?) is a
further open question — **[BC-IS-#904](https://github.com/zheref/bankai-core/issues/904)**. This
repo's answer today, pending the ruling: it does **not** — `action.meta.aborted` returns early.

---

## 8. Project specifics

- **Route map:** one group under one passive root layout, and a route group changes no URL.
  `(shell)` is the parity set — `/my-day` · `/tasks` · `/inbox` · `/matrix` · `/plan` ·
  `/habits` · `/execute` · `/board` · `/earn` · `/blueprints` · `/adjust` · `/tweak` ·
  `/search` · `/lists/[listId]` — each a passive `page.tsx` over one shared ≤10-line client
  wrapper, wrapped by `providers.tsx` and the shell. Beside it sit three **redirects**, directly
  under the root layout because they render nothing and so need no providers: `/` → `/my-day`
  (307 — the landing destination is a product call that can change, and `/` is the installed
  app's `start_url`), `/settings` → `/adjust`, `/integrations` → `/adjust` (calendar-connect is
  a pane inside the Settings hub, not a destination). The second group, `(legacy)`, held those
  three plus `/session` and the Chakra provider tree; #22 retired `/session` and #79 retired the
  group, the tree, the 56 vendored Chakra components and the Chakra/emotion/react-icons
  dependencies with it. Route files are the shell child's (#13) exclusively; a feature child
  replaces a destination's Page in `packages/app` instead. The macOS names are what keep the
  parity set unambiguous without a prefix: canon calls the session destination "Execute" and the
  settings one "Adjust".
- **Offline shell:** `public/sw.js` precaches the landing **document** (`/my-day`), never `/`.
  `cache.add('/')` follows the redirect and stores a redirected response; per Fetch, answering a
  navigation (redirect mode `manual`) with a response whose URL list has more than one entry is
  a network error, so precaching `/` would break the offline cold start rather than serve it.
- **Responsive contract:** web mobile mirrors iPhone (flat tab bar), web desktop mirrors macOS
  (sidebar shell, popover-first). The binding decision table is KroApple's
  `KroUI/Do/DoSurfaceLayout.swift` idiom×width matrix, ported by #13 as
  `packages/app/src/features/main/DoSurfaceLayout.ts` — all three idioms, both widths, with a
  resolver mapping pointer + viewport onto them and `shellShapeFor` collapsing the result to the
  web's two shells.
- **Shared cross-feature state:** none yet. When it appears it composes through root-level
  Selectors, never by one slice importing another's shape (`RC-20`).
