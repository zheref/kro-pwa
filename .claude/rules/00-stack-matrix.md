<!-- GENERATED from bankai-core@v0.11.2/handbooks/stack-matrix.md — DO NOT EDIT. Not CI drift-checked (shared file, outside the wired sync_canon job); re-run sync-canon or bankai-scf to refresh. -->
# Stack Matrix

The registry of supported **stack scenarios** and which handbooks govern each. A
review always loads the **general** handbooks (top level) **plus the one stack
folder** for the repo under review — the review workflow selects the folder from
the `bankai_scenario` input (see [`README.md`](README.md) → Resolution).

A scenario is a `(platform, ui-architecture, backend)` triple with a stable id.
New scenarios are added here (and get a `stacks/<id>/` folder) before work
targeting them begins.

Two namespaces meet in this file and are **not** the same:

- **Review stacks** (the *Supported scenarios* table) — the `bankai_scenario` ids
  the review pair keys on; each maps to exactly one `stacks/<id>/architecture.md`
  rule family (`SW-{n}` / `KT-{n}` / `RC-{n}` / `BC-{n}`). This is *which rules apply*.
- **Scaffold generation scenarios** (`SCENARIO_ID` `1…7`) — bankai-scaffold's
  target-based taxonomy for *what to generate*. Each generation scenario names the
  review stack(s) it emits. The full composition for all 7 lives **here** (canon);
  bankai-scaffold renders it (`#34` Phase C-3), it no longer holds its own copy.

---

## Supported scenarios (review stacks)

| Scenario id | Platform · UI · Language | Stack handbook (prefix) | Reference repo | scaffold `SCENARIO_ID` |
| --- | --- | --- | --- | --- |
| [`swiftui-tca-uzf-v2`](stacks/swiftui-tca-uzf-v2/) | iOS/macOS · SwiftUI+TCA · Swift 6 | `stacks/swiftui-tca-uzf-v2/architecture.md` (`SW-{n}`) | `zheref/KroApple` | `3` (cross-apple) |
| [`compose-uzf-v2`](stacks/compose-uzf-v2/) | Android · Compose+Hilt · Kotlin 2.1 | `stacks/compose-uzf-v2/architecture.md` (`KT-{n}`) | `zheref/KroAndroid` | `2B`/`6` (kotlin) |
| [`react-uzf-v1`](stacks/react-uzf-v1/) | Web + Mobile · React 19 + Redux Toolkit (Next.js / Expo) · TypeScript 5.5 | `stacks/react-uzf-v1/architecture.md` (`RC-{n}`) | — (no live reference repo yet) | `1`/`2A`/`5` (mobile-web / ts-desktop / web) |
| [`bankai-core`](stacks/bankai-core/) | Framework machinery · GitHub Actions/shell/Python · **self-review, no product code** | `stacks/bankai-core/architecture.md` (`BC-{n}`) | `zheref/bankai-core` | — (machinery, not generated) |

> **Self-review scenario (`bankai-core`).** Most scenarios are a `(platform, ui-architecture, backend)` triple describing a *product* stack. `bankai-core` is the exception: it is the **framework reviewing its own machinery** (reusable workflows, `bankai.yml` callers, guard scripts, scaffolder plumbing, dependency/toolchain upkeep) when bankai-core self-hosts the review pair. It generates **no** product code, and it is **not** the review target for spec/policy — `CONSTITUTION.md`, `handbooks/`, this matrix, `schemas/` content, and `agents/*/AGENT.md` stay Naruto-authored and human-merged at G4 (`CON-3`/`CON-7`), never wired to a builder. Only **machinery** is in scope, and only **Kisuke** builds it. See [`../docs/SETUP.md`](../docs/SETUP.md) Part G (Phase 5).

> **`react-uzf-v1` has no live reference repo yet.** Unlike swiftui/compose (reconciled from KroApple/KroAndroid), the React canon was authored from the UZF conception docs + scaffold scenarios + stack best practices (`#34` Phase C-1b). Its `{{TOKEN}}` examples are illustrative until a React product is first scaffolded and binds them. It is one review stack serving two render targets (Next.js web + Expo/RN mobile) over a shared Redux Toolkit core.

### Cross-cutting (apply alongside any client scenario)

| Concern | Governing handbook |
| --- | --- |
| UZF architecture (all stacks) | [`uzf-core.md`](uzf-core.md) (`UZF-{n}`) |
| Data security / privacy / compliance | [`security-baseline.md`](security-baseline.md) (`SEC-{n}`) |
| Versioning & release | [`release-policy.md`](release-policy.md) (`REL-{n}`) |
| Pre-release quality & performance | [`quality-baseline.md`](quality-baseline.md) (`QA-{n}`) |
| Supabase backend (single-owner shared schema) | Migration discipline `UZF-25` + RLS/authz `SEC-6`/`SEC-7`. The one live "Kro Cloud" schema has a **single owning repo** — interim the iOS repo (`zheref/KroApple`), moving to a dedicated backend repo (**KroBack**, `zheref/KroApple#208`). `supabase/migrations/` is canon **only** in that owner; other-platform apps are **clients** that reference the schema, never authoring a second copy (KroAndroid's vestigial partial mirror was removed in `zheref/KroAndroid#74`). |

## How resolution works

1. The product repo's `bankai.yml` passes `bankai_scenario: <id>` to bankai-core's
   reusable review workflows (default: `swiftui-tca-uzf-v2`).
2. The workflow checks out bankai-core and points each review agent at the
   **top-level** general handbooks **plus** `handbooks/stacks/<id>/`.
3. The agent therefore sees exactly one stack's `architecture.md` — so `SW-{n}`,
   `KT-{n}`, and `RC-{n}` never collide in a single review.
4. A repo whose stack has no scenario here is **out of scope for automated review**
   until a scenario + `stacks/<id>/` folder is added. A build request on an
   unlisted stack is a `bankai:handbook-question` scope-routed to the canon lane
   (`bankai:agent/yamamoto`, `CON-37`); reviewers never
   improvise rules for an unlisted stack.

> The above is the **CI review** resolution path (a live `bankai-core@bankai_core_ref`
> checkout). **Build/local** agents instead auto-load the product repo's generated, pinned
> `.claude/rules/` mirror of the same canon (`CON-13`). Both resolve from bankai-core; neither
> reads product-authored canon.

---

## Scaffold generation scenarios (`SCENARIO_ID` 1–7)

bankai-scaffold's **generation** taxonomy — *what to generate* for a given product
shape. Each names the **review stack(s)** it emits (from the table above), then its
full stack composition. This is the single canonical source of these compositions;
bankai-scaffold renders it and no longer carries its own copy (`#34` Phase C-3).
Language policy: **TypeScript · Swift · Kotlin only — no Rust.** Tags (the token
matches the inline `(…)` labels for grep): *framework*, *tooling*, *ci*, *runner*,
*database*, *backend*, *note*.

### Scenario 1 — Mobile + Web  📱🌐
**Targets:** iOS · Android · Web App · **Language:** TypeScript · **Review stack:** [`react-uzf-v1`](stacks/react-uzf-v1/) (`RC-{n}`)

- **Mobile UI** — Expo SDK 55+ (RN 0.84, New Arch + Hermes V1) *(framework)*; Expo Router — file-based nav, web-native since SDK 52 *(framework)*
- **Web UI** — Next.js 15 App Router — SSR + static rendering for SEO *(framework)*; Tailwind CSS v4 + shadcn/ui (React/JSX) *(tooling)*
- **Code Sharing** — Solito v5 + Tamagui — shared components across Expo + Next.js *(framework)*; `packages/core` — shared TS logic, hooks, types *(tooling)*
- **Backend / Edge** — Supabase Edge Functions (Deno/TS, ~0–5ms cold start) *(backend)*; Drizzle ORM + Supabase Postgres *(database)*
- **Auth** — Supabase Auth or Clerk *(tooling)*
- **Local Runner** — pnpm workspaces + Turborepo *(runner)*; `turbo run dev / build / test / lint` *(runner)*
- **CI / CD** — GitHub Actions *(ci)*; EAS Build — cloud iOS builds, no Mac runner needed *(ci)*; EAS Submit — automated App Store + Play Store *(ci)*; EAS Update — OTA JS updates, bypass store review *(ci)*; Vercel — preview per PR, prod on merge to main *(ci)*
- **Trade-off** — *~70–85% shared code (logic + components). Navigation & layout diverge per platform.*

### Scenario 2 — Mobile + Desktop  📱🖥️  · **2 options, pick one primary language**
**Targets:** iOS · Android · macOS · Windows

#### 2A — TypeScript only  · Expo/RN for mobile · Electron for desktop  · **Review stack:** [`react-uzf-v1`](stacks/react-uzf-v1/) (`RC-{n}`)
**Advantages:** EAS is best-in-class mobile CI/CD — cloud iOS builds, OTA updates · Natural Next.js extension if web is added later · One language, one toolchain, one ecosystem.
**Trade-offs:** Electron ~150–200MB installer, ~150–300MB RAM · Chromium rendering (not Skia) — consistent but heavy · Desktop perf ceiling lower than CMP.

- **Mobile UI** — Expo SDK 55+ (RN 0.84, New Arch + Hermes V1) *(framework)*; Expo Router *(framework)*; Solito v5 + Tamagui — mobile ↔ web component sharing *(framework)*
- **Desktop Shell** — Electron — pure TS/Node, Chromium, no Rust required *(framework)*; electron-vite — HMR for main + renderer *(tooling)*; electron-builder — .dmg (macOS) + .msi/.exe (Windows) *(tooling)*; electron-updater — differential auto-updates *(tooling)*
- **Desktop UI** — React 19 + Vite — shared from RNW/web layer, rendered in Chromium *(framework)*; Tailwind CSS v4 + shadcn/ui *(tooling)*
- **Code Sharing** — `packages/core` — shared TS logic, hooks, types (Expo + Electron + web) *(tooling)*
- **Backend / Edge** — Supabase Edge Functions (Deno/TS) *(backend)*; Drizzle ORM + Supabase Postgres *(database)*; better-sqlite3 — local SQLite inside Electron *(database)*
- **Local Runner** — pnpm workspaces + Turborepo *(runner)*; `turbo run dev` — Expo dev server + electron-vite in parallel *(runner)*
- **CI / CD** — GitHub Actions *(ci)*; EAS Build + EAS Submit — iOS/Android *(ci)*; electron-builder on `macos-latest` — signed + notarized .dmg *(ci)*; electron-builder on `windows-latest` — Authenticode signed .exe *(ci)*

#### 2B — Kotlin only  · KMP + Jetpack Compose for mobile · CMP for desktop  · **Review stack:** [`compose-uzf-v2`](stacks/compose-uzf-v2/) (`KT-{n}`)
**Advantages:** Skia hardware-accelerated desktop — ~50–80MB, no Chromium overhead · Highest code sharing: ~80–90% logic + UI across all 4 targets · One language owns Android, iOS UI, macOS, Windows.
**Trade-offs:** iOS via CMP = Skia renderer, not UIKit — custom theme required · JVM cold start ~1–2s on desktop (mitigable via GraalVM, experimental) · No web output — Kotlin/Wasm still beta; web needs TS if added later · macOS notarization more complex — use conveyor to automate.

- **Mobile UI — iOS + Android** — Compose Multiplatform (CMP) — shared UI across iOS + Android *(framework)*; Compose Unstyled — fully unstyled components, zero Material lock-in *(tooling)*; Custom CompositionLocal theme — your own colors, type scale, shapes *(tooling)*; Ktor — shared HTTP client (KMP commonMain) *(framework)*
- **Desktop UI — macOS + Windows** — Compose Multiplatform — macOS + Windows + Linux from same codebase *(framework)*; Compose Unstyled — same design system as mobile, zero duplication *(tooling)*; CMP `Window()` / `Tray()` / `MenuBar()` — native OS chrome built-in *(tooling)*; Compose Hot Reload 1.0 (stable Jan 2026) — live UI editing *(tooling)*
- **Shared Logic (KMP)** — KMP commonMain — networking, data models, business rules, auth *(framework)*; SQLDelight — local persistence shared across mobile + desktop *(database)*; kotlinx.serialization — shared data layer *(tooling)*
- **Backend / Cloud** — Supabase Kotlin SDK + Firebase Kotlin SDK *(backend)*; Ktor (Kotlin) — backend if needed, shares KMP code *(backend)*
- **Packaging** — conveyor — JVM app packaging + auto-update (macOS .dmg, Windows .msi) *(tooling)*
- **Local Runner** — Gradle (version catalog + composite builds) *(runner)*; `./gradlew run` — CMP desktop with Hot Reload *(runner)*; `./gradlew package` — OS-specific installer via conveyor *(runner)*
- **CI / CD** — GitHub Actions — matrix strategy *(ci)*; gradle-build-action with dependency caching *(ci)*; Gradle + conveyor on `macos-latest` — signed + notarized .dmg *(ci)*; Gradle + conveyor on `windows-latest` — Authenticode signed .msi *(ci)*; Fastlane gym + deliver — iOS App Store submission *(ci)*; Google Play API (Fastlane supply) — Android production *(ci)*

### Scenario 3 — Cross-Apple  🍎
**Targets:** iPhone · iPad · Mac · Apple Watch · Apple TV · Vision Pro · **Language:** Swift · **Review stack:** [`swiftui-tca-uzf-v2`](stacks/swiftui-tca-uzf-v2/) (`SW-{n}`)

- **UI (all targets)** — SwiftUI — single declarative codebase, `#if os()` conditional branches per target *(framework)*; RealityKit + Reality Composer Pro — visionOS volumes & Full Space *(framework)*; WidgetKit + WatchConnectivity — watchOS complications + phone bridge *(framework)*
- **Architecture** — Swift Package Manager (SPM) — one package per feature domain, shared across all Apple targets *(tooling)*; Swift strict concurrency (async/await + actors) — enforced since Swift 6 *(tooling)*
- **Backend / Data** — Supabase Swift SDK + Firebase iOS SDK *(backend)*; SwiftData (local, iOS 17+) or Core Data for broader OS support *(database)*
- **Auth** — Sign in with Apple + Supabase Auth *(tooling)*
- **Local Runner** — Makefile — wraps `xcodebuild` per target scheme *(runner)*; `swift run` — Swift CLI scripts for automation *(runner)*; `xcodebuild -scheme <target> -destination …` *(runner)*
- **CI / CD** — GitHub Actions on `macos-latest` (Xcode 26+) *(ci)*; Fastlane match — cert + profile management via encrypted git repo *(ci)*; Fastlane gym — build + archive per target scheme *(ci)*; Fastlane deliver — App Store submission per platform *(ci)*; Xcode Cloud (optional) — Apple-native CI with TestFlight integration *(ci)*
- **Trade-off** — *Only path to native watchOS, tvOS, visionOS RealityKit depth. No cross-platform framework reaches this.* · *Unified platform versioning (all '26') = Apple pushing cross-target consistency harder each year.*

### Scenario 4 — Cross-Desktop  🖥️
**Targets:** macOS · Windows (· Linux optional) · **Language:** Kotlin · **Review stack:** [`compose-uzf-v2`](stacks/compose-uzf-v2/) (`KT-{n}`)

- **Desktop UI** — Compose Multiplatform — macOS + Windows + Linux from one Kotlin codebase *(framework)*; Compose Unstyled — build your own design system, zero Material *(tooling)*; Custom CompositionLocal theme — your own colors, type scale, shapes, spacing *(tooling)*; Skia hardware-accelerated rendering — pixel-consistent across all OSes *(framework)*
- **Desktop Native APIs** — CMP `Window()` / `Tray()` / `MenuBar()` — native OS chrome built into framework *(framework)*; kotlinx-io — file system, path handling *(tooling)*; CMP keyboard shortcuts + drag-and-drop APIs *(tooling)*; conveyor — JVM packaging + auto-update (.dmg, .msi, .deb) *(tooling)*
- **Shared Logic** — KMP commonMain — networking (Ktor), data models, business rules *(framework)*; SQLDelight — local persistence, same API as Android *(database)*; kotlinx.serialization — cross-target data layer *(tooling)*
- **Cloud / Backend** — Supabase Kotlin SDK or Firebase Kotlin SDK *(backend)*; Ktor HTTP client — shared with Android *(backend)*
- **Local Runner** — Gradle (version catalog + composite builds) *(runner)*; `./gradlew run` — CMP desktop app with Compose Hot Reload 1.0 *(runner)*; `./gradlew package` — build OS-specific installer *(runner)*
- **CI / CD** — GitHub Actions — matrix: `[macos-latest, windows-latest, ubuntu-latest]` *(ci)*; gradle-build-action with dependency caching *(ci)*; conveyor on each OS runner — signed native installer per platform *(ci)*; macOS: Apple code signing + notarization via conveyor + GH secrets *(ci)*; Windows: Authenticode signing via conveyor + GH secrets *(ci)*; GitHub Releases — artifact hosting + auto-update feed *(ci)*
- **Trade-off** — *JVM cold start ~1–2s. Acceptable for desktop; GraalVM native image is the future mitigation (experimental 2026).* · *Bundle ~50–80MB with JVM. Worse than Tauri, similar to Electron — but one language, no Rust, hardware-accelerated.* · *No web output — Kotlin/Wasm still beta. If web needed later, add Next.js (TS) as a separate target.*

### Scenario 5 — Web Only  🌐
**Targets:** Browser · PWA · Admin Dashboard · **Language:** TypeScript · **Review stack:** [`react-uzf-v1`](stacks/react-uzf-v1/) (`RC-{n}`)

- **Framework** — Next.js 15 App Router — SSR + static generation for SEO + API routes *(framework)*; React 19 + TypeScript *(framework)*
- **UI / Styling** — Tailwind CSS v4 *(tooling)*; shadcn/ui — React/JSX component library *(tooling)*
- **Backend** — Next.js API routes — simple CRUD *(backend)*; Supabase Edge Functions (Deno/TS) — complex isolated logic *(backend)*
- **Database** — Drizzle ORM + Supabase Postgres — edge-safe, tiny bundle *(database)*; Prisma 7 (pure TS, Nov 2025, 85–90% smaller engine) — longer-lived servers *(database)*
- **Auth** — Supabase Auth or Clerk *(tooling)*
- **Local Runner** — pnpm workspaces + Turborepo *(runner)*; `turbo run dev --filter=web` *(runner)*; `next dev --turbopack` *(runner)*
- **CI / CD** — GitHub Actions *(ci)*; Vercel — zero-config preview per PR, prod on merge to main *(ci)*; OR GCP Cloud Run — self-hosted, no platform lock-in *(ci)*
- **Trade-off** — *Simplest scenario. Pure TS, one framework, one deploy target. Zero context switching.*

### Scenario 6 — Far-Apple  🤖🥽
**Targets:** Android Phone · Wear OS · Android TV · Meta Quest XR · **Languages:** Kotlin + TypeScript · **Review stacks:** [`compose-uzf-v2`](stacks/compose-uzf-v2/) (`KT-{n}`) for the Kotlin targets + [`react-uzf-v1`](stacks/react-uzf-v1/) (`RC-{n}`) for the Meta Quest / RN target

> ℹ️ TypeScript only for Meta Quest (Horizon OS = Android-based; RN slots in cleanly alongside Kotlin targets).

- **Android Phone / Tablet** — Jetpack Compose (Kotlin) — native Material 3 UI *(framework)*; Kotlin Coroutines + Flow — async / reactive state *(tooling)*
- **Wear OS** — Compose for Wear OS (Kotlin) — WearableDrawerLayout, health tile APIs *(framework)*; Health Services API + DataLayer API (phone ↔ watch bridge) *(tooling)*
- **Android TV** — Compose for TV (Kotlin) — TvLazyRow, focus management, D-pad nav *(framework)*
- **Meta Quest / Horizon OS XR** — React Native on Meta Quest — officially announced React Conf 2025 *(framework)*; Horizon OS = Android base — existing RN Android tooling, minimal changes *(tooling)*; Meta Spatial SDK bridge via RN native module for VR-specific APIs *(tooling)*
- **Shared Logic** — KMP commonMain — networking (Ktor), data models, business rules *(framework)*; SQLDelight or Room KMP — local persistence across all Kotlin targets *(database)*; kotlinx.serialization — shared data layer *(tooling)*
- **Cloud / Backend** — Firebase Firestore + Firebase Auth (Kotlin SDK) *(backend)*; Supabase Kotlin SDK (community-maintained) *(backend)*
- **Local Runner** — Gradle (version catalog + composite builds) — all Kotlin targets *(runner)*; Makefile wrapper — `make dev-phone / dev-wear / dev-tv / dev-xr` *(runner)*; pnpm + Turborepo — Meta Quest / RN target only *(runner)*
- **CI / CD** — GitHub Actions on `ubuntu-latest` *(ci)*; gradle-build-action with Gradle dependency caching *(ci)*; Firebase App Distribution — internal QA builds *(ci)*; Google Play API (Fastlane supply) — production deployment *(ci)*; EAS Build — Meta Quest / RN target *(ci)*
- **Trade-off** — *Kotlin covers Android, Wear, TV natively. TS (RN) enters only for Meta Quest — Horizon OS is Android-based so it integrates cleanly.*

### Scenario 7 — Custom (All Form Factors)  🌍
**Targets:** All Apple + All Android + Web + Desktop + XR · **Languages:** Swift + TypeScript + Kotlin · **Review stacks:** all three product stacks — [`swiftui-tca-uzf-v2`](stacks/swiftui-tca-uzf-v2/) (`SW-{n}`), [`react-uzf-v1`](stacks/react-uzf-v1/) (`RC-{n}`), [`compose-uzf-v2`](stacks/compose-uzf-v2/) (`KT-{n}`) — each layer reviewed under its own stack

- **Apple Layer — Swift** — SwiftUI — iOS, iPadOS, macOS, watchOS, tvOS, visionOS *(framework)*; SPM feature packages — shared logic across all Apple targets *(tooling)*; RealityKit — visionOS spatial experiences *(framework)*
- **Web + Cross-Mobile — TypeScript** — Next.js 15 App Router — web (SSR + static) *(framework)*; Expo / RN — cross-mobile bridge layer + Meta Quest (Horizon OS) *(framework)*; Solito v5 + Tamagui — shared components (Expo ↔ Next.js) *(framework)*; Supabase Edge Functions (Deno/TS) + Drizzle ORM *(backend)*
- **Android + Desktop — Kotlin** — Jetpack Compose — Android Phone/Tablet *(framework)*; Compose for Wear OS + Compose for TV *(framework)*; Compose Multiplatform — macOS + Windows desktop (Skia, custom theme) *(framework)*; Compose Unstyled — shared design system layer, no Material required *(tooling)*; KMP commonMain — shared logic across all Kotlin targets *(framework)*; SQLDelight — local persistence (Android + Desktop) *(database)*
- **Cross-Stack Glue** — TypeSpec — API shapes once → TS types + Swift Codable + Kotlin data classes *(tooling)*; Style Dictionary — design tokens → Swift Color + Kotlin Color + CSS vars + Tailwind *(tooling)*
- **Cloud / BaaS** — Supabase (Postgres + Auth + Edge Functions) — primary BaaS *(backend)*; Firebase (Firestore + Auth) — Android/Kotlin-native integrations *(backend)*; Ktor (Kotlin) — server-side if sharing KMP logic on backend *(backend)*
- **Local Runner** — Makefile — top-level orchestrator across all subsystems *(runner)*; `make ios / android / web / desktop / xr` *(runner)*; pnpm + Turborepo — TS layer (Next.js + Expo) *(runner)*; Gradle composite builds — Kotlin layer (Android + Wear + TV + CMP Desktop + Ktor) *(runner)*; `xcodebuild` via Makefile — Swift/Apple layer *(runner)*
- **CI / CD** — GitHub Actions — matrix: `macos-latest + ubuntu-latest + windows-latest` *(ci)*; `macos-latest`: Fastlane (Swift/Apple) + Gradle CMP macOS + conveyor notarization *(ci)*; `ubuntu-latest`: Gradle (Android/Wear/TV/Ktor) + EAS (Expo/Quest) + Vercel (web) *(ci)*; `windows-latest`: Gradle CMP Windows build + conveyor Authenticode signing *(ci)*; EAS Build + EAS Submit — Expo mobile + Meta Quest targets *(ci)*; Fastlane match + gym + deliver — all Apple targets *(ci)*; Firebase App Distribution + Play API — Android internal + prod *(ci)*
- **Trade-off** — *3 primary languages unavoidable for full native coverage across all form factors.* · *TypeSpec + Style Dictionary keep API contracts and design tokens in sync across all three languages.*

### Universal across all scenarios

pnpm + Turborepo (TS orchestration) · Gradle composite builds (Kotlin) · GitHub
Actions · Supabase primary BaaS · Firebase secondary BaaS (Kotlin/Android) ·
TypeSpec (API contracts) · Style Dictionary (design tokens).

## Relationship to bankai-scaffold

`bankai-scaffold` generates product repos keyed by the `SCENARIO_ID` `1…7`
taxonomy above. Those ids describe *what to generate*; the **review stacks** (the
*Supported scenarios* table) describe *which review rules apply* — a different
namespace, bridged by each generation scenario naming its review stack(s).

The full scenario compositions are now **canon here**, not in bankai-scaffold.
Scaffold's former `stack-matrix.jsx` (a React/CLI renderer that hard-coded this
data) is retired in favour of **fetching this file at generation time** and
rendering from it (`#34` Phase C-3, Kisuke) — one source, not two. Wiring a
generated repo to the review pair (emitting a `bankai.yml` keyed by the review
stack its `SCENARIO_ID` maps to) is the same generation step.
