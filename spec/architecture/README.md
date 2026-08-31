# Architecture — Kro Web

> **This directory is the per-repo UZF *contract*, not the law.** The law is the generated,
> pinned canon mirror under [`.claude/rules/`](../../.claude/rules/) — `UZF-{n}` in
> [`00-uzf-core.md`](../../.claude/rules/00-uzf-core.md) and `RC-1`…`RC-63` in
> [`react-uzf-v1/`](../../.claude/rules/react-uzf-v1/), both generated from
> `bankai-core@v0.11.2` and never hand-edited (`CON-13`). Claude Code auto-loads that mirror
> natively; these two files are `@`-imported by the root `CLAUDE.md` because they are
> hand-authored and would otherwise never load.
>
> The contract links back to the law. It never restates it, and it never contradicts it — where
> this repo genuinely departs from canon, the departure is named, reasoned, and (where it is a
> canon gap) carries an open `bankai:handbook-question` issue.

## Scenario

`react-uzf-v1` · Stack Matrix **Scenario 5 — Web Only** 🌐 · product code **`KC`**.
kro-pwa is the first consumer of this stack handbook, so it is also the repo that first binds
the stack's `{{TOKEN}}` schema (see [`.claude/canon-values.yml`](../../.claude/canon-values.yml)).

## Module & dependency graph

```
apps/
  web/          @kro/web    Next.js 15 App Router — the render target and the only shell
packages/
  app/          @kro/app    shared UZF state + feature tier (store, services, slices)
  core/         @kro/core   platform-free domain tier (Result/Exception, models, mappers)
```

Dependencies point one way — `apps/web` → `@kro/app` → `@kro/core` — and cross-package imports
use the `workspace:*` protocol only (`RC-49`). Nothing in the domain or state tier imports the
shell; `@kro/core` imports no react, next, DOM or Node at all. Both directions are enforced by
scripts wired as `lint` tasks, not by review alone — see [`web.md` § 2](./web.md#2-module--file-layout).

**Three members, not the canon's four.** `RC-49` fixes a four-member topology including
`apps/mobile`; Scenario 5 has no native target. Open handbook question:
[BC-IS-#900](https://github.com/zheref/bankai-core/issues/900). Until it is ruled this repo
assumes three, and `{{MOBILE_APP}}` binds to a literal that says the member is absent.

## Lanes

A *lane* is one language/runtime domain in this solution. Each lane file answers the same six
questions — store flavor & event names · module layout · building-block realization ·
one-shot UI effects · codegen inputs · tests & minimums — so lanes diff at a glance.

- [`web.md`](./web.md) — the Next.js 15 App Router lane. **The whole solution is this one lane.**

If a second lane ever exists (a native target, a separate service), it gets its own file here
answering the same six questions, and the root `CLAUDE.md` import block grows by one line.

## Codegen — single source, never hand-duplicated

Exactly one generated tree exists in this repo:

- **`.claude/rules/`** — the canon mirror. Source: `bankai-core@v0.11.2` handbooks +
  `.claude/canon-values.yml`. Generator: `bankai-core/scripts/sync_canon.py`. Kept fresh and
  drift-checked by the `sync_canon` job in `.github/workflows/bankai.yml`.

`make codegen` and `make tokens` are documented no-ops. An API-contract generator (TypeSpec)
and a token generator (Style Dictionary) appear in the Scenario 5 template but are **not** wired
here; `spec/05-api-contract.md` and `spec/06-design-tokens.md` state what would fill them and
when. Nothing else in the tree may be described as generated.

## Product canon vs. process canon

Two different sources of truth, deliberately kept apart:

| | Source | Binds |
|---|---|---|
| **Product** — business rules, business decisions, UX | `zheref/KroApple@main`, `docs/Features/*.md` (code is the tie-breaker) | what Kro Web must *do* |
| **Process** — architecture, review, gates | `zheref/bankai-core` — mirrored into `.claude/rules/` at a pinned tag | how it must be *built* |

Every child build re-fetches KroApple's `origin/main` before it starts and names any divergence
from the epic's pin in its PR. See [`../00-product-brief.md`](../00-product-brief.md).

## Cross-lane specifics

- **Shared context / cross-feature state:** none today. When it appears it composes through
  root-level Selectors, never by one slice importing another slice's shape (`RC-20`).
- **Composition root:** `apps/web` builds the store once per browser session and hands the
  instance to `StoreProvider`; `makeStore(...)` is called in exactly one file (`RC-41`).
- **Platform services** (notifications, sounds, wake lock, storage, calendar) are Services
  behind `ThunkExtra`, each with a `stubbed…` twin — never imported directly by a component
  (`RC-6`, `RC-33`).
