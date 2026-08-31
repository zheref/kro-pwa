# CLAUDE.md — Kro Web (`kro-pwa`, product code `KC`)

> **This file is BINDING.** Toolchain: [`TOOLCHAIN.md`](./TOOLCHAIN.md). Product & technical
> spec: [`/spec`](./spec/). Process gates, reviewers and the current G5 queue:
> [`docs/BANKAI-OPERATIONS.md`](./docs/BANKAI-OPERATIONS.md).
>
> Scenario `react-uzf-v1` (Stack Matrix Scenario 5 — Web Only). Process canon pinned to
> `bankai-core@v0.11.2`.

<!-- bankai-scf: canonical UZF context (auto-loaded imports) -->
## Canonical UZF context (auto-loaded)

Claude Code auto-loads the **generated canon mirror** from `.claude/rules/` natively — the
universal law (`UZF-{n}`, `.claude/rules/00-uzf-core.md`), the Stack Matrix, and this stack's
`RC-1`…`RC-63` (`.claude/rules/react-uzf-v1/`). No `@`-import is needed for those, and they are
**never hand-edited** (`CON-13`): they are generated from `bankai-core@v0.11.2` +
`.claude/canon-values.yml`, and a hand-edit fails the `sync_canon` drift check.

The two `@`-imports below are this repo's **hand-authored architecture contract** — how the law
above is realized here. They are part of this file. **Edit the source docs under `spec/`, never
restate them here.**

@spec/architecture/README.md
@spec/architecture/web.md

## Architecture — NON-NEGOTIABLE

One-way loop, no shortcuts. The full rules are in the mirror; these are the ones that get broken:

- **Components cannot fetch.** Effects are built only by Producers (`createAsyncThunk`), which
  read Services from the thunk `extra` argument. Never a module-level Service import, never a
  service locator, never `fetch` outside `packages/app/src/services/**` (`RC-3`, `RC-6`).
- **One store path.** `makeStore(extra)` in `packages/app/src/library/store.ts` is the only place
  `configureStore` is called — including in tests and stories. A test passes
  `stubbedThunkExtra`; it does not build a second store (`RC-22`, `RC-35`).
- **One binding surface.** `useAppSelector` / `useAppDispatch` only. No raw `useSelector` /
  `useDispatch`, no `connect()` (`RC-10`).
- **Thunks never throw.** They resolve `Result<T, E>`; `.rejected` is a defensive fallback and
  returns early on `action.meta.aborted` — cancellation is the one silent exit (`RC-7`, `UZF-14`).
- **State mutations go through a named `with…` Shifter**, applied as
  `Object.assign(state, withThing(state, args))`. Only a single primitive assignment may be
  inlined (`RC-4`).
- **Lifecycle is ONE discriminated field** (`load: {kind:'idle'|'loading'|'loaded'|'failed'}`),
  never `isLoading` + `exception` in parallel — the pair can represent "loaded and failed at
  once" (`RC-24`, `UZF-9`).
- **Derived reads are Selectors** in `…Selectors.ts`, built with `createSelector`. A
  `useAppSelector` callback may do an O(1) field read and nothing more (`RC-5`).
- **Event names encode intent, never mechanism**: `onViewLoaded`, `userDidTapRetry`,
  `childDetailDelegatedClose`; a thunk's type string is `'<feature>/on<Thing>Completed'`, never
  `'<feature>/fetch<Thing>'` (`RC-2`).
- **Errors are typed.** A closed `…Exception` union with an `<X>Exceptions` factory; never a raw
  `string` or `Error` in `State`. User copy is derived from `kind` in the domain tier, never
  assembled in a view (`RC-8`).
- **Navigation is a Service** invoked from a Producer, never from a component (`RC-17`).

## Repo invariants

- **Three workspace members**, one direction: `apps/web` (`@kro/web`) → `packages/app`
  (`@kro/app`) → `packages/core` (`@kro/core`). Cross-package imports use `workspace:*` only —
  never a relative `../../packages/core/src/...` reach-through.
- **`@kro/core` is platform-free.** No react, next, react-dom, DOM globals or Node built-ins.
  Enforced by `scripts/check-platform-free.mjs` **and** by `lib: ["ES2022"]` / `types: []`.
- **`@kro/app` never imports `next/*`.** Next.js belongs to `apps/web`. Enforced by
  `packages/app/scripts/check-uzf-boundaries.mjs`, which also enforces the store, hooks, Service,
  `fetch` and `createSlice`/`createAsyncThunk`/`createSelector` file-placement rules.
- **pnpm + Turborepo. Never add git submodules.**
- **No new dependency without a reason in the PR body.** The stack is locked by Scenario 5.
- **`packages/core` is the schema client, never its owner.** The Kro Cloud (Supabase) schema
  belongs to `zheref/KroApple`; this repo writes no migration and wires no `db-migrate` caller.
- **`.claude/rules/` is generated.** Never edit it. Change the handbook in `bankai-core` (G4) and
  let `sync_canon` regenerate.
- **Product behaviour defers to `zheref/KroApple@main`** (`docs/Features/*.md`; code is the
  tie-breaker). Re-fetch `origin/main` before starting a child and name any divergence in the PR.

## Make verbs — the only supported entry points

CI, agents and a human on a fresh clone all go through these, so changing the underlying tool
never changes the interface.

| Verb | Does |
|---|---|
| `make setup` | `corepack enable` + `pnpm install` (installs lefthook hooks via `prepare`) |
| `make dev` | run the web app in development |
| `make build` | production build of every workspace member |
| `make lint` | Biome across the repo **plus** each package's structural check |
| `make format` | Biome formatter + safe fixes, in place |
| `make typecheck` | `tsc --noEmit` across every member |
| `make test` | every member's Vitest suite |
| `make test-e2e` | Playwright (installs Chromium first) |
| `make analyze` | production build with the bundle analyzer |
| `make codegen` | **no-op today** — reserved; says so rather than pretending |
| `make tokens` | **no-op today** — reserved for KroTokens (#6) |
| `make deploy` | **not wired** — Vercel vs Cloud Run is an open G5 decision; exits 1 |
| `make clean` | remove build output and caches |

Do not invent a script. If a verb is missing, add it to the `Makefile` in a PR that says why.

## Definition of Done — every PR

- [ ] `make lint && make typecheck && make test && make build` green **locally**.
- [ ] Per-artifact test minimums met (`spec/08-acceptance.md`): ≥3 per reducer arm / Selector /
      Shifter / Producer; ≥3 stories **and** ≥3 render tests per Page/Fragment; ≥7 mocks per
      domain model. New behaviour covers the happy path **and** ≥1 edge case.
- [ ] ≥80 % line coverage on every touched file; exemptions named in the PR body.
- [ ] Tests use `stubbedThunkExtra` / a `stubbed…Service` — **never the live network**, never a
      mocked `fetch`, never a `State` constructed inline instead of from `<F>Mocks.ts`.
- [ ] No new `any`. No `@ts-ignore`. A `@ts-expect-error` or `biome-ignore` states its reason on
      the same line.
- [ ] Conventional Commit; PR cites its issue (`Closes #N` / `Part of #N`) and stays inside that
      issue's declared file lane.
- [ ] PR body carries `# What this changes for you` and `## How to verify` (`CON-17`).
- [ ] Nothing committed with `--no-verify`.

## What NOT to do

- **Never `--no-verify`.** The lefthook pre-commit chain (Biome, `tsc --noEmit`,
  `.bankai/hooks/guard.sh`) and the commit-msg commitlint check are the local half of CI, not
  advisory (`SEC-14`).
- **Never force-push** a shared branch, and never push to `main`. Every change is a PR; the
  human merges (**G2**).
- **Never hand-edit `.claude/rules/`** — it fails the drift check by design.
- **Never hardcode a credential.** The guard hook refuses it; read from the environment.
- **Never suppress a diagnostic without a reason on the same line.** `@ts-nocheck`,
  `@ts-ignore` and `eslint-disable` are refused outright (ESLint is gone — this repo uses Biome).
- **Never add a source file under `apps/web/src/**` or `packages/*/src/**` without a test.** The
  guard refuses it; a pure re-export barrel is the only exemption.
- **Never write to `spec/architecture/*` by copying it into this file** — it is `@`-imported;
  a copy silently drifts.
- **Never install a GitHub App, set a secret, change a ruleset or register a required check.**
  Those are the human's (**G5**) — stop and name the gate.
- **Never restate canon locally to work around a gap in it.** File a
  `bankai:handbook-question` issue on `bankai-core`.

## Gates

`G1` epic approval · `G1-M` release into build · `G2` merge to `main` · `G3` release go/no-go ·
`G4` policy/spec/canon (in `bankai-core`) · `G5` human-only action. **No agent merges `main`.**
Full map, plus what is still missing before the machinery runs here:
[`docs/BANKAI-OPERATIONS.md`](./docs/BANKAI-OPERATIONS.md).
