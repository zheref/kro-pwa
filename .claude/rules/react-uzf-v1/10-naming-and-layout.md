<!-- GENERATED from bankai-core@v0.11.2/handbooks/stacks/react-uzf-v1/rules/10-naming-and-layout.md — DO NOT EDIT; change the handbook and re-run sync-canon. -->
<!-- Canonical source in bankai-core; product repos carry a generated mirror (CON-13). -->

# 10 — Naming and Layout

The file-suffix taxonomy, monorepo tree, and case-prefix conventions that make a
React + Redux Toolkit UZF codebase greppable and predictable across **both**
render targets. This is the `react-uzf-v1` twin of the Compose/SwiftUI
`10-naming-and-layout` files; the cross-platform concepts it refines live in
[`../../../uzf-core.md`](../../../uzf-core.md) (`UZF-{n}`). The `RC-{n}` numbers
below are the canonical registry anchored on `00-architecture-overview.md` and
indexed in full in [`README.md`](README.md) (Phase C-1b harmonization pass of
`#34`) — this file mints no numbers of its own. A stack rule may tighten a
`UZF-{n}` rule but never contradict it.

## Repo-specific placeholders

- `kro` — the product name (workspace root name, the `configureStore`
  display name in devtools).
- `packages/core` — the shared RTK state-logic package (`packages/core`
  or similar) vending slices, selectors, shifters, producers, services,
  mappers, and models to **both** render targets.
- `apps/web` — the Next.js 15 App Router app directory.
- `apps/mobile (absent, this repo is web-only)` — the Expo Router app directory (RN 0.84, New Arch + Hermes).
- `packages/app` — the shared cross-render-target render-layer **folder**
  (workspace member) holding Page/Fragment/Adapter/Component bodies built from
  Tamagui + Solito (canonical per `08-monorepo-and-sharing.md`'s `RC-51`; see
  `placeholders.md`'s token-reconciliation note — the npm-scope-alias reading
  this bullet previously gave was the contested, non-canonical one).
- `docs/Features` — the feature-spec root (`UZF-21`), e.g. `docs/Features`.
- `.github/workflows/pr.yml` — the CI workflow running Vitest/Jest + Storybook.
- `featureFlags.ts` — the platform feature-flag registry (`UZF-22`).

(Domain-flavored names in examples — `Profile`, `Suggestion`, `Endeavor` — are
illustrative, not repo config. `Redux Toolkit`, `RTK Query`, `Tamagui`,
`Solito`, `reselect` name the stack's fixed toolchain, not a product value.)

---

## Top-level monorepo layout

**RC-49 — The RTK state-logic quartet is shared; only the render layer splits by
platform.** (This is the same workspace-topology rule `08-monorepo-and-sharing.md`
states as "exactly four workspace members"; see also `RC-50` for
`packages/core`'s own ownership contract.) Unlike a single-render-target stack (Compose/SwiftUI), a React
feature's Feature/Selectors/Shifters/Producer live **once**, in
`packages/core`, consumed identically by Next.js and Expo. `UZF-6`
("co-locate a feature's artifacts") is satisfied at the *feature-name* level —
the same feature folder name appears once in `packages/core` and is mirrored
by a thin, platform-specific render entry in each app — not by all artifacts
sharing one physical folder. Cross-slice imports remain forbidden; a feature in
one app never reaches into another feature's folder in `packages/core`.

```
<root>/
    packages/
        packages/core/
            src/
                features/<feature>/       # one folder per feature (singular) — see below
                library/                  # store.ts, hooks.ts, result.ts, assertNever.ts
                services/<x>/             # external-system wrappers (Live/Stubbed) + fixtures
                models/                   # domain models + __mocks__ + mappers + exceptions
                utility/
    apps/
        apps/web/                      # Next.js 15 App Router
            app/<route>/
                <Feature>Page.tsx         # web render entry — imports the shared feature
        apps/mobile (absent, this repo is web-only)/                   # Expo Router
            app/<route>/
                <Feature>Page.tsx         # native render entry — imports the shared feature
```

> A repo that adopts Tamagui (cross-UI) + Solito (cross-nav) shares the
> `Page`/`Fragment`/`Adapter`/`Component` bodies themselves in `packages/app`
> (`packages/app/features/<feature>/`, per `08-monorepo-and-sharing.md`'s
> `RC-51`), leaving each app's route file a one-line Solito re-export. This is
> already one of the stack's exactly-four workspace members (`RC-49`) — it is
> **not** a fifth, optional package; the only thing left genuinely optional is
> *how much* of the render layer a given feature chooses to share this way vs.
> writing a thin platform-specific entry per target.

## Per-feature layout (canonical, inside `packages/core`)

```
features/<feature>/
    <Feature>Feature.ts        # createSlice → exports `<feature>Slice`          UZF-1
    <Feature>Selectors.ts      # createSelector projections                      UZF-11
    <Feature>Shifters.ts       # pure with…/as… state builders                   UZF-10
    <Feature>Producer.ts       # createAsyncThunk factories (…Thunk)             UZF-3/14/15
```

The folder name is the feature name **without** any suffix and always
**singular**: `features/userProfile/`, never `features/userProfiles/` and
never `features/userProfilePage/`.

Platform render artifacts (`Page`, `Fragment`, `Adapter`) are **not** listed
above — they live in `packages/app` (see `RC-49`, `RC-51`), never
inside `packages/core/src/features/`. `packages/core` has no UI-framework
import (`react`/`react-native`/`next` excluded); it is testable headlessly.

## Type and file suffixes (greppable)

Every suffix is load-bearing — it lets a human or an ESLint/Konsist-style rule
locate an artifact by name alone.

| Concept | Suffix | Example | Canon |
| --- | --- | --- | --- |
| Feature slice (module) | `Feature.ts`, exports `<feature>Slice` | `UserProfileFeature.ts` → `userProfileSlice` | `UZF-1`, `RC-1` |
| Page (platform render entry) | `Page.tsx` | `UserProfilePage.tsx` | `UZF-4`, `RC-37` |
| Fragment (child render, selector-only) | `Fragment.tsx` | `EditProfileFragment.tsx` | `UZF-4`/`UZF-5`, `RC-15` |
| Adapter (memoized list-cell) | `Adapter.tsx` (a file batching several may be `Adapters.tsx`) | `ProfileRowAdapter.tsx` | `UZF-5`, `RC-18` |
| Selectors file | `Selectors.ts` | `UserProfileSelectors.ts` | `UZF-11`, `RC-5` |
| Shifters file | `Shifters.ts` | `UserProfileShifters.ts` | `UZF-10`, `RC-4` |
| Producer file | `Producer.ts` | `UserProfileProducer.ts` | `UZF-3`/`UZF-14`/`UZF-15`, `RC-58` |
| Service (interface) | `Service.ts` | `ProfileService.ts` | `UZF-16`, `RC-59` |
| Live impl (export) | `live<X>Service` | `liveProfileService` | `UZF-16`, `RC-59` |
| Stubbed impl (export) | `stubbed<X>Service` | `stubbedProfileService` | `UZF-16`, `RC-59` |
| Fixture data | `<x>.fixtures.json` | `profile.fixtures.json` | `UZF-16`, `RC-59` |
| Model | plain name, no suffix | `Profile.ts` | `UZF-8` |
| Wire response type | `Response.ts` | `ProfileResponse.ts` | `UZF-8`/`UZF-17` |
| Mapper | `Mapper.ts`, exports `toDomain`/`fromDomain` | `ProfileMapper.ts` | `UZF-17`, `RC-30` |
| Exception | `Exception.ts` | `ProfileException.ts` | `UZF-3` |
| Domain-model mocks | `__mocks__/<Model>.mocks.ts` | `__mocks__/Profile.mocks.ts` | `UZF-18`, `RC-13` |
| Theme tokens | `Theme.ts` + `useAppTheme.ts` hook | `AppTheme.ts` | `UZF-4` |
| Store / typed hooks | `store.ts` / `hooks.ts` | `library/store.ts`, `library/hooks.ts` | `UZF-1` |
| Result helper | `result.ts` | `library/result.ts` | `UZF-3` |
| Exhaustiveness helper | `assertNever.ts` | `library/assertNever.ts` | `UZF-2`/`UZF-3` |
| Storybook stories | `.stories.tsx` (≥3 per Page) | `UserProfilePage.stories.tsx` | `UZF-18`/`UZF-26`, `RC-11` |
| Tests | `.test.ts` / `.test.tsx` | `UserProfileShifters.test.ts` | `UZF-18`/`UZF-20` |

## Event / reducer-key prefixes (`UZF-2`)

**RC-2 — Reducer keys and thunk type-strings name intent or signal, never
mechanism**, exactly per `UZF-2`:

- `userDid…` — user intent (`userDidPullToRefresh`, `userDidTapEdit`).
- `on…` — system / lifecycle signal (`onViewLoaded`).
- `child<X>Delegated…` — a child fragment talking back to its parent
  (`childEditFragmentDelegatedClose`).
- A `createAsyncThunk` **type string** is itself an event name, never a
  mechanism verb — `"userProfile/onProfileFetchCompleted"`, never
  `"userProfile/fetchProfile"` — because `.fulfilled` *is* the one completion
  event `UZF-3` names (`RC-58` covers the thunk factory's `…Thunk` suffix;
  this bullet covers the thunk's `type` string specifically).

`UZF-3`'s "one completion event carries a Result" maps onto RTK's own
`.pending`/`.fulfilled`/`.rejected` lifecycle as follows: **`.fulfilled` is the
completion event** — its payload is always `Result<Success, …Exception>`
(Hard rule: thunks return `Result`, they do not throw). **`.rejected` is a
defensive-only fallback** for a genuine unexpected throw escaping the payload
creator, never the normal error path — naming a case after the thunk's
mechanism (`fetchProfilePending`) instead of the outcome is forbidden.

## Shifter naming (`UZF-10`)

**RC-4 — `with…` / `as…`**, one concern each, living in `<Feature>Shifters.ts`,
applied inside a `createSlice` reducer arm via `Object.assign(state,
with…(state, args))` (Immer-draft "Form B" — the only allowed mutation
pattern besides a single primitive assignment). A Shifter reads no clock,
randomness, environment, or service — inputs are passed in.

- `with…` — the typical case (`withLoadingStarted`, `withProfileLoaded`,
  `withException`, `withExceptionCleared`).
- `as…` — a type-level / identity re-shape transform.

## Selector naming (`UZF-11`)

**RC-5 — `select…`**, top-level functions in `<Feature>Selectors.ts` built with
RTK's `createSelector`, consumed only via `useAppSelector(select…)` — never
selector logic inline inside a `useAppSelector` arrow function. A boolean
selector reads as a statement: `selectShouldShowEmptyState`.

## Producer / thunk naming (`UZF-3`/`UZF-14`/`UZF-15`)

**RC-58 — Exported thunk factories carry the `…Thunk` suffix** (`fetchProfileThunk`,
not `fetchProfile`) so a call site (`dispatch(fetchProfileThunk({ profileId }))`)
is unambiguous about invoking an effect rather than a plain function. Unlike a
Producer whose reducer calls it inline, a React/RTK Producer's thunk is
**dispatched directly from the View** (Page or Fragment via a callback prop) —
components never call `fetch`/a Service directly, only `dispatch(...Thunk(...))`.
Producer *methods* (for hand-rolled, non-`createAsyncThunk` producers used for
fine-grained progress/`AbortController` cases) stay plain verbs on the
producer module, mirroring the thunk-factory naming, not a `produce…` prefix.

## Service naming (`UZF-16`/`UZF-17`)

**RC-59 — `<X>Service` interface + `live<X>Service` + `stubbed<X>Service`
exports**, lower-camel-case (not PascalCase classes) because services are
plain object literals conforming to the interface, injected via the thunk
`extra` argument — never imported directly by a reducer or a Page. A stubbed
service reads from a co-located `<x>.fixtures.json`, never hits the network.
RTK Query endpoints are `Service`-tier under this same naming; their
auto-generated hooks are forbidden inside Pages (`UZF-16` §2) — expose a
`…Thunk` Producer that delegates to the RTK Query endpoint under the hood.

## Mapper naming (`UZF-17`)

**RC-30 — `<X>Mapper` object exporting `toDomain` (required) and `fromDomain`
(when the direction is used)**, returning `null` on malformed input so the
Producer surfaces a typed `…Exception` rather than throwing. Mappers live in
`models/`, not inside a feature folder, unless the mapping is genuinely
feature-local.

## Mocks and Storybook fixtures (`UZF-18`/`UZF-26`)

**RC-13 — Domain-model mocks live in `__mocks__/<Model>.mocks.ts`** (excluded
from the production bundle), one file per model, ≥7 named variants covering
happy, empty, long, non-ASCII, missing-optional-field, and edge cases.

**RC-31 — a per-feature `<Feature>Mocks.ts` backs every Storybook story and
reducer/selector test with canned `State` variants**, built once against the
slice's own `getInitialState()` and composed from the domain `__mocks__`
fixtures (`profileMocks.typical`, `ProfileExceptions.offline()`, …) — see
`07-models-mocks-mappers.md`'s "State mocks" section for the full contract and
worked example. **`State` (or a `preloadedState` fragment) is never constructed
inline** in a story or a test, even for a one-off scenario — add a named
variant to `<Feature>Mocks` instead. (An earlier draft of this file described
this stack as having no `<Feature>Mocks.ts` file and constructing `State`
inline in stories; that was a drafting error, contradicted by `07`, `09`, `11`,
and `12` alike, and is corrected here.) Every Page ships ≥3 stories mirroring
the snapshot-test set (loaded / loading / exception, at minimum) — never fewer.

## Forbidden

- Naming a slice module `<Name>Slice.ts` or a reducer file `<Name>Reducer.ts` —
  the file is always `<Name>Feature.ts`; `<name>Slice` is the *export*, not
  the filename. (`RC-1`.)
- Putting Selectors, Shifters, or Producers in the same file as the slice —
  each has its own suffixed file. (`RC-4`/`RC-5`/`RC-58`.)
- Plural or verb-suffixed feature folders (`features/userProfiles/`,
  `features/userProfilePage/`). Always singular, bare. (`RC-1`.)
- A `Page`/`Fragment` importing anything from `services/` directly, or calling
  `fetch`/`axios` itself — only `dispatch(...Thunk(...))`. (`RC-58`.)
- A new `…Service` without both a `live…Service` and a `stubbed…Service` export
  plus a fixture JSON. (`RC-59`, `RC-33`.)
- A selector defined inline inside a component instead of `…Selectors.ts`.
  (`RC-5`.)
- Naming a reducer key or thunk type-string after its mechanism
  (`fetchProfile` as an event, `onFetchProfilePending` as a case) instead of
  intent/outcome. (`RC-2`.)
- Forking the Feature/Selectors/Shifters/Producer quartet per platform instead
  of sharing it once from `packages/core`. (`RC-49`.)
- Using the `connect()` HOC or raw `useSelector`/`useDispatch` instead of the
  typed `useAppSelector`/`useAppDispatch`.
- Cross-feature imports inside `packages/core/src/features/` — shared logic
  goes to `library/`, `models/`, or `services/`. (`UZF-6`.)
