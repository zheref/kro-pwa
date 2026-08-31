<!-- GENERATED from bankai-core@v0.11.2/handbooks/stacks/react-uzf-v1/rules/08-monorepo-and-sharing.md — DO NOT EDIT; change the handbook and re-run sync-canon. -->
<!-- Canonical source in bankai-core; product repos carry a generated mirror (CON-13). -->

# 08 — Monorepo & Sharing

## Repo-specific placeholders

- `kro` — the product name, used as the npm scope for every workspace package (`@kro/core`, `@kro/app`). Illustrative example: `Kro`.
- `packages/core` — the shared RTK state-logic package, e.g. `packages/core`. Holds every slice, Shifter, Selector, Producer, Service interface + `live…`/`stubbed…` pair, Mapper, and domain model — **emitted once**, consumed by both render targets.
- `packages/app` — the shared cross-platform render-layer package, e.g. `packages/app`. Holds the actual Page/Fragment JSX, built from Tamagui primitives and Solito navigation, consumed by both render targets.
- `apps/web` — the Next.js App Router workspace member, e.g. `apps/web`.
- `apps/mobile (absent, this repo is web-only)` — the Expo Router workspace member, e.g. `apps/mobile`.

(Package names in the tree below — `packages/core`, `packages/app`, `apps/web`, `apps/mobile` — and file names like `UserProfileFeature.ts` are **illustrative**, not repo config. `Turbo`, `pnpm`, `Solito`, `Tamagui` are stack/framework names and are never tokenized: this stack is **RTK + Solito + Tamagui**, so that trio is fixed the way TCA is fixed on the SwiftUI stack.)

---

React web (`apps/web`, Next.js 15 App Router) and React Native (`apps/mobile (absent, this repo is web-only)`, Expo SDK 55) are **two render targets of one stack family**, not two stacks. The monorepo layout is how this satisfies `UZF-6` (co-locate a feature's artifacts; cross-feature/cross-app shared logic goes to a core layer, never a sibling) when the "sibling" is an entire second runtime — a browser/Node bundle and a Hermes/New-Arch bundle that cannot share a single build output. This file introduces the React-family monorepo rules **RC-49** (workspace topology), **RC-50** (`packages/core` ownership), **RC-51** (`packages/app` — Solito + Tamagui), **RC-62** (apps are thin shells), **RC-48** (platform-bound Services), and **RC-52** (build graph).

## Workspace topology (RC-49)

```
kro/
  pnpm-workspace.yaml         # packages: ["apps/*", "packages/*"]
  turbo.json                  # build / lint / test / typecheck pipeline, dependsOn ["^build"]
  packages/
    core/                     # packages/core — @kro/core
    app/                      # packages/app  — @kro/app
  apps/
    web/                      # apps/web      — Next.js App Router
    mobile/                   # apps/mobile (absent, this repo is web-only)   — Expo Router
```

- Exactly **four** workspace members for this stack: `packages/core`, `packages/app`, `apps/web`, `apps/mobile (absent, this repo is web-only)`. A fifth "shared" package is a smell — it means one of the four above absorbed the wrong responsibility (see RC-50/RC-51 for what belongs where).
- Cross-package imports are **only** via the `workspace:*` protocol (`"@kro/core": "workspace:*"` in `packages/app`'s and each app's `package.json`) — never a relative `../../packages/core/src/...` reach-through, which bypasses the package's own build/typecheck boundary.
- `packages/app` depends on `packages/core`. Neither app depends on the other. `packages/core` depends on neither app nor on `packages/app` — the dependency graph is a strict DAG pointing away from the platform shells.

## `packages/core` — the shared state tier, emitted once (RC-50)

```
packages/core/src/
  library/                    # store.ts, hooks.ts, result.ts, assertNever.ts
  models/                     # domain models + Mappers (toDomain/fromDomain/toException)
  services/
    network/<Name>Service.ts  # interface + live…Service + stubbed…Service (per UZF-16/UZF-17)
  features/<Feature>/
    <Feature>Feature.ts       # the slice (Interactor)
    <Feature>Shifters.ts
    <Feature>Selectors.ts
    <Feature>Producer.ts
```

- `packages/core` is the **single** owner of every slice, Shifter, Selector, Producer, Service interface + doubles, Mapper, and domain model. This is `UZF-6`'s "core layer" made into a physical package boundary instead of just a folder convention, because here the "sibling" reaching into it is a whole second app, not just a neighboring feature.
- **Zero platform imports.** `packages/core` never imports `next/*`, `expo-*`, `react-native`, or `react-dom`. It may depend on `react` and `@reduxjs/toolkit` only. A network `Service`'s `live…Service` uses `fetch`, which is available unmodified in the browser, in Next.js's server runtime, and in Hermes — this is precisely what makes it safe to hoist into the shared package (contrast with Storage/System Services, RC-48).
- Every Feature folder here is otherwise identical to the React + RTK synthesis: one slice per feature, Shifters pure, Selectors built with `createSelector`, Producers built as `createAsyncThunk`s that inject Services through the thunk `extra` argument and never throw (`UZF-14`, `UZF-15`).
- `library/store.ts` exports a **factory**, not a built store: `configureAppStore(services: ThunkExtra)`. `packages/core` never constructs the final store itself — each app supplies its own platform Services at construction time (RC-48; this is the same "factory, not a singleton" principle as `RC-22`'s `makeStore`). This is what lets one package serve two runtimes without importing either runtime's native modules.

## `packages/app` — shared render layer: Solito + Tamagui (RC-51)

```
packages/app/src/
  features/<Feature>/
    <Feature>Page.tsx          # Tamagui-built renderer, imports state from packages/core
    <Feature>Page.stories.tsx
  fragments/<Fragment>/
  design/                      # Components — Tamagui primitives, domain-less (UZF-5)
  theme/                       # Tamagui theme tokens + useAppTheme()
```

- `UZF-4` requires a stateful-wrapper/pure-renderer split; on this stack the renderer half is what `packages/app` supplies, and it renders **identically on both targets** because it is built from Tamagui primitives (`YStack`, `XStack`, `Text`, `Image`, …) — which compile to `react-native-web` under `apps/web` and to Fabric-backed native views under `apps/mobile (absent, this repo is web-only)` — instead of raw DOM elements or bare `react-native` components.
- Navigation inside `packages/app` uses **Solito** (`useRouter`, `useParams`, `<Link>` from `solito/navigation` / `solito/link`) for the *declarative*, in-render navigation a Page or Fragment issues directly — this is what lets one `<Feature>Page.tsx` render and link correctly on both `apps/web` and `apps/mobile (absent, this repo is web-only)`. Solito is the app layer's implementation of the navigation boundary, not a replacement for it: `packages/core` never imports Solito (or `next/navigation`, or `expo-router`) — a core Producer that needs to navigate does so only through an injected `NavigationService` (Service-tier, per `RC-17`'s "router as a Service" and `RC-50`'s framework-blind core), exactly like any other external system behind a DI'd Service (`UZF-16`). The app layer supplies the **live** `NavigationService` binding — built on Solito so the same implementation serves both targets — registered into `configureStore`'s `extraArgument` at each target's composition root (`app/providers.tsx` / `app/_layout.tsx`, per `RC-63`). Solito (declarative, Page/Fragment call sites) and `NavigationService` (imperative, Producer call sites) are complementary halves of the same boundary, not alternatives.
- A `<Feature>Page.tsx` under `packages/app` imports its slice/Selectors/Producer from `packages/core` and its layout from Tamagui — it never imports `next/*` or `expo-router` directly, and it never falls back to a bare `<div>`/`<View>` tree once a Tamagui equivalent exists (a bare fallback silently forks the two render targets' visual output).
- Reusable, domain-less UI (`UZF-5`) lives under `design/` here, built from Tamagui, with no store access — this is the cross-platform twin of the Compose/SwiftUI stacks' Component layer.

## `apps/web` and `apps/mobile (absent, this repo is web-only)` are thin shells (RC-62)

```
apps/web/                                  apps/mobile/
  app/                                       app/
    layout.tsx        # passive Server         _layout.tsx   # Store + Theme +
    providers.tsx      # Store+Theme+Solito                   Solito root
    profile/[id]/
      page.tsx         # passive Server        profile/[id].tsx
      ProfilePageClient.tsx  # "use client"                  # route file, ≤10 lines,
                                                              # forwards params only
```

- Neither app owns a slice, Shifter, Selector, or Producer — those exist only in `packages/core`. Neither app owns a Page's JSX body — that exists only in `packages/app`. Each app keeps only what the platform *mandates*: for `apps/web`, the Server Page / Client Page Wrapper split and `app/providers.tsx` (per the Next.js synthesis); for `apps/mobile (absent, this repo is web-only)`, the Expo Router route file and `app/_layout.tsx` (per the Expo synthesis).
- Each app's root binding file (`app/providers.tsx` for `apps/web`, `app/_layout.tsx` for `apps/mobile (absent, this repo is web-only)`) is the one place per app allowed to call `configureAppStore(...)` with that platform's own Services (RC-48), wrap the Solito/Tamagui provider tree, and initialize the platform's theme source (`next-themes` vs. `useColorScheme()`).
- A route/page file that grows a reducer call, a `useState` holding feature state, or a hand-rolled UI tree instead of importing the `packages/app` Page is a boundary violation, not a convenience — the file has become a second, undeclared Page, and the two platforms' UIs will drift the next time only one of them is edited.

## Platform-bound Services stay behind one shared interface (RC-48)

(Same rule as `06-services-and-data.md`'s "Cross-platform Live implementations" section — that
file is the more specific home for the Service-shape mechanics; this section states the
monorepo-topology consequence.)

- Not every Service can live entirely inside `packages/core`. Storage/secrets (`expo-secure-store` + `expo-sqlite` on `apps/mobile (absent, this repo is web-only)` vs. browser storage on `apps/web`) and system integrations (`expo-linking`/`expo-sharing`/`expo-clipboard`, with no web equivalent) are genuinely platform-specific.
- The **interface** (`interface StorageService { … }`) is authored once in `packages/core`, exactly like any other `UZF-16` Service contract. The two `live…Service` **implementations** are authored beside the platform that owns the native module — `apps/mobile (absent, this repo is web-only)` supplies its `expo-secure-store`-backed implementation, `apps/web` supplies its browser-storage-backed one — and each app injects its own implementation into `configureAppStore(...)` at its own root binding file.
- This is `UZF-16`'s "segregation by feature, not by domain" tightened into segregation-by-platform for the shared-interface case: a web bundle must never pull in `expo-sqlite`, and a mobile bundle must never pull in a browser-only API, even though both call the same `StorageService` shape from `packages/core`.
- The `stubbed…Service` used in tests is platform-agnostic (plain in-memory), so it lives in `packages/core` alongside the interface — only the `live…` half splits by platform.

## Build graph: one core, checked against both targets every time (RC-52)

- `turbo.json`'s `build`/`typecheck`/`test` tasks declare `dependsOn: ["^build"]`, so a change to any file in `packages/core` or `packages/app` is rebuilt and typechecked against **both** `apps/web` and `apps/mobile (absent, this repo is web-only)` in the same `turbo run` — a Producer signature change that only one app currently exercises still fails typecheck project-wide before merge, not weeks later when the other app happens to touch that screen.
- `packages/core` and `packages/app` are built **once** per `turbo` invocation and cached — the workspace protocol guarantees both apps consume the exact same build output, not two independently-recompiled copies that could silently diverge.

## Forbidden

- **A slice, Shifter, Selector, or Producer duplicated (even byte-identical) inside `apps/web` or `apps/mobile (absent, this repo is web-only)`** instead of imported from `packages/core`. "Emitted once" is violated the moment a second copy exists — drift is not a risk, it is a certainty on the next edit to only one copy.
- **`packages/core` importing `next/*`, `expo-*`, `react-native`, or `react-dom`.** The moment it does, it is no longer safe to hoist into the shared package and one render target's build breaks.
- **A `packages/app` Page importing `next/navigation` or `expo-router` directly** instead of `solito/navigation` / `solito/link` — this re-forks the navigation boundary Solito exists to unify.
- **A platform-specific Service's `live…` implementation imported from `packages/core` or from the other app's bundle** (e.g. `apps/web` pulling in the `expo-secure-store`-backed `StorageService`).
- **Building a new screen directly inside `apps/web` or `apps/mobile (absent, this repo is web-only)` "for speed," bypassing `packages/app`.** This is the escape hatch that reintroduces exactly the per-platform UI duplication Tamagui and Solito exist to eliminate — a second, undeclared render tree per platform is a defect, not a shortcut.
