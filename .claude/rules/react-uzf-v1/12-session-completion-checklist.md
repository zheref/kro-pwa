<!-- GENERATED from bankai-core@v0.11.2/handbooks/stacks/react-uzf-v1/rules/12-session-completion-checklist.md — DO NOT EDIT; change the handbook and re-run sync-canon. -->
# 12 — Session Completion Checklist

Implements **UZF-23** (the session-completion gate) for the React 19 + Redux
Toolkit / UZF stack. A "session" is one focused unit of work on a single
feature — one branch, one PR, one ramp-up. **A session is not complete** until
every item here is satisfied. Use this to refuse marking work done; use it in
PR review to refuse merge.

This stack is one family with two render targets: apps/web (Next.js App
Router) and apps/mobile (absent, this repo is web-only) (Expo Router / React Native). Slices, selectors,
shifters, producers, services, and mappers live once in packages/core and
are shared by both — this checklist applies per feature, regardless of which
render target(s) ship it in this session.

## Repo-specific placeholders

| Token | kro example |
| --- | --- |
| `packages/core` | `packages/core` |
| `apps/web` | `apps/web` (Next.js 15 App Router) |
| `apps/mobile (absent, this repo is web-only)` | `apps/mobile` (Expo SDK 55 / Expo Router) |
| `featureFlags.ts` | `featureFlags.ts` (`export const FeatureFlags = { … } as const`) |
| `docs/Features` | `docs/Features` |
| `.github/workflows/pr.yml` | `pnpm test -- --coverage` (Vitest, or Jest if the repo hasn't migrated yet) |

## RC-11 — Storybook is the visual-evidence carrier for this stack

Where the Compose/SwiftUI stacks satisfy **UZF-26** with `@Preview` +
Paparazzi/snapshot-test pairs, this stack satisfies it with **Storybook
stories + their matching snapshot/interaction tests** (RTK Rule 11: Pages and
Fragments ship ≥ 3 stories mirroring the snapshot tests). A story with no
matching snapshot test — or a snapshot test built from hand-rolled inline
props instead of the story's own args — does not count as evidence. Story
files are `<Name>.stories.tsx`, co-located with the Page/Fragment.

## The Checklist

For every session that touches a feature, before declaring it done:

### 1. Coverage ≥ 80% on touched files (UZF-19)

- Run the repo's verification command (`.github/workflows/pr.yml`) — in this stack
  it runs the Vitest/Jest suite with coverage instrumentation, plus the
  ESLint architecture rules (`no-restricted-imports` for `fetch`/`axios`
  outside `services/`, `@typescript-eslint/switch-exhaustiveness-check`).
  The files you added or modified must have **line coverage ≥ 80%**.
- Coverage of the project as a whole is not the bar — *touched files* are the
  bar. A small bug fix in an 80%-covered file is fine; the same fix that
  drags the file below 80% is not.
- Coverage is measured with Vitest's/Jest's built-in `c8`/`istanbul` coverage
  provider. The CI gate must read from the same source so local and CI agree.
- The per-artifact minimums from **UZF-18** (refined by the RTK Synthesis §1)
  still apply on top of the 80% floor:
  - ≥ 3 unit tests per non-trivial reducer arm (`reducers` case or
    `extraReducers` `.fulfilled`/`.rejected` arm), each with a real-world
    scenario name.
  - ≥ 3 tests per Shifter (`…Shifters.ts`) and per Selector (`…Selectors.ts`,
    built with `createSelector` — never asserted via a raw state shape).
  - ≥ 3 cases per Producer/Mapper function (`toDomain`, `fromDomain`,
    `toException`, and the thunk's success/failure paths).
  - ≥ 3 Storybook stories **and** ≥ 3 matching snapshot/interaction tests per
    Page and per Fragment (**RC-11**), built from the feature's
    `__mocks__/<Feature>.mocks.ts` — never inline `State` or ad hoc props.
  - ≥ 7 mocks per new domain model, in `__mocks__/*.mocks.ts` (3 convenient,
    1 neutral, 3 inconvenient — e.g. happy / empty / long / non-ASCII /
    missing-optional / stale / fresh).
- Files exempt from the 80% floor: Pages/Fragments fully exercised by
  Storybook snapshot tests, generated code (`*.generated.ts`, RTK Query
  codegen), `__mocks__/*.mocks.ts` (the mocks files), and `…Module`-style
  pure DI wiring (store registration only, no logic). Note the exemption in
  the PR description.

### 2. Mermaid diagram is current (UZF-21)

- The ` ```mermaid ` fenced block(s) inside `docs/Features/<FeatureName>.md`
  reflect the behavior shipped in this session. Every diagram is a fenced
  block inside the spec — no standalone `.mermaid` files.
- If the spec has no diagram yet, **add one now**.
- New states, new edges, new branches in user flows → diagram update in the
  same PR.
- A feature shared by both apps/web and apps/mobile (absent, this repo is web-only) has **one** spec
  and **one** diagram (the state machine lives once in packages/core); a
  platform-specific rendering detail goes under that platform's notes
  subsection, not a second diagram.

### 3. Feature spec is current (UZF-21)

- `docs/Features/<FeatureName>.md` reflects the shipped behavior.
- If the doc didn't exist, **create it now**.
- Sections to revisit every session:
  - **User flows** — any new tap/click target, gesture, or empty-state copy
    goes here.
  - **States** — any new state, including failure / empty / loading variants
    (modeled as one exclusive-state type per **UZF-9** — never parallel
    `isLoading`/`error`/`data` optionals).
  - **Interactions with other features** — any new delegate event,
    navigation (Solito/Expo Router/Next.js routing), or cross-feature
    scroll/jump.
- The doc is language-agnostic. Resist the urge to mention type names — no
  `…Slice`, `…Selector`, `.tsx` — describe behavior.

### 4. Feature flag wrapping (UZF-22)

- Any session that adds **new user-visible behavior** must check whether a
  feature flag already covers it.
- If yes: confirm the new behavior is reachable only when its flag resolves
  enabled (via the flag registry's resolver, shared from packages/core so
  both render targets read the same value). Gate the behavior at the
  boundary — the `<Feature>Page`/`<Feature>Screen` component and Producer
  thunks — **not** deep inside the reducer, which stays pure.
- If no: introduce a new flag. Register a flag entry in the platform's flag
  registry (`featureFlags.ts`, in `packages/core`) and register its default
  in the status-quo default set (usually disabled for greenfield), then
  document it in `docs/Features/<FeatureName>.md` under **Feature flag**.
- One feature flag = one feature doc file. Do not split a single product
  feature across multiple flags unless the rollout strategy genuinely
  requires it.
- Shipping the same feature to both apps/web and apps/mobile (absent, this repo is web-only) in one
  session uses the **same flag key** — a per-platform flag for identical
  behavior is a finding (it defeats the shared-core model).
- Internal-only refactors and bug fixes do **not** need new flags.

## When you may skip an item

You may skip an item only when the user has explicitly accepted the gap **in
writing in the PR / conversation**, and only for one of these reasons:

- **Coverage** — A spike or research branch that will not be merged. Mark the
  PR as draft, label `do-not-merge`.
- **Diagram** — The feature has no flow worth diagramming (e.g. a single
  static page). Note the omission in the doc itself.
- **Spec** — The session was a pure-tech-debt change (file moves, dependency
  bumps, renames inside one file) with zero behavior change. Note in PR
  description.
- **Flag** — Bug fix to existing flagged behavior; no new product surface
  introduced.

The **UZF-26 visual evidence** carried by a UI change — the Storybook
snapshot/interaction tests that mirror a Page's or Fragment's story set
(**RC-11**) — is **not** a freely-waivable coverage item. Its only two
sanctioned incompletenesses are the UZF-26 *bankai-mode timed deferral* (no
snapshot-capable runner yet — a tracked IOU with a mandatory true-up) and a
*demonstrated capture-tooling gap* (the tooling provably cannot render a
specific scene — a tracked, skipped story). A logic-only session that changes
no Page/Fragment/Component is simply exempt — note "no UI surface changed" in
the PR description.

If none of those apply, **complete the item**.

## Enforcement

This checklist is enforced at three points:

1. **Self-review** — before pushing your last commit, re-read this file. If
   any item is open, finish it.
2. **PR description** — the PR template includes the checklist; the author
   ticks each box or notes the explicit skip reason. Reviewers reject PRs
   with un-ticked boxes and no skip note.
3. **Claude Code (this assistant / the CI review agent)** — when asked to
   "wrap up", "mark this done", "ship it", or similar, the assistant must
   walk the checklist and report which items are not yet satisfied. Refuse
   to declare a session complete with open items unless the user explicitly
   waives one with a reason.

## Infra/process-dependency propagation is part of "done" (UZF-23 / CON-21)

If the session bumped a **shared infra/process dependency that CI resolves
per-branch** (a pinned reusable-workflow tag, a tool/runtime/SDK version — for
this stack, notably Expo SDK / RN, Next.js, or the pnpm/Node toolchain — or a
shared config/secret contract), the session is not complete until that bump
has **cascaded to every live `integration/*` branch** — and thereby the
feature branches off them — or an explicit, reasoned deferral is noted (e.g.
"no integration branch is live"). A **trunk-only repin is not a completed
bump**: it silently strands every in-flight epic on the old version. See the
shared GitHub-version-control canon (bankai's cross-stack general rules — not
a `react-uzf-v1` rule file) for the concrete trunk-first → cascade →
inherit-by-rebase procedure (CON-21).

## Suggested order during a session

1. Implement the change in packages/core (slice, selectors, shifters,
   producer, service/mapper) first — it is shared by both render targets.
2. Build/update the render layer in whichever of apps/web / apps/mobile (absent, this repo is web-only)
   this session targets.
3. Write / update tests (Vitest/Jest + React Testing Library for Pages/
   Fragments; Storybook + its test runner for stories; plain unit tests for
   Shifters/Selectors/Mappers) until coverage on touched files is ≥ 80% and
   the UZF-18 minimums are met.
4. Update / create the feature spec under `docs/Features/<FeatureName>.md`.
5. Update / create the mermaid diagram.
6. Verify flag wrapping; introduce a flag (and its status-quo default) if
   missing.
7. Commit, per the repo's commit-message convention (CON-17). The session is
   now done.

## Cross-references

- **UZF-18** — testing minimums per artifact (Vitest/Jest, Storybook, RTL).
- **UZF-21** — where docs live and how they're shaped.
- **RC-11** — Storybook stories as this stack's UZF-26 visual-evidence carrier.
- Platform flag registry (`featureFlags.ts`, in `packages/core`) — where flag
  entries and their status-quo defaults live (UZF-22).
