# 03 — Architecture

The architecture is not described here. It lives in two places, and this file's only job is to
say which is which so nobody edits the wrong one.

## The law — `.claude/rules/` (generated, pinned, never hand-edited)

`CON-13`: a product repo authors no process canon of its own; it carries a **generated, pinned
mirror** of `bankai-core`'s handbooks.

| Path | Source | Drift-checked in CI |
|---|---|---|
| [`.claude/rules/00-uzf-core.md`](../.claude/rules/00-uzf-core.md) | `bankai-core@v0.11.2` `handbooks/uzf-core.md` — the universal `UZF-{n}` law | no (shared file, outside the wired job) |
| [`.claude/rules/00-stack-matrix.md`](../.claude/rules/00-stack-matrix.md) | `bankai-core@v0.11.2` `handbooks/stack-matrix.md` | no (same) |
| [`.claude/rules/react-uzf-v1/`](../.claude/rules/react-uzf-v1/) | `bankai-core@v0.11.2` `handbooks/stacks/react-uzf-v1/rules/` — `RC-1`…`RC-63`, substituted from [`.claude/canon-values.yml`](../.claude/canon-values.yml) | **yes** — `sync_canon` |

Claude Code auto-loads `.claude/rules/` natively, so these need no `@`-import.

**To change the law:** change the handbook in `bankai-core` (a **G4** change, merged by the
maintainer there) and let `sync_canon` regenerate this mirror. A hand-edit here fails the drift
check with `hand_edited`, by design. **A gap or contradiction in the law** is a
`bankai:handbook-question` issue on `bankai-core`, never a local workaround.

## The contract — `spec/architecture/` (hand-authored, `@`-imported)

How *this* repo realizes that law. Hand-authored, so Claude Code will not load it unless the
root `CLAUDE.md` `@`-imports it — which it does, and which `bankai-scf doctor` exists to verify.

- [`architecture/README.md`](./architecture/README.md) — module & dependency graph, lane index,
  codegen sources, the product-canon vs. process-canon split.
- [`architecture/web.md`](./architecture/web.md) — the web lane, answering the six lane
  questions: store flavor & event names · module layout · building-block realization · one-shot
  UI effects · codegen inputs · tests & minimums. It also carries § 7, the list of deliberate
  Scenario-5 divergences from canon, each with a reason and (where it is a canon gap) an open
  handbook question.

## Module map

```
apps/web        @kro/web    Next.js 15 App Router — the one render target
packages/app    @kro/app    shared UZF state + feature tier
packages/core   @kro/core   platform-free domain tier
```

One direction only: `apps/web` → `@kro/app` → `@kro/core`. Enforced by
`scripts/check-platform-free.mjs` and `packages/app/scripts/check-uzf-boundaries.mjs`, both
wired as `lint` tasks, so `make lint` — and therefore `pr.yml` — fails on a breach.

## Error-handling strategy

One shape, end to end:

1. A **Service** wraps one external system, returns the **wire** type, and may throw.
2. A **Producer** catches everything, runs the failure through the **Mapper**'s `toException`,
   and resolves `Result<T, <X>Exception>` — it **never throws** (`RC-7`).
3. The slice's `.fulfilled` arm branches on `result.ok` into the same Shifters; `.rejected` is a
   defensive fallback only, and returns early on `action.meta.aborted` — cancellation is the one
   silent exit (`UZF-14`).
4. `State` carries the typed `…Exception`, never a raw `string` or `Error` (`RC-8`). Its
   `recoverable` flag drives whether the surface offers a retry.
5. User-facing copy is derived from the exception's `kind` in the domain tier, never assembled
   in a view.

## Scenario

`react-uzf-v1` · Stack Matrix Scenario 5 (Web Only) · product code **`KC`** · process canon
pinned to `bankai-core@v0.11.2`. See [`../docs/BANKAI-OPERATIONS.md`](../docs/BANKAI-OPERATIONS.md)
for the gates, the reviewers and what is still missing.
