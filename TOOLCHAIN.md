# Toolchain

The one place that says what builds Kro Web and how you invoke it. If a command
here disagrees with something you read elsewhere, this file wins.

## What you need

| Tool | Version | How you get it |
|---|---|---|
| Node.js | `>= 20.19.0` (developed against 22; CI runs 22) | nvm / fnm / Homebrew |
| pnpm | `9.15.9` | `corepack enable` — the version is pinned by `packageManager` in the root `package.json`, so Corepack fetches exactly this one |
| Turborepo | `^2.5` | installed by `pnpm install` (root devDependency) |
| Make | any | ships with macOS and every Linux |

Never install pnpm globally for this repo and never run `npm install` in it. The
`packageManager` pin plus Corepack is what makes a fresh clone reproducible.

## First run

```bash
corepack enable
pnpm install          # or: make setup
cp .env.example apps/web/.env.local   # then fill in the values you need
pnpm dev              # or: make dev  -> http://localhost:3000
```

`.env.local` is only needed for Google sign-in and web-push. `/session` — the
focus-session surface — runs without any environment variables at all.

## Workspace layout

```
kro-pwa/
├── apps/
│   └── web/          @kro/web    Next.js 15 App Router: routes, API handlers,
│                                 app-shell providers, PWA plumbing, browser
│                                 storage and platform services
├── packages/
│   ├── core/         @kro/core   platform-free domain: models, pure business
│                                 rules, time/duration math. No react, no next,
│                                 no DOM, no Node built-ins.
│   └── app/          @kro/app    shared feature + design tier (skeleton today)
├── scripts/                      repo-level checks and helpers
├── tsconfig.base.json            the single TypeScript baseline
├── turbo.json                    the task graph
└── Makefile                      the canonical verbs
```

Dependency direction is one-way and enforced:

```
apps/web  ->  packages/app  ->  packages/core
```

Cross-package dependencies are always declared as `workspace:*`. `@kro/core`
carries **no** platform dependency; `scripts/check-platform-free.mjs` runs as its
`lint` task and fails the build if one appears, and `packages/core/tsconfig.json`
compiles with `lib: ["ES2022"]` and `types: []` so DOM and Node globals do not
even have typings there.

Workspace packages are consumed as TypeScript **source**, not as a build
artifact: their `exports` point at `src/index.ts`, Next.js compiles them via
`transpilePackages`, and Vitest resolves them via aliases. There is no
per-package bundling step to keep in sync.

## Verbs

Both columns do the same thing. `make` is the interface; pnpm is the mechanism.

| Verb | Runs | What it does |
|---|---|---|
| `make setup` | `corepack enable && pnpm install` | install the toolchain and all dependencies |
| `make dev` | `turbo run dev` | Next dev server on :3000 |
| `make build` | `turbo run build` | production build of every member |
| `make lint` | `turbo run lint` | Biome repo-wide + the `@kro/core` platform-free and UZF boundary checks |
| `make typecheck` | `pnpm -r exec tsc --noEmit` | type-check every member |
| `make test` | `turbo run test` | Vitest suites in every member (`make test-e2e` runs Playwright locally) |
| `make test-coverage` | each member's `test:coverage` | The same suites, instrumented. Kept out of `make test` and out of `pr.yml`: instrumentation roughly doubles the longest job, and the ≥80%-on-touched-files floor is a per-PR measurement no gate reads (KC-IS-#50). |
| `make analyze` | `turbo run analyze` | production build with `@next/bundle-analyzer` |
| `make codegen` | — | reserved; no generator wired yet |
| `make tokens` | — | reserved; wired by the design-system child |
| `make deploy` | — | not wired; the host is still an open decision (Vercel vs Cloud Run) |
| `make publish` | — | n/a: a PWA has no package or store pipeline |

### Build and lint are separate verbs

Lint is its own Turborepo task, so `make build` answers *"does it compile and
bundle"* and `make lint` answers *"does it match the style rules"* — one failing
never masks the other. Type errors still fail the build.

### What is green today

| Verb | State | Why |
|---|---|---|
| `make build` | ✅ green | |
| `make typecheck` | ✅ green | all three members, `noUncheckedIndexedAccess` on |
| `make test` | ✅ green | 9 264 tests: `@kro/core` 1 843 · `@kro/app` 7 288 · `@kro/web` 133 |
| `make test-coverage` | ✅ green | Line coverage across the whole tree: `@kro/core` **97.54 %** · `@kro/app` **95.67 %** · `@kro/web` reported by its own `test` script. The per-PR bar is ≥80 % on *touched* files (`UZF-19`); these are the whole-package numbers the verb prints. |
| `make lint` | ✅ green | Biome (0 errors; warnings allowed), plus the platform-free and UZF boundary checks. Biome now covers the whole repo; the vendored `apps/web/src/components/ui/**` set stays excluded until #6's kit deletes it. |

The `@kro/core` platform-free gate stays readable on its own:
`pnpm --filter @kro/core lint`.

### Rules that are not at their preset severity, and why

The `packages/` and `scripts/` exclusions were lifted in KC-IS-#47, which put
~40 000 lines under the linter for the first time. Everything the formatter and
Biome's safe fixes could settle was settled in that pass; three rules were
adjusted rather than satisfied, and each one is a decision rather than a
deferral:

| Rule | Severity | Why |
|---|---|---|
| `correctness/useExhaustiveDependencies` | `warn` (repo-wide) | Predates #47. A mount-only effect is a legitimate shape; the rule cannot see the intent, so it advises rather than blocks. |
| `a11y/useSemanticElements` | `off` (repo-wide) | Its advice is wrong for this codebase. It reports every `role="group"` and asks for `<fieldset>` — a form-control grouping element with UA styling, not a general container — and every `<form role="search">` and asks for `<search>`, which is a landmark wrapper, not a replacement for the `<form>` that owns submit. `role="group"` and `<form role="search">` are both correct ARIA. |
| `a11y/noStaticElementInteractions`, `a11y/useKeyWithClickEvents` | `warn` (`packages/app/src/**` only) | **Real findings, tracked, not accepted.** 15 ported surfaces attach a pointer handler to a non-interactive element. Each needs a keyboard affordance *designed* — canon's own gestures have no keyboard equivalent — which is a UI change per surface, not a suppression. They stay visible on every `make lint` run and are owned by [KC-IS-#77](https://github.com/zheref/kro-pwa/issues/77). The downgrade is scoped to the render tier so anything new outside it still fails. |

Everything else Biome reports today is a warning at its own preset severity
(`noNonNullAssertion` in tests, `useOptionalChain`, …) and is left alone: the
run is green, and the warnings are the backlog.

## TypeScript

`tsconfig.base.json` is the only place the baseline is written down; every
member extends it and overrides nothing but `lib`, `jsx`, `types` and `paths`.

- `strict: true` **and** `noUncheckedIndexedAccess: true` — an indexed read is
  `T | undefined` until you prove otherwise.
- `moduleResolution: "Bundler"`, `module: "ESNext"`, `target: "ES2022"`.
- `isolatedModules: true` — every file must be transpilable on its own.

## Current state vs. target

After #2 (monorepo) and #3 (toolchain):

| Axis | Today | Remaining target |
|---|---|---|
| Lint / format | Biome over the whole repo bar the vendored Chakra set | delete that exclusion with the vendored files (#6); clear the 15 tracked a11y findings (KC-IS-#77) |
| Tests | Vitest everywhere; Playwright via `make test-e2e` (not in CI yet); Storybook **10** wired, story-less | stories + snapshot minimums arrive with the feature children; Playwright in CI once a browser step is wired |
| Git hooks | lefthook + commitlint + `.bankai/hooks/guard.sh`, active | — |
| CI | `pr.yml` (install → lint → typecheck → test → build, Node 22) | `bankai.yml` (#4) |

Note: the bankai-core stack canon still names Storybook **8**; SB 8's Next
builder crashes on Next 15.3 (upstream storybookjs/storybook#32301, fixed in
9.x), so this repo runs Storybook 10 — the canon correction is tracked in
bankai-core.

Nothing above changes the verbs: `make lint` and `make test` keep working across
every swap, which is the point of routing through the Makefile.
