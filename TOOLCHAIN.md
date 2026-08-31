# Toolchain

The one place that says what builds Kro Web and how you invoke it. If a command
here disagrees with something you read elsewhere, this file wins.

## What you need

| Tool | Version | How you get it |
|---|---|---|
| Node.js | `>= 20` (developed against 22) | nvm / fnm / Homebrew |
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
`transpilePackages`, and Jest resolves them via `moduleNameMapper`. There is no
per-package bundling step to keep in sync.

## Verbs

Both columns do the same thing. `make` is the interface; pnpm is the mechanism.

| Verb | Runs | What it does |
|---|---|---|
| `make setup` | `corepack enable && pnpm install` | install the toolchain and all dependencies |
| `make dev` | `turbo run dev` | Next dev server on :3000 |
| `make build` | `turbo run build` | production build of every member |
| `make lint` | `turbo run lint` | ESLint on the app + the `@kro/core` platform-free check |
| `make typecheck` | `pnpm -r exec tsc --noEmit` | type-check every member |
| `make test` | `turbo run test` | Jest suites |
| `make analyze` | `turbo run analyze` | production build with `@next/bundle-analyzer` |
| `make codegen` | — | reserved; no generator wired yet |
| `make tokens` | — | reserved; wired by the design-system child |
| `make deploy` | — | not wired; the host is still an open decision (Vercel vs Cloud Run) |
| `make publish` | — | n/a: a PWA has no package or store pipeline |

### Build and lint are separate verbs

`next build` runs ESLint by default; here it does not (`eslint.ignoreDuringBuilds`
in `apps/web/next.config.ts`). Lint is its own Turborepo task, so `make build`
answers *"does it compile and bundle"* and `make lint` answers *"does it match
the style rules"* — one failing no longer masks the other. Type errors still
fail the build.

### What is green today

| Verb | State | Why |
|---|---|---|
| `make build` | ✅ green | |
| `make typecheck` | ✅ green | all three members, `noUncheckedIndexedAccess` on |
| `make test` | ✅ green | 3 suites / 41 tests |
| `make lint` | ❌ **red, and was red before this layout existed** | ~490 `semi` errors: `eslint.config.mjs` sets `semi: ["error", "never"]` and the codebase is being converted to that style file by file. Clearing it wholesale would rewrite 100+ files that the feature children of #1 are about to own, and Biome replaces ESLint in #3 anyway. |

`turbo run lint` still runs the `@kro/core` platform-free check as its own task,
so that gate is readable on its own: `pnpm --filter @kro/core lint`.

Note that `next lint` only sees `apps/web`. `packages/core` and `packages/app`
have no ESLint config of their own — repo-wide coverage arrives with Biome (#3).

## TypeScript

`tsconfig.base.json` is the only place the baseline is written down; every
member extends it and overrides nothing but `lib`, `jsx`, `types` and `paths`.

- `strict: true` **and** `noUncheckedIndexedAccess: true` — an indexed read is
  `T | undefined` until you prove otherwise.
- `moduleResolution: "Bundler"`, `module: "ESNext"`, `target: "ES2022"`.
- `isolatedModules: true` — every file must be transpilable on its own.

## Current state vs. target

This is the shape after the monorepo restructure. Two axes are deliberately
still on their pre-migration tools and are swapped by the next child issue:

| Axis | Today | Target |
|---|---|---|
| Lint / format | ESLint (`eslint-config-next`) in `apps/web` | Biome, repo-wide |
| Tests | Jest + ts-jest + Testing Library | Vitest + Testing Library, Playwright, Storybook |
| Git hooks | none | lefthook + commitlint |
| CI | none | `pr.yml` + `bankai.yml` |

Nothing above changes the verbs: `make lint` and `make test` keep working across
that swap, which is the point of routing through the Makefile.
