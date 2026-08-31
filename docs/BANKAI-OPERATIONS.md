# Bankai Operations — Kro for Web (`KC`)

This is the operating runbook for `zheref/kro-pwa` under the Bankai process: the human gates,
what it takes (and what is still missing) for the full machinery to run, and the reviewers who
gate every merge. Process canon lives in `zheref/bankai-core` (`CONSTITUTION.md`, `handbooks/`,
currently handbooks `v0.5`) — this document points at it and records this repo's state; it
authors no canon of its own (CON-13).

- **Product code:** `KC` — objects are referenced as `KC-IS-#N` / `KC-PR-#N`
  (registration: [BC-PR-#901](https://github.com/zheref/bankai-core/pull/901)).
- **Scenario:** `react-uzf-v1` (Stack Matrix Scenario 5 — Web Only). This repo is the **first**
  consumer of that stack handbook.
- **Programme:** epic [#1](https://github.com/zheref/kro-pwa/issues/1) (parity with KroApple +
  compliance), children #2–#35. Product/UX canon: `zheref/KroApple@main` — always the latest tip,
  re-fetched before each child build; the epic was authored against pin `2c1ee45`
  (`docs/Features/*.md`).

---

## The gates (the "G files")

Every stop for the human names its gate. Exactly these exist (CONSTITUTION.md; human map in
bankai-core `docs/HUMAN-GATES.md`):

| Gate | Clause | Fires when | Who acts, and how — in this repo |
|---|---|---|---|
| **G1 — epic approval** | CON-4 | An epic is drafted and parked | The maintainer picks the delivery mode. **Fired for epic #1 on 2026-08-30**: local delivery with shikai semantics — children deliver as PRs directly against `main`, each its own G2. Agents never apply a mode label. |
| **G1-M — release into build** | CON-25 | A routed child is ready to be worked | The maintainer releases work (here: by dispatching a local session for it). Agents route (`bankai:agent/*`) but never release, outside CON-25's four carve-outs. |
| **G2 — merge to `main`** | CON-5 | A delivery PR is fully green | **Only the maintainer merges.** No agent ever merges the default branch; branch protection should enforce it (see the missing-pieces list). |
| **G3 — release go/no-go** | CON-6 | A shippable build exists on `main` | The maintainer authorizes shipping (deploy to the chosen host). Releases follow REL-1..8. |
| **G4 — policy / spec / canon** | CON-7 | A PR touches bankai-core's `CONSTITUTION.md`, `handbooks/`, `agents/`, `schemas/` | The maintainer merges **in bankai-core**. This repo's registration (#901), the INDEX.md fix (#902) and the topology answer (BC-IS-#900) all sit at G4. |
| **G5 — human-only decision** | CON-47 | Anything only the human can do: secrets, App installs, rulesets, credentials, a fork in the road | The maintainer does the concrete thing. The current G5 queue is the "missing" column below. |
| **Critical page** | CON-8 | A `critical` security finding or production incident | Immediate maintainer response; overrides all cadence. |

**Readiness is not a vibe.** A PR may be called ready **only** when
`REPO=zheref/kro-pwa scripts/pr_ready_gate.sh --verdict <n>` (run from a bankai-core checkout)
exits `0` at the PR's current head (CON-32). Until the automated reviewers below are wired, that
gate cannot fully run here — see the interim bar at the end.

---

## What it takes to run everything — and what is missing

### Already in place ✅

| Piece | State |
|---|---|
| Bankai label taxonomy (40 `bankai:*` labels) | Synced 2026-08-30 via `sync-labels.sh` |
| Epic + 34 sequenced children with routing lanes and exclusive file lanes | #1–#35 filed |
| G1 mode decision recorded | `bankai:stage/ready-for-shikai` on #1 + gate comment |
| Product code `KC` + `pending_onboarding` registry entry | BC-PR-#901 — **awaiting G4 merge** |
| `react-uzf-v1` row in the handbook index | BC-PR-#902 — **awaiting G4 merge** |

### Deliverable by the epic's children (agents build, maintainer merges at G2)

| Piece | Child |
|---|---|
| pnpm + Turborepo monorepo (`apps/web`, `packages/core`, `packages/app`) | #2 |
| Biome, Vitest, lefthook + commitlint, guard hooks, `pr.yml` CI (CON-19 triggers) | #3 |
| `spec/` tree, `CLAUDE.md` canonical imports, `.claude/canon-values.yml`, generated `.claude/rules/` mirror, `.github/workflows/bankai.yml` (`sync_canon`, pinned to one bankai-core tag) | #4 |
| Everything else (state tier, design system, domain, features) | #5–#35 |

### Human-only (G5) — the queue that blocks "everything runs"

1. **G4 merges in bankai-core:** #901 (registration), #902 (index row); answer **BC-IS-#900**
   (does RC-49's four-member topology bind web-only repos? The epic assumes three members).
2. **GitHub Apps** installed on this repo: **Sasuke** and **Tenma** (the review pair) at minimum,
   plus **Bisky** — this repo ships UI, so the design gate genuinely applies.
3. **Secrets:** each App's `*_APP_ID` / `*_APP_PRIVATE_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`, and
   `COPILOT_REVIEW_PAT` — a **user-scoped** fine-grained PAT with *Pull requests: write*
   (a bot-token Copilot review request silently no-ops, CON-16).
4. **Branch protection (rulesets, not classic):** on `main` require `sasuke / review`,
   `tenma / review`, `bisky / review` plus the repo's own build/lint checks and your review; no
   agent is a bypass actor; block force-push and deletion. (Integration-branch rulesets are only
   needed if a future epic uses bankai mode — the current epic is per-PR to `main`.)
5. **Required checks registered** once `bankai.yml` (#4) and `pr.yml` (#3) exist and have run once.
6. **Runner decision:** headless web stack — **no snapshot-runner requirement** (Storybook + its
   test-runner carries UZF-26). GitHub-hosted is acceptable; a boot-persistent self-hosted runner
   is optional (bankai-core `docs/SETUP-SELF-HOSTED-RUNNERS.md`).
7. **Deploy target:** Vercel (locked-stack default) vs Google Cloud Run (this repo's README has a
   working setup). G3 releases need this settled.
8. **The registry flip:** when #4's `bankai.yml` merges, move the `pending_onboarding` entry into
   `consumers[]` in bankai-core with strictly factual `pinned`/`consumes` (CON-14) — from that
   moment every bankai-core release owes this repo a repin PR or a reasoned N/A (CON-22).

**Deliberately absent:** a `db-migrate.yml` caller. The Kro Cloud (Supabase) schema is owned by
`zheref/KroApple`; this repo is a client and never authors migrations.

---

## The reviewers — who gates a merge, and on what

Merging is the maintainer's act (G2), but these reviewers decide whether a PR may even be
*called* ready. Each posts a round against the PR's current head; a round on a superseded commit
is stale and owed again.

| Reviewer | Gate | What it judges | Canon it cites |
|---|---|---|---|
| **Sasuke** (App: `sasuke / review`) | Correctness & architecture | UZF conformance: slices/Selectors/Shifters/Producers, store discipline, forbidden patterns, test minimums | `UZF-{n}` + this repo's stack rules `RC-1..63` (`handbooks/stacks/react-uzf-v1/`) |
| **Tenma** (App: `tenma / review`) | Security | Secrets, authz at the data layer (RLS — `SEC-6`), typed boundary parsing (`SEC-7`), token/PII hygiene (`SEC-5`), CI supply chain (`SEC-14`) | `SEC-{n}` + CWE/OWASP. A `critical` finding **pages the maintainer** (CON-8) |
| **Bisky** (App: `bisky / review`) | Design & UX quality | Accessibility, touch/pointer target sizes, tokens, contrast, motion (incl. reduced-motion), platform conventions | `UX-{n}` (+ WCAG) — required here because this repo ships UI |
| **Copilot** | Bounded extra round | General code review; requested per-PR via the user PAT; a stalled pending request (>30 min) fails readiness | CON-16 (`bounded`: owed only while a request is pending) |
| **The maintainer** | **G2** | Everything above plus product judgment | The only actor who merges |

### What "fully green" means (CON-32, jointly)

- **(a)** every required check passing;
- **(b)** every configured reviewer has posted a round **against the current head SHA**;
- **(c)** every round **addressed** per CON-16 — reply **and** resolve, or on-record pushback;
- **(d)** zero unresolved review threads;
- **(e)** every channel-less finding dispositioned (the unit is the finding, not the thread).

No actor — local or CI — may report, label, or hand off a PR as ready until (a)–(e) all hold, and
the only readiness claim that counts is the exit status of `scripts/pr_ready_gate.sh --verdict`
at the current head. Every human-merged PR additionally carries CON-17's two sections:
`# What this changes for you` (effect before mechanism, costs stated) and `## How to verify`
(numbered steps with exact expected results) — a PR missing either is not merge-ready.

### Interim bar (until the Apps and checks above are wired)

Automated rounds cannot post yet, so a PR here is held to: local `lint`/`typecheck`/`test`/`build`
green, the CON-17 body sections present, the child issue's acceptance criteria demonstrably met,
and the maintainer's own review. Every PR must still be honest about this state — "ready" in the
full CON-32 sense begins the day the review pair is live, which is exactly why the G5 queue above
matters.
