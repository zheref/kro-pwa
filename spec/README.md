# `/spec` — the single source of truth for Kro Web

What this repo is supposed to be, in the order a reader needs it: product intent first
(`00`–`02`), then technical design (`03`–`08`). Agents read these to decide what to build;
reviewers read them to decide whether what was built is right.

**This directory authors no process canon.** Architecture law lives in the generated, pinned
mirror under [`.claude/rules/`](../.claude/rules/) (`CON-13`) — `UZF-{n}` and `RC-1`…`RC-63`
from `bankai-core@v0.11.2`. `spec/architecture/` is the *contract*: how this repo realizes that
law. Where the two would conflict, the law wins and the contract records the divergence with a
reason.

**Nor does it author product canon.** Business rules, business decisions and UX defer to
`zheref/KroApple` at the latest tip of `main` — `docs/Features/*.md` is the language-agnostic
spec set (already shared canon with KroAndroid), and code is the tie-breaker. These files point
at that canon, restate only what web genuinely adds, and never fork it.

| File | Holds |
|---|---|
| [`00-product-brief.md`](./00-product-brief.md) | Vision, personas, jobs, success criteria, non-goals, and the binding product canon + pin |
| [`01-functional-requirements.md`](./01-functional-requirements.md) | What must work, by phase, traceable to the epic's children |
| [`02-non-functional.md`](./02-non-functional.md) | Performance budgets, accessibility, offline, privacy, browser support |
| [`03-architecture.md`](./03-architecture.md) | Where the architecture contract lives and what binds it |
| [`architecture/README.md`](./architecture/README.md) | Module & dependency graph, lane index, codegen sources — **`@`-imported by `CLAUDE.md`** |
| [`architecture/web.md`](./architecture/web.md) | The web lane: store flavor, layout, building blocks, one-shot effects, codegen, tests — **`@`-imported by `CLAUDE.md`** |
| [`04-data-model.md`](./04-data-model.md) | Domain entities, local persistence shape, sync/ownership boundary |
| [`05-api-contract.md`](./05-api-contract.md) | **Stub.** What fills it and when |
| [`06-design-tokens.md`](./06-design-tokens.md) | **Stub.** What fills it and when |
| [`07-ux-flows.md`](./07-ux-flows.md) | The flows web must reproduce, and the platform-mapping contract |
| [`08-acceptance.md`](./08-acceptance.md) | Acceptance criteria and the test plan that proves them |

## How to use this directory

- **Editing the architecture contract:** change `spec/architecture/*`. Never restate it inside
  `CLAUDE.md` — that file `@`-imports these, so a copy there would silently drift.
- **Editing the law:** you cannot, from here. `.claude/rules/` is generated; a hand-edit fails
  the `sync_canon` drift check. Change the handbook in `bankai-core` (a G4 change) and let
  `sync_canon` regenerate the mirror.
- **A gap or contradiction in the law** is a `bankai:handbook-question` issue on `bankai-core`,
  not a local workaround. Three are open for this stack today: `BC-IS-#900` (workspace
  topology), `BC-IS-#904` (`RC-26` vs `RC-3` on cancellation), `BC-IS-#905` (Storybook 8 vs
  Next 15.3).
- **Filling a stub:** replace the "what fills this and when" section with the real content and
  drop the stub marker. Do not leave a half-filled file claiming more than it holds.

Traceability: every child issue of the [parity epic](https://github.com/zheref/kro-pwa/issues/1)
cites the spec sections it implements; every PR cites its child (`Closes #N` / `Part of #N`).
